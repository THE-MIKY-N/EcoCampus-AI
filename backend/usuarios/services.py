
import unicodedata

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone

from .models import (
    DeteccionResiduo,
    PerfilEstudiante,
    PuntoReciclaje,
    RegistroReciclaje,
    Notificacion,
    Insignia,
    InsigniaObtenida,
    RetoEcologico,
    ParticipacionReto,
    ParticipacionRetoGrupal,
)


PUNTOS_POR_RESIDUO = {
    "plastico": 5,
    "lata": 20,
    "papel": 10,
    "carton": 10,
    "vidrio": 30,
    "natural": 5,
    "organico": 5,
}


def normalizar_texto(texto):
    texto = unicodedata.normalize("NFKD", texto.lower())
    return "".join(
        caracter
        for caracter in texto
        if not unicodedata.combining(caracter)
    )


def obtener_puntos(nombre_residuo):
    nombre = normalizar_texto(nombre_residuo)

    if "plastico" in nombre:
        return PUNTOS_POR_RESIDUO["plastico"]

    if "lata" in nombre:
        return PUNTOS_POR_RESIDUO["lata"]

    if "papel" in nombre:
        return PUNTOS_POR_RESIDUO["papel"]

    if "carton" in nombre:
        return PUNTOS_POR_RESIDUO["carton"]

    if "vidrio" in nombre:
        return PUNTOS_POR_RESIDUO["vidrio"]

    if "organico" in nombre:
        return PUNTOS_POR_RESIDUO["organico"]

    if "natural" in nombre:
        return PUNTOS_POR_RESIDUO["natural"]

    raise ValidationError(
        f"No hay una puntuación definida para: {nombre_residuo}"
    )




@transaction.atomic
def actualizar_retos_estudiante(registro):
    estudiante = registro.estudiante
    ahora = timezone.now()

    retos = RetoEcologico.objects.select_for_update().filter(
        activo=True,
        fecha_inicio__lte=ahora,
        fecha_fin__gte=ahora,
    ).select_related(
        "carrera",
        "facultad",
        "tipo_residuo",
    )

    for reto in retos:

        # Evitar procesar materiales que no corresponden al reto.
        if reto.tipo_objetivo == RetoEcologico.TipoObjetivo.MATERIAL:
            if registro.tipo_residuo_id != reto.tipo_residuo_id:
                continue

        # -----------------------------------------
        # RETOS INDIVIDUALES
        # -----------------------------------------
        if reto.modalidad == RetoEcologico.Modalidad.INDIVIDUAL:

            participacion, _ = ParticipacionReto.objects.get_or_create(
                reto=reto,
                estudiante=estudiante,
            )

            registros = RegistroReciclaje.objects.filter(
                estudiante=estudiante,
                fecha_registro__gte=reto.fecha_inicio,
                fecha_registro__lte=reto.fecha_fin,
            )

            if reto.tipo_objetivo == RetoEcologico.TipoObjetivo.RECICLAJES:
                valor_actual = registros.count()

            elif reto.tipo_objetivo == RetoEcologico.TipoObjetivo.PUNTOS:
                valor_actual = registros.aggregate(
                    total=Sum("puntos_otorgados")
                )["total"] or 0

            else:
                valor_actual = registros.filter(
                    tipo_residuo=reto.tipo_residuo
                ).aggregate(
                    total=Sum("cantidad")
                )["total"] or 0

            participacion.progreso = min(
                int((valor_actual / reto.meta) * 100),
                100,
            )

            if valor_actual >= reto.meta and not participacion.fecha_completado:
                participacion.fecha_completado = ahora

                if reto.recompensa_puntos > 0:
                    perfil = PerfilEstudiante.objects.select_for_update().get(
                        usuario=estudiante
                    )
                    perfil.puntos_recompensas += reto.recompensa_puntos
                    perfil.save(update_fields=["puntos_recompensas"])

                Notificacion.objects.create(
                    usuario=estudiante,
                    titulo="¡Reto completado!",
                    mensaje=(
                        f"Has completado el reto '{reto.titulo}' "
                        f"y recibido {reto.recompensa_puntos} puntos."
                    ),
                    tipo="SUCCESS",
                )

            participacion.save(
                update_fields=["progreso", "fecha_completado"]
            )



@transaction.atomic
def validar_reciclaje(deteccion_id, punto_reciclaje_id):
    deteccion = (
        DeteccionResiduo.objects
        .select_for_update()
        .select_related("estudiante", "tipo_residuo")
        .get(pk=deteccion_id)
    )

    if deteccion.estado_validacion != (
        DeteccionResiduo.EstadoValidacion.PENDIENTE
    ):
        raise ValidationError(
            "Solo se pueden validar detecciones pendientes."
        )

    # Evitar asignar puntos dos veces.
    if RegistroReciclaje.objects.filter(
        deteccion=deteccion
    ).exists():
        raise ValidationError(
            "Esta detección ya tiene un registro asociado. "
            "Debe revisarse antes de asignar puntos."
        )

    punto = PuntoReciclaje.objects.get(
        pk=punto_reciclaje_id,
        activo=True,
    )

    puntos = obtener_puntos(deteccion.tipo_residuo.nombre)

    perfil = (
        PerfilEstudiante.objects
        .select_for_update()
        .get(usuario=deteccion.estudiante)
    )

    registro = RegistroReciclaje.objects.create(
        estudiante=deteccion.estudiante,
        punto_reciclaje=punto,
        tipo_residuo=deteccion.tipo_residuo,
        deteccion=deteccion,
        cantidad=1,
        puntos_otorgados=puntos,
    )

    deteccion.estado_validacion = (
        DeteccionResiduo.EstadoValidacion.VALIDADA
    )
    deteccion.save(update_fields=["estado_validacion"])

    perfil.puntos_recompensas += reto.recompensa_puntos
    perfil.save(update_fields=["puntos_recompensas"])

    # Actualizar automáticamente los retos del estudiante.
    actualizar_retos_estudiante(registro)

    # Asignar automáticamente las insignias que el estudiante haya desbloqueado.
    insignias_disponibles = Insignia.objects.filter(
        activo=True,
        puntos_requeridos__lte=perfil.puntos,
    )

    for insignia in insignias_disponibles:
        insignia_obtenida, creada = InsigniaObtenida.objects.get_or_create(
            estudiante=perfil,
            insignia=insignia,
        )

        if creada:
            Notificacion.objects.create(
                usuario=deteccion.estudiante,
                titulo="¡Nueva insignia desbloqueada!",
                mensaje=(
                    f"Has obtenido la insignia '{insignia.nombre}'. "
                    f"¡Sigue reciclando en EcoCampus AI!"
                ),
                tipo="SUCCESS",
            )

    # Notificar al estudiante después de validar el reciclaje.
    Notificacion.objects.create(
        usuario=deteccion.estudiante,
        titulo="¡Reciclaje validado!",
        mensaje=(
            f"Tu reciclaje de {deteccion.tipo_residuo.nombre} "
            f"ha sido validado. Has recibido {puntos} puntos "
            f"en EcoCampus AI."
        ),
        tipo="SUCCESS",
    )

    return registro


@transaction.atomic
def rechazar_deteccion(deteccion_id):
    deteccion = (
        DeteccionResiduo.objects
        .select_for_update()
        .get(pk=deteccion_id)
    )

    if deteccion.estado_validacion != (
        DeteccionResiduo.EstadoValidacion.PENDIENTE
    ):
        raise ValidationError(
            "Solo se pueden rechazar detecciones pendientes."
        )

    if RegistroReciclaje.objects.filter(
        deteccion=deteccion
    ).exists():
        raise ValidationError(
            "Esta detección ya tiene un registro asociado. "
            "Debe revisarse antes de rechazarla."
        )

    deteccion.estado_validacion = (
        DeteccionResiduo.EstadoValidacion.RECHAZADA
    )
    deteccion.save(update_fields=["estado_validacion"])

    return deteccion
