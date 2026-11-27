
import threading
import time
import uuid
from types import SimpleNamespace

from ultralytics.trackers.bot_sort import BOTSORT

from .ia_service import modelo


# Sesiones temporales de las estaciones.
_sesiones = {}

_lock_sesiones = threading.Lock()
_lock_modelo = threading.Lock()

TIEMPO_EXPIRACION = 120

ALTURA_LINEA = 0.80
ANCHO_LINEA = 0.60

TIEMPO_CONFIRMACION = 4.0
TIEMPO_OBJETO_SIN_DEPOSITAR = 15.0
TIEMPO_CAMARA_VACIA = 7.0

MARGEN_RETORNO = 12


def _crear_tracker():
    args = SimpleNamespace(
        track_high_thresh=0.25,
        track_low_thresh=0.10,
        new_track_thresh=0.30,
        track_buffer=30,
        match_thresh=0.80,
        fuse_score=True,
        gmc_method="none",
        proximity_thresh=0.5,
        appearance_thresh=0.8,
        with_reid=False,
        model="auto",
        device="cpu",
    )

    return BOTSORT(args)


def crear_sesion(estudiante_id, punto_reciclaje_id):
    ahora = time.monotonic()

    with _lock_sesiones:
        expiradas = [
            sid for sid, sesion in _sesiones.items()
            if ahora - sesion["ultima_actividad"] > TIEMPO_EXPIRACION
        ]

        for sid in expiradas:
            del _sesiones[sid]

        session_id = str(uuid.uuid4())

        _sesiones[session_id] = {
            "estudiante_id": estudiante_id,
            "punto_reciclaje_id": punto_reciclaje_id,
            "tracker": _crear_tracker(),
            "lock": threading.Lock(),
            "ultima_actividad": ahora,
            "objetos": {},
            "inicio_camara_vacia": None,
            "actividad_iniciada": False,
            "finalizada": False,
        }

    return session_id



def _procesar_linea(sesion, track, ancho, alto, ahora):
    track_id = int(track[4])

    x1, y1, x2, y2 = [
        float(valor) for valor in track[:4]
    ]

    centro_x = (x1 + x2) / 2
    centro_y = (y1 + y2) / 2

    limite_izquierdo = ancho * ((1 - ANCHO_LINEA) / 2)
    limite_derecho = ancho * ((1 + ANCHO_LINEA) / 2)

    posicion_linea = alto * ALTURA_LINEA

    dentro_zona = (
        limite_izquierdo <= centro_x <= limite_derecho
    )

    objetos = sesion["objetos"]

    if track_id not in objetos:
        objetos[track_id] = {
            "primera_vez_visto": ahora,
            "ultima_y": centro_y,
            "ultima_vez_visto": ahora,
            "inicio_cruce": None,
            "estado": "DETECTADO",
            "clase_id": int(track[6]),
            "confianza": float(track[5]),
            "coordenadas": [
                float(valor) for valor in track[:4]
            ],
        }

    objeto = objetos[track_id]

    # Actualizar información del seguimiento.
    objeto["ultima_vez_visto"] = ahora
    objeto["confianza"] = float(track[5])
    objeto["coordenadas"] = [
        float(valor) for valor in track[:4]
    ]
    # Los objetos abandonados no vuelven a procesarse.
    if objeto["estado"] in (
            "CONFIRMADO",
            "REGISTRADO",
            "ABANDONADO",
    ):
        objeto["ultima_y"] = centro_y
        return objeto["estado"]



    # Si el residuo reaparece por encima de la línea,
    # significa que regresó y se cancela el intento.
    if (
        objeto["estado"] == "ESPERANDO_CONFIRMACION"
        and centro_y < posicion_linea - MARGEN_RETORNO
    ):
        objeto["estado"] = "CANCELADO"
        objeto["inicio_cruce"] = None
        objeto["ultima_y"] = centro_y

        print(
            f"[LINEA] ID {track_id}: "
            "regresó. Depósito cancelado."
        )

        return "CANCELADO"

    # Detectar cruce de arriba hacia abajo.
    cruzo_linea = (
        objeto["ultima_y"] < posicion_linea
        and centro_y >= posicion_linea
        and dentro_zona
    )

    if (
        cruzo_linea
        and objeto["estado"] in ("DETECTADO", "CANCELADO")
    ):
        objeto["estado"] = "ESPERANDO_CONFIRMACION"
        objeto["inicio_cruce"] = ahora

        print(
            f"[LINEA] ID {track_id}: "
            "cruce válido. Esperando desaparición."
        )
        # Si permanece visible sin cruzar la línea durante 15 segundos,
        # se considera una operación abandonada.
        if (
                objeto["estado"] == "DETECTADO"
                and ahora - objeto["primera_vez_visto"]
                >= TIEMPO_OBJETO_SIN_DEPOSITAR
        ):
            objeto["estado"] = "ABANDONADO"

            print(
                f"[SESIÓN] ID {track_id}: "
                "objeto abandonado durante 15 segundos."
            )

            return "ABANDONADO"

    objeto["ultima_y"] = centro_y

    return objeto["estado"]

def _comprobar_objetos_desaparecidos(
    sesion,
    ids_vistos,
    ahora,
):
    confirmados = []

    for track_id, objeto in sesion["objetos"].items():

        # Si ya está confirmado, reenviar hasta recibir
        # el acuse de recibo de Django.
        if objeto["estado"] == "CONFIRMADO":
            confirmados.append({
                "track_id": track_id,
                "clase_id": objeto["clase_id"],
                "confianza": objeto["confianza"],
                "coordenadas": objeto["coordenadas"],
                "estado_deposito": "CONFIRMADO",
                "deposito_confirmado": True,
            })
            continue

        # Cancelar objetos que nunca cruzaron la línea
        # y llevan 15 segundos sin completar el depósito.
        if objeto["estado"] == "DETECTADO":
            if (
                    ahora - objeto["primera_vez_visto"]
                    >= TIEMPO_OBJETO_SIN_DEPOSITAR
            ):
                objeto["estado"] = "ABANDONADO"

                print(
                    f"[SESIÓN] ID {track_id}: "
                    "objeto abandonado. No realizó el depósito."
                )

            continue

        if objeto["estado"] != "ESPERANDO_CONFIRMACION":
            continue

        if track_id in ids_vistos:
            continue

        tiempo_ausente = (
            ahora - objeto["ultima_vez_visto"]
        )

        if tiempo_ausente >= TIEMPO_CONFIRMACION:

            objeto["estado"] = "CONFIRMADO"

            print(
                f"[LINEA] ID {track_id}: "
                f"ausente durante {tiempo_ausente:.2f}s. "
                "DEPÓSITO CONFIRMADO. "
                "Esperando registro en la base de datos."
            )

            confirmados.append({
                "track_id": track_id,
                "clase_id": objeto["clase_id"],
                "confianza": objeto["confianza"],
                "coordenadas": objeto["coordenadas"],
                "estado_deposito": "CONFIRMADO",
                "deposito_confirmado": True,
            })

    return confirmados

def _comprobar_fin_sesion(sesion, ids_vistos, ahora):
    if sesion["finalizada"]:
        return True

    objetos = sesion["objetos"]

    estados_activos = (
        "DETECTADO",
        "ESPERANDO_CONFIRMACION",
        "CONFIRMADO",
    )

    hay_objetos_activos = any(
        objeto["estado"] in estados_activos
        for objeto in objetos.values()
    )

    # No finalizar si todavía hay objetos en proceso
    # o depósitos pendientes de guardar.
    if hay_objetos_activos:
        sesion["inicio_camara_vacia"] = None
        return False

    # Si hubo un objeto abandonado y ya no quedan
    # otras operaciones activas, finalizar la sesión.
    hay_abandonados = any(
        objeto["estado"] == "ABANDONADO"
        for objeto in objetos.values()
    )

    if hay_abandonados:
        sesion["finalizada"] = True

        print(
            "[SESIÓN] Finalizada por objeto abandonado."
        )

        return True

    # No iniciar el contador de cámara vacía antes
    # de que el estudiante haya mostrado algún residuo.
    if not sesion["actividad_iniciada"]:
        return False

    # Los objetos terminales todavía visibles impiden
    # considerar que la cámara está vacía.
    if ids_vistos:
        sesion["inicio_camara_vacia"] = None
        return False

    if sesion["inicio_camara_vacia"] is None:
        sesion["inicio_camara_vacia"] = ahora
        return False

    tiempo_vacia = (
        ahora - sesion["inicio_camara_vacia"]
    )

    if tiempo_vacia >= TIEMPO_CAMARA_VACIA:
        sesion["finalizada"] = True

        print(
            f"[SESIÓN] Cámara vacía durante "
            f"{tiempo_vacia:.2f}s. "
            "Sesión finalizada."
        )

        return True

    return False

def procesar_frame(session_id, imagen):
    with _lock_sesiones:
        sesion = _sesiones.get(session_id)

    if sesion is None:
        raise ValueError(
            "La sesión de seguimiento no existe o expiró."
        )

    with sesion["lock"]:
        ahora = time.monotonic()
        sesion["ultima_actividad"] = ahora

        alto, ancho = imagen.shape[:2]

        # Una sola inferencia YOLO por fotograma.
        inicio_yolo = time.perf_counter()

        with _lock_modelo:
            resultado = modelo.predict(
                source=imagen,
                conf=0.25,
                verbose=False,
                imgsz=320,
                device="cpu",
                max_det=10,
            )[0]

        print(
            f"[RENDIMIENTO] Inferencia YOLO: "
            f"{(time.perf_counter() - inicio_yolo) * 1000:.2f} ms"
        )

        cajas = resultado.boxes.cpu().numpy()

        inicio_tracker = time.perf_counter()

        tracks = sesion["tracker"].update(
            cajas,
            img=imagen,
        )

        print(
            f"[RENDIMIENTO] BoT-SORT: "
            f"{(time.perf_counter() - inicio_tracker) * 1000:.2f} ms"
        )

        print(
            f"[DIAGNOSTICO] YOLO: {len(cajas)} detecciones | "
            f"BoT-SORT: {len(tracks) if tracks is not None else 0} tracks"
        )


        detecciones = []
        ids_vistos = set()

        if tracks is not None:
            for track in tracks:
                track_id = int(track[4])
                clase_id = int(track[6])

                ids_vistos.add(track_id)

                estado_deposito = _procesar_linea(
                    sesion,
                    track,
                    ancho,
                    alto,
                    ahora,
                )

                detecciones.append({
                    "track_id": track_id,
                    "clase": modelo.names[clase_id],
                    "confianza": round(
                        float(track[5]) * 100, 2
                    ),
                    "coordenadas": [
                        float(valor) for valor in track[:4]
                    ],
                    "estado_deposito": estado_deposito,
                    "deposito_confirmado": False,
                })

        # Revisar también los objetos que ya no aparecen
        # en los resultados de BoT-SORT.
        confirmados = _comprobar_objetos_desaparecidos(
            sesion,
            ids_vistos,
            ahora,
        )

        # Informar al frontend de los depósitos confirmados,
        # incluso cuando el objeto ya desapareció de la cámara.
        for objeto in confirmados:
            clase_id = objeto.pop("clase_id")

            detecciones.append({
                **objeto,
                "clase": modelo.names[clase_id],
            })

        _comprobar_fin_sesion(
            sesion,
            ids_vistos,
            ahora,
        )

        return detecciones



def cerrar_sesion(session_id):
    with _lock_sesiones:
        return _sesiones.pop(session_id, None) is not None

def obtener_datos_sesion(session_id):
    with _lock_sesiones:
        sesion = _sesiones.get(session_id)

        if sesion is None:
            return None

        return {
            "estudiante_id": sesion["estudiante_id"],
            "punto_reciclaje_id": sesion["punto_reciclaje_id"],
        }

def confirmar_deposito_registrado(session_id, track_id):
    with _lock_sesiones:
        sesion = _sesiones.get(session_id)

    if sesion is None:
        return False

    with sesion["lock"]:
        if sesion["finalizada"]:
            raise ValueError(
                "La sesión de reciclaje ha finalizado."
            )

        ahora = time.monotonic()
        sesion["ultima_actividad"] = ahora

        objeto = sesion["objetos"].get(int(track_id))

        if objeto is None:
            return False

        if objeto["estado"] != "CONFIRMADO":
            return False

        objeto["estado"] = "REGISTRADO"

        print(
            f"[REGISTRO] ID {track_id}: "
            "depósito guardado correctamente. "
            "Reintentos detenidos."
        )

        return True


def obtener_estado_sesion(session_id):
    with _lock_sesiones:
        sesion = _sesiones.get(session_id)

    if sesion is None:
        return True

    with sesion["lock"]:
        return sesion["finalizada"]