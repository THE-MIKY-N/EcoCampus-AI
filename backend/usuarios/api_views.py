import json
import base64
import cv2
import numpy as np


from django.db.models.deletion import ProtectedError
from rest_framework.decorators import api_view, permission_classes
from rest_framework import generics
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import datetime, time, timedelta
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)
from reportlab.lib.styles import getSampleStyleSheet
from openpyxl import Workbook
from rest_framework.permissions import IsAuthenticated,IsAdminUser
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics, status
from django.db import transaction
from .ia_service import detectar_residuos
from rest_framework.permissions import AllowAny

from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)


from io import BytesIO
from html import escape

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect


from .models import (
    PerfilEstudiante,
    Facultad,
    Carrera,
    TipoResiduo,
    PuntoReciclaje,
    DeteccionResiduo,
    RegistroReciclaje,
    NivelReciclaje,
    Insignia,
    RetoEcologico,
    ParticipacionReto,
    Recompensa,
    CanjeRecompensa,
    ConfiguracionSistema,
    Notificacion,
    InsigniaObtenida,
    ParticipacionRetoGrupal,
    ProgresoRetoGrupal,
)


from .serializers import (
    PerfilEstudianteSerializer,
    TipoResiduoSerializer,
    PuntoReciclajeSerializer,
    DeteccionResiduoSerializer,
    RegistroReciclajeSerializer,
    RankingEstudianteSerializer,
    NivelReciclajeSerializer,
    InsigniaSerializer,
    AdminRecompensaSerializer,
    AdminCanjeRecompensaSerializer,
    AdminInsigniaSerializer,
    AdminRetoSerializer,
)


@ensure_csrf_cookie
def obtener_csrf(request):
    return JsonResponse({"detail": "CSRF disponible"})


@csrf_protect
def iniciar_sesion_api(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "Método no permitido."},
            status=405,
        )

    try:
        datos = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"error": "La solicitud no contiene JSON válido."},
            status=400,
        )

    email = datos.get("email", "").strip().lower()
    password = datos.get("password", "")

    if not email or not password:
        return JsonResponse(
            {"error": "Ingresa tu correo y contraseña."},
            status=400,
        )

    from django.contrib.auth import get_user_model

    User = get_user_model()

    usuario = User.objects.filter(email__iexact=email).first()

    if usuario is None:
        return JsonResponse(
            {"error": "Correo o contraseña incorrectos."},
            status=401,
        )

    usuario_autenticado = authenticate(
        request,
        username=usuario.get_username(),
        password=password,
    )

    if usuario_autenticado is None:
        return JsonResponse(
            {"error": "Correo o contraseña incorrectos."},
            status=401,
        )

    if not usuario_autenticado.is_active:
        return JsonResponse(
            {"error": "Esta cuenta está desactivada."},
            status=403,
        )

    login(request, usuario_autenticado)

    rol = (
        "admin"
        if usuario_autenticado.is_staff
        or usuario_autenticado.is_superuser
        else "student"
    )

    return JsonResponse({
        "autenticado": True,
        "rol": rol,
        "usuario": {
            "id": usuario_autenticado.pk,
            "username": usuario_autenticado.get_username(),
            "email": usuario_autenticado.email,
        },
    })


@csrf_protect
def cerrar_sesion_api(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "Método no permitido."},
            status=405,
        )

    logout(request)

    return JsonResponse({"detail": "Sesión cerrada correctamente."})

class MiPerfilAPIView(generics.RetrieveAPIView):
    serializer_class = PerfilEstudianteSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return get_object_or_404(
            PerfilEstudiante.objects.select_related("usuario"),
            usuario=self.request.user,
        )


class TiposResiduoAPIView(generics.ListAPIView):
    serializer_class = TipoResiduoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TipoResiduo.objects.filter(activo=True).order_by("nombre")


class PuntosReciclajeAPIView(generics.ListAPIView):
    serializer_class = PuntoReciclajeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PuntoReciclaje.objects.filter(activo=True).order_by("nombre")



class PuntosReciclajeEstacionAPIView(generics.ListAPIView):
    serializer_class = PuntoReciclajeSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return PuntoReciclaje.objects.filter(
            activo=True
        ).order_by("nombre")

class MisDeteccionesAPIView(generics.ListAPIView):
    serializer_class = DeteccionResiduoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            DeteccionResiduo.objects
            .filter(estudiante=self.request.user)
            .select_related("tipo_residuo")
            .order_by("-fecha_deteccion")
        )


class MiHistorialAPIView(generics.ListAPIView):
    serializer_class = RegistroReciclajeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            RegistroReciclaje.objects
            .filter(estudiante=self.request.user)
            .select_related("tipo_residuo", "punto_reciclaje")
            .order_by("-fecha_registro")
        )


class RankingEstudiantesAPIView(generics.ListAPIView):
    serializer_class = RankingEstudianteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        periodo = self.request.query_params.get(
            "periodo",
            "todo",
        )

        ahora = timezone.localtime()
        registros = RegistroReciclaje.objects.all()

        if periodo == "mes":
            registros = registros.filter(
                fecha_registro__year=ahora.year,
                fecha_registro__month=ahora.month,
            )

        elif periodo == "semana":
            inicio_semana = (
                ahora - timedelta(days=ahora.weekday())
            ).replace(
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )

            registros = registros.filter(
                fecha_registro__gte=inicio_semana,
                fecha_registro__lte=ahora,
            )

        puntos_por_estudiante = (
            registros
            .values("estudiante_id")
            .annotate(total=Sum("puntos_otorgados"))
        )

        totales = {
            item["estudiante_id"]: item["total"]
            for item in puntos_por_estudiante
        }

        perfiles = list(
            PerfilEstudiante.objects
            .select_related(
                "usuario",
                "facultad_relacionada",
                "carrera_relacionada",
            )
        )

        for perfil in perfiles:
            puntos_reciclaje = totales.get(
                perfil.usuario_id,
                0,
            )

            perfil.puntos = (
                    puntos_reciclaje
                    + perfil.puntos_recompensas
            )

        perfiles.sort(
            key=lambda perfil: (
                -perfil.puntos,
                perfil.usuario.username.lower(),
            )
        )

        for posicion, perfil in enumerate(perfiles, start=1):
            perfil.posicion_ranking = posicion

        return perfiles


class MisLogrosAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        perfil = get_object_or_404(
            PerfilEstudiante,
            usuario=request.user,
        )

        puntos = perfil.puntos

        niveles = list(
            NivelReciclaje.objects
            .filter(activo=True)
            .order_by("puntos_minimos")
        )

        nivel_actual = None
        siguiente_nivel = None

        for nivel in niveles:
            if nivel.puntos_minimos <= puntos:
                nivel_actual = nivel
            else:
                siguiente_nivel = nivel
                break

        insignias = (
            InsigniaObtenida.objects
            .filter(estudiante=perfil)
            .select_related("insignia")
            .order_by("-fecha_obtencion")
        )

        return Response({
            "puntos": puntos,
            "ecucoins": puntos // 5,
            "nivel_actual": (
                NivelReciclajeSerializer(nivel_actual).data
                if nivel_actual else None
            ),
            "siguiente_nivel": (
                NivelReciclajeSerializer(siguiente_nivel).data
                if siguiente_nivel else None
            ),
            "insignias_obtenidas": [
                {
                    "id": item.insignia.id,
                    "nombre": item.insignia.nombre,
                    "descripcion": item.insignia.descripcion,
                    "fecha_obtencion": item.fecha_obtencion,
                    "equipada": item.equipada,
                }
                for item in insignias
            ],
        })

    def patch(self, request, *args, **kwargs):
        perfil = get_object_or_404(
            PerfilEstudiante,
            usuario=request.user,
        )

        insignias_ids = request.data.get("insignias_ids", [])

        if not isinstance(insignias_ids, list):
            return Response(
                {"error": "Debes enviar una lista de insignias."},
                status=400,
            )

        if len(insignias_ids) > 3:
            return Response(
                {"error": "Solo puedes equipar un máximo de 3 insignias."},
                status=400,
            )

        if len(insignias_ids) != len(set(insignias_ids)):
            return Response(
                {"error": "No puedes seleccionar insignias repetidas."},
                status=400,
            )

        insignias_validas = InsigniaObtenida.objects.filter(
            estudiante=perfil,
            insignia_id__in=insignias_ids,
        )

        if insignias_validas.count() != len(insignias_ids):
            return Response(
                {"error": "Una o más insignias no han sido desbloqueadas."},
                status=400,
            )

        InsigniaObtenida.objects.filter(
            estudiante=perfil
        ).update(equipada=False)

        insignias_validas.update(equipada=True)

        return Response({
            "mensaje": "Insignias equipadas correctamente.",
            "insignias_ids": insignias_ids,
        })



class RetosEcologicosAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        ahora = timezone.now()

        retos = RetoEcologico.objects.filter(
            activo=True
        ).select_related(
            "carrera",
            "facultad",
            "tipo_residuo"
        ).order_by("fecha_inicio", "titulo")

        participaciones = {
            p.reto_id: p
            for p in ParticipacionReto.objects.filter(
                estudiante=request.user,
                reto__in=retos,
            )
        }

        participaciones_grupales = {
            p.reto_id: p
            for p in ParticipacionRetoGrupal.objects.filter(
                estudiante=request.user,
                reto__in=retos,
            )
        }

        perfil = PerfilEstudiante.objects.filter(
            usuario=request.user
        ).first()

        resultado = []

        for reto in retos:
            participacion = participaciones.get(reto.id)
            participacion_grupal = participaciones_grupales.get(reto.id)

            progreso = 0
            completado = False
            meta_alcanzada = False
            fecha_completado = None
            total_participantes = 0
            recompensa_entregada = False

            if reto.modalidad == RetoEcologico.Modalidad.GRUPAL:

                carrera_id = None
                facultad_id = None

                if perfil:
                    if reto.alcance == RetoEcologico.Alcance.CARRERA:
                        carrera_id = perfil.carrera_relacionada_id

                    elif reto.alcance == RetoEcologico.Alcance.FACULTAD:
                        facultad_id = perfil.facultad_relacionada_id

                if carrera_id or facultad_id:

                    # Obtener o crear el progreso del grupo correspondiente.
                    if carrera_id:
                        progreso_grupal, _ = (
                            ProgresoRetoGrupal.objects.get_or_create(
                                reto=reto,
                                carrera_id=carrera_id,
                                facultad=None
                            )
                        )

                        participantes_grupo = (
                            ParticipacionRetoGrupal.objects.filter(
                                reto=reto,
                                estudiante__perfil__carrera_relacionada_id=carrera_id
                            )
                        )

                    else:
                        progreso_grupal, _ = (
                            ProgresoRetoGrupal.objects.get_or_create(
                                reto=reto,
                                carrera=None,
                                facultad_id=facultad_id
                            )
                        )

                        participantes_grupo = (
                            ParticipacionRetoGrupal.objects.filter(
                                reto=reto,
                                estudiante__perfil__facultad_relacionada_id=facultad_id
                            )
                        )

                    total_participantes = participantes_grupo.count()

                    # Contar únicamente reciclajes de estudiantes inscritos.
                    registros = RegistroReciclaje.objects.filter(
                        estudiante__participaciones_grupales__reto=reto,
                        fecha_registro__gte=reto.fecha_inicio,
                        fecha_registro__lte=reto.fecha_fin,
                    ).filter(
                        fecha_registro__gte=F(
                            "estudiante__participaciones_grupales__fecha_participacion"
                        )
                    )

                    # Separar el progreso de cada carrera o facultad.
                    if carrera_id:
                        registros = registros.filter(
                            estudiante__perfil__carrera_relacionada_id=carrera_id
                        )
                    else:
                        registros = registros.filter(
                            estudiante__perfil__facultad_relacionada_id=facultad_id
                        )

                    # Calcular el avance según el tipo de objetivo.
                    if reto.tipo_objetivo == RetoEcologico.TipoObjetivo.RECICLAJES:
                        valor_actual = registros.values(
                            "id"
                        ).distinct().count()

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

                    progreso = min(
                        int((valor_actual / reto.meta) * 100),
                        100
                    )




                    # Guardar el progreso independiente del grupo.
                    with transaction.atomic():

                        progreso_grupal = (
                            ProgresoRetoGrupal.objects
                            .select_for_update()
                            .get(pk=progreso_grupal.pk)
                        )

                        progreso_grupal.valor_actual = valor_actual

                        if (
                                valor_actual >= reto.meta
                                and not progreso_grupal.fecha_completado
                        ):
                            progreso_grupal.fecha_completado = ahora

                        progreso_grupal.save()

                        if progreso_grupal.fecha_completado:

                            participantes_pendientes = (
                                participantes_grupo
                                .filter(recompensa_entregada=False)
                                .select_related("estudiante")
                            )

                            for participante in participantes_pendientes:

                                entregada = (
                                    ParticipacionRetoGrupal.objects
                                    .filter(
                                        pk=participante.pk,
                                        recompensa_entregada=False
                                    )
                                    .update(recompensa_entregada=True)
                                )

                                if entregada:
                                    PerfilEstudiante.objects.filter(
                                        usuario_id=participante.estudiante_id
                                    ).update(
                                        puntos_recompensas=F("puntos_recompensas")
                                                           + reto.recompensa_puntos
                                    )

                    meta_alcanzada = (
                        progreso_grupal.fecha_completado is not None
                    )

                    fecha_completado = (
                        progreso_grupal.fecha_completado
                        if participacion_grupal and meta_alcanzada
                        else None
                    )

                completado = bool(
                    participacion_grupal
                    and participacion_grupal.recompensa_entregada
                )

                recompensa_entregada = completado

            else:
                # Progreso individual: se conserva el comportamiento anterior.
                progreso = (
                    participacion.progreso
                    if participacion else 0
                )

                completado = bool(
                    participacion and participacion.fecha_completado
                )

                meta_alcanzada = completado

                fecha_completado = (
                    participacion.fecha_completado
                    if participacion else None
                )

                total_participantes = reto.participaciones.count()

                recompensa_entregada = completado

            # Determinar el estado del reto.
            if completado:
                estado = "Completado"

            elif (
                reto.estado == RetoEcologico.Estado.FINALIZADO
                or reto.fecha_fin < ahora
            ):
                estado = "Finalizado"

            elif (
                reto.estado == RetoEcologico.Estado.PROXIMO
                or reto.fecha_inicio > ahora
            ):
                estado = "Próximo"

            else:
                estado = "Activo"

            resultado.append({
                "id": reto.id,
                "titulo": reto.titulo,
                "descripcion": reto.descripcion,
                "recompensa_puntos": reto.recompensa_puntos,
                "fecha_inicio": reto.fecha_inicio,
                "fecha_fin": reto.fecha_fin,
                "estado": estado,
                "destacado": reto.destacado,
                "progreso": progreso,
                "completado": completado,
                "meta_alcanzada": meta_alcanzada,
                "fecha_completado": fecha_completado,
                "modalidad": reto.modalidad,
                "alcance": reto.alcance,
                "tipo_objetivo": reto.tipo_objetivo,
                "meta": reto.meta,
                "tipo_residuo": (
                    reto.tipo_residuo.nombre
                    if reto.tipo_residuo else None
                ),
                "participantes": total_participantes,
                "participo": bool(
                    participacion or participacion_grupal
                ),
                "recompensa_entregada": recompensa_entregada,
            })

        return Response(resultado)


class ParticiparRetoGrupalAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        reto = get_object_or_404(
            RetoEcologico,
            pk=pk,
            activo=True
        )

        ahora = timezone.now()

        if reto.modalidad != RetoEcologico.Modalidad.GRUPAL:
            return Response(
                {"error": "Este reto no es grupal."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if ahora < reto.fecha_inicio or ahora > reto.fecha_fin:
            return Response(
                {"error": "Este reto no está disponible para inscripciones."},
                status=status.HTTP_400_BAD_REQUEST
            )

        perfil = get_object_or_404(
            PerfilEstudiante,
            usuario=request.user
        )

        carrera = None
        facultad = None

        if reto.alcance == RetoEcologico.Alcance.CARRERA:
            carrera = perfil.carrera_relacionada

            if not carrera:
                return Response(
                    {"error": "No tienes una carrera asignada en tu perfil."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif reto.alcance == RetoEcologico.Alcance.FACULTAD:
            facultad = perfil.facultad_relacionada

            if not facultad:
                return Response(
                    {"error": "No tienes una facultad asignada en tu perfil."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        else:
            return Response(
                {"error": "El alcance del reto no es válido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        progreso_completado = ProgresoRetoGrupal.objects.filter(
            reto=reto,
            carrera=carrera,
            facultad=facultad,
            fecha_completado__isnull=False
        ).exists()

        if progreso_completado:
            return Response(
                {
                    "error": "Tu grupo ya completó este reto. No es posible inscribirse."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            participacion, creada = (
                ParticipacionRetoGrupal.objects.get_or_create(
                    reto=reto,
                    estudiante=request.user
                )
            )

            ProgresoRetoGrupal.objects.get_or_create(
                reto=reto,
                carrera=carrera,
                facultad=facultad
            )

        return Response(
            {
                "mensaje": (
                    "Te has inscrito correctamente en el reto."
                    if creada
                    else "Ya estás inscrito en este reto."
                ),
                "participado": True,
                "nuevo_registro": creada,
                "reto_id": reto.id,
                "grupo": (
                    carrera.nombre if carrera
                    else facultad.nombre
                )
            },
            status=(
                status.HTTP_201_CREATED
                if creada
                else status.HTTP_200_OK
            )
        )

def estado_sesion_api(request):
    usuario = request.user

    if not usuario.is_authenticated:
        return JsonResponse({
            "autenticado": False
        })

    rol = (
        "admin"
        if usuario.is_staff or usuario.is_superuser
        else "student"
    )

    return JsonResponse({
        "autenticado": True,
        "rol": rol,
        "usuario": {
            "id": usuario.pk,
            "username": usuario.get_username(),
            "email": usuario.email,
            "nombre": usuario.first_name,
            "apellido": usuario.last_name,
            "nombre_completo": usuario.get_full_name(),
        },
    })

class AdminUsuariosAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def list(self, request, *args, **kwargs):
        perfiles = (
            PerfilEstudiante.objects
            .select_related(
                "usuario",
                "facultad_relacionada",
                "carrera_relacionada",
            )
            .order_by("usuario__username")
        )

        usuarios = []

        for perfil in perfiles:
            usuario = perfil.usuario

            registros = (
                RegistroReciclaje.objects
                .filter(estudiante=usuario)
                .select_related(
                    "tipo_residuo",
                    "punto_reciclaje",
                    "deteccion",
                )
                .order_by("-fecha_registro")
            )

            historial = []

            for registro in registros[:5]:
                deteccion = registro.deteccion

                if deteccion is None:
                    estado = "Registrado"
                else:
                    estado = deteccion.get_estado_validacion_display()

                historial.append({
                    "id": registro.id,
                    "fecha": registro.fecha_registro.isoformat(),
                    "residuo": registro.tipo_residuo.nombre,
                    "punto": registro.punto_reciclaje.nombre,
                    "puntos": registro.puntos_otorgados,
                    "estado": estado,
                })

            usuarios.append({
                "id": usuario.pk,
                "identificacion": perfil.identificacion,
                "nombre": usuario.get_full_name() or usuario.get_username(),
                "correo": usuario.email,
                "username": usuario.get_username(),
                "facultad": (
                    perfil.facultad_relacionada.nombre
                    if perfil.facultad_relacionada else ""
                ),
                "carrera": (
                    perfil.carrera_relacionada.nombre
                    if perfil.carrera_relacionada else ""
                ),
                "semestre": perfil.semestre,
                "puntos": perfil.puntos,
                "codigo_qr": perfil.codigo_qr,
                "fecha_registro": perfil.fecha_registro.isoformat(),
                "activo": usuario.is_active,
                "total_reciclajes": registros.count(),
                "historial": historial,
            })

        return Response({"usuarios": usuarios})


class AdminDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        perfiles = PerfilEstudiante.objects.select_related(
            "usuario",
            "facultad_relacionada",
        )

        usuarios_activos = perfiles.filter(
            usuario__is_active=True
        ).count()

        total_usuarios = perfiles.count()

        reciclajes = RegistroReciclaje.objects.all()
        total_reciclajes = reciclajes.count()

        puntos_generados = reciclajes.aggregate(
            total=Sum("puntos_otorgados")
        )["total"] or 0

        puntos_por_facultad = list(
            perfiles
            .values("facultad_relacionada__nombre")
            .annotate(
                puntos=Sum("puntos"),
                estudiantes=Count("id"),
            )
            .order_by("-puntos")
        )

        # Mantener un formato sencillo para el frontend.
        puntos_por_facultad = [
            {
                "facultad": item["facultad_relacionada__nombre"] or "Sin facultad",
                "puntos": item["puntos"] or 0,
                "estudiantes": item["estudiantes"],
            }
            for item in puntos_por_facultad
        ]

        return Response({
            "usuarios_registrados": total_usuarios,
            "usuarios_activos": usuarios_activos,
            "total_reciclajes": total_reciclajes,
            "puntos_generados": puntos_generados,
            "facultades": puntos_por_facultad,
        })

class AdminFacultadesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        facultades = Facultad.objects.all().order_by("nombre")
        resultado = []

        for facultad in facultades:
            perfiles = PerfilEstudiante.objects.filter(
                facultad_relacionada=facultad
            )

            resultado.append({
                "id": facultad.id,
                "name": facultad.nombre,
                "description": facultad.descripcion or "",
                "active": facultad.activa,
                "total_carreras": facultad.carreras.count(),
                "total_estudiantes": perfiles.count(),
                "points": perfiles.aggregate(
                    total=Sum("puntos")
                )["total"] or 0,
            })

        return Response(resultado)

    def post(self, request):
        nombre = request.data.get("name", "").strip()
        descripcion = request.data.get("description", "")

        if not nombre:
            return Response(
                {"error": "El nombre de la facultad es obligatorio."},
                status=400,
            )

        if Facultad.objects.filter(nombre__iexact=nombre).exists():
            return Response(
                {"error": "Ya existe una facultad con ese nombre."},
                status=400,
            )

        facultad = Facultad.objects.create(
            nombre=nombre,
            descripcion=descripcion,
            activa=request.data.get("active", True),
        )

        return Response({
            "id": facultad.id,
            "name": facultad.nombre,
            "description": facultad.descripcion or "",
            "active": facultad.activa,
            "total_carreras": 0,
            "total_estudiantes": 0,
            "points": 0,
        }, status=201)


class AdminFacultadDetalleAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(Facultad, pk=pk)

    def put(self, request, pk):
        facultad = self.get_object(pk)

        nombre = request.data.get("name", facultad.nombre).strip()

        if not nombre:
            return Response(
                {"error": "El nombre es obligatorio."},
                status=400,
            )

        if Facultad.objects.filter(
            nombre__iexact=nombre
        ).exclude(pk=pk).exists():
            return Response(
                {"error": "Ya existe una facultad con ese nombre."},
                status=400,
            )

        facultad.nombre = nombre
        facultad.descripcion = request.data.get(
            "description", facultad.descripcion
        )
        facultad.activa = request.data.get(
            "active", facultad.activa
        )
        facultad.save()

        return Response({
            "detail": "Facultad actualizada correctamente."
        })

    def patch(self, request, pk):
        facultad = self.get_object(pk)

        if "active" in request.data:
            facultad.activa = request.data["active"]

        if "description" in request.data:
            facultad.descripcion = request.data["description"]

        facultad.save()

        perfiles = PerfilEstudiante.objects.filter(
            facultad_relacionada=facultad
        )

        return Response({
            "id": facultad.id,
            "name": facultad.nombre,
            "description": facultad.descripcion or "",
            "active": facultad.activa,
            "total_carreras": facultad.carreras.count(),
            "total_estudiantes": perfiles.count(),
            "points": perfiles.aggregate(
                total=Sum("puntos")
            )["total"] or 0,
        })

    def delete(self, request, pk):
        facultad = self.get_object(pk)

        try:
            with transaction.atomic():

                # Obtener las carreras pertenecientes a la facultad.
                carreras_ids = list(
                    Carrera.objects.filter(
                        facultad=facultad
                    ).values_list("id", flat=True)
                )

                # Obtener los usuarios vinculados a la facultad
                # o a cualquiera de sus carreras.
                estudiantes_ids = list(
                    PerfilEstudiante.objects.filter(
                        Q(facultad_relacionada=facultad) |
                        Q(carrera_relacionada_id__in=carreras_ids)
                    ).values_list("usuario_id", flat=True)
                )

                # Eliminar participaciones en retos grupales
                # de los estudiantes de esta facultad.
                ParticipacionRetoGrupal.objects.filter(
                    estudiante_id__in=estudiantes_ids,
                    reto__modalidad=RetoEcologico.Modalidad.GRUPAL
                ).delete()

                # Eliminar progresos grupales de la facultad
                # y de todas sus carreras.
                ProgresoRetoGrupal.objects.filter(
                    Q(facultad=facultad) |
                    Q(carrera_id__in=carreras_ids)
                ).delete()

                # Desvincular estudiantes sin eliminar sus cuentas.
                PerfilEstudiante.objects.filter(
                    Q(facultad_relacionada=facultad) |
                    Q(carrera_relacionada_id__in=carreras_ids)
                ).update(
                    facultad_relacionada=None,
                    carrera_relacionada=None
                )

                # Eliminar la facultad y sus carreras.
                facultad.delete()

            return Response({
                "detail": "Facultad, carreras y relaciones asociadas eliminadas correctamente."
            })

        except ProtectedError:
            return Response({
                "error": "No se puede eliminar la facultad porque existen otros registros asociados."
            }, status=400)


class AdminPuntosReciclajeAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        puntos = PuntoReciclaje.objects.all().order_by("nombre")
        return Response(PuntoReciclajeSerializer(puntos, many=True).data)

    def post(self, request):
        serializer = PuntoReciclajeSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class AdminPuntoReciclajeDetalleAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(PuntoReciclaje, pk=pk)

    def put(self, request, pk):
        punto = self.get_object(pk)
        serializer = PuntoReciclajeSerializer(
            punto,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def patch(self, request, pk):
        punto = self.get_object(pk)
        serializer = PuntoReciclajeSerializer(
            punto,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        punto = self.get_object(pk)
        punto.delete()

        return Response({
            "detail": "Punto de reciclaje eliminado correctamente."
        })

class AdminCarrerasAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        carreras = Carrera.objects.select_related(
            "facultad"
        ).order_by("nombre")

        resultado = []

        for carrera in carreras:
            perfiles = PerfilEstudiante.objects.filter(
                carrera_relacionada=carrera
            )

            resultado.append({
                "id": carrera.id,
                "name": carrera.nombre,
                "description": carrera.descripcion or "",
                "faculty_id": carrera.facultad_id,
                "faculty": carrera.facultad.nombre,
                "active": carrera.activa,
                "total_estudiantes": perfiles.count(),
                "points": perfiles.aggregate(
                    total=Sum("puntos")
                )["total"] or 0,
            })

        return Response(resultado)

    def post(self, request):
        nombre = request.data.get("name", "").strip()
        descripcion = request.data.get("description", "")
        facultad_id = request.data.get("faculty_id")

        if not nombre or not facultad_id:
            return Response(
                {"error": "El nombre y la facultad son obligatorios."},
                status=400,
            )

        facultad = get_object_or_404(Facultad, pk=facultad_id)

        if Carrera.objects.filter(
            nombre__iexact=nombre,
            facultad=facultad,
        ).exists():
            return Response(
                {"error": "Esta carrera ya existe en la facultad seleccionada."},
                status=400,
            )

        carrera = Carrera.objects.create(
            nombre=nombre,
            descripcion=descripcion,
            facultad=facultad,
            activa=request.data.get("active", True),
        )

        return Response({
            "id": carrera.id,
            "name": carrera.nombre,
            "description": carrera.descripcion or "",
            "faculty_id": carrera.facultad_id,
            "faculty": carrera.facultad.nombre,
            "active": carrera.activa,
            "total_estudiantes": 0,
            "points": 0,
        }, status=201)


class AdminCarreraDetalleAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(
            Carrera.objects.select_related("facultad"),
            pk=pk,
        )

    def put(self, request, pk):
        carrera = self.get_object(pk)

        nombre = request.data.get("name", carrera.nombre).strip()
        facultad_id = request.data.get(
            "faculty_id", carrera.facultad_id
        )

        if not nombre:
            return Response(
                {"error": "El nombre de la carrera es obligatorio."},
                status=400,
            )

        facultad = get_object_or_404(Facultad, pk=facultad_id)

        duplicada = Carrera.objects.filter(
            nombre__iexact=nombre,
            facultad=facultad,
        ).exclude(pk=pk).exists()

        if duplicada:
            return Response(
                {"error": "Ya existe esa carrera en la facultad seleccionada."},
                status=400,
            )

        carrera.nombre = nombre
        carrera.facultad = facultad
        carrera.descripcion = request.data.get(
            "description", carrera.descripcion
        )
        carrera.activa = request.data.get("active", carrera.activa)
        carrera.save()

        return Response({"detail": "Carrera actualizada correctamente."})

    def patch(self, request, pk):
        carrera = self.get_object(pk)

        if "active" in request.data:
            carrera.activa = request.data["active"]

        if "description" in request.data:
            carrera.descripcion = request.data["description"]

        carrera.save()

        perfiles = PerfilEstudiante.objects.filter(
            carrera_relacionada=carrera
        )

        return Response({
            "id": carrera.id,
            "name": carrera.nombre,
            "description": carrera.descripcion or "",
            "active": carrera.activa,
            "total_estudiantes": perfiles.count(),
            "points": perfiles.aggregate(
                total=Sum("puntos")
            )["total"] or 0,
        })

    def delete(self, request, pk):
        carrera = self.get_object(pk)

        try:
            with transaction.atomic():

                # Obtener los estudiantes de esta carrera.
                estudiantes_ids = list(
                    PerfilEstudiante.objects.filter(
                        carrera_relacionada=carrera
                    ).values_list("usuario_id", flat=True)
                )

                # Eliminar sus inscripciones en retos grupales
                # cuyo progreso se organiza por carrera.
                ParticipacionRetoGrupal.objects.filter(
                    estudiante_id__in=estudiantes_ids,
                    reto__modalidad=RetoEcologico.Modalidad.GRUPAL,
                    reto__alcance=RetoEcologico.Alcance.CARRERA
                ).delete()

                # Eliminar únicamente el progreso de esta carrera.
                ProgresoRetoGrupal.objects.filter(
                    carrera=carrera
                ).delete()

                # Eliminar la carrera.
                # Los perfiles se conservarán gracias a SET_NULL.
                carrera.delete()

            return Response({
                "detail": "Carrera eliminada correctamente."
            })

        except ProtectedError:
            return Response(
                {
                    "error": "No se puede eliminar: existen otros registros asociados a esta carrera."
                },
                status=400
            )


class AdminReciclajesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        detecciones = (
            DeteccionResiduo.objects
            .select_related(
                "estudiante",
                "tipo_residuo",
            )
            .order_by("-fecha_deteccion")
        )

        resultado = []

        for deteccion in detecciones:
            registro = (
                RegistroReciclaje.objects
                .filter(deteccion=deteccion)
                .select_related("punto_reciclaje")
                .first()
            )

            usuario = deteccion.estudiante

            nombre_usuario = (
                usuario.get_full_name()
                or usuario.get_username()
            )

            fecha = deteccion.fecha_deteccion

            resultado.append({
                "id": deteccion.id,
                "userId": usuario.id,
                "usuario": nombre_usuario,
                "fecha": fecha.strftime("%d/%m/%Y"),
                "hora": fecha.strftime("%H:%M"),
                "waste": deteccion.tipo_residuo.nombre,
                "point": (
                    registro.punto_reciclaje.nombre
                    if registro else "Sin punto registrado"
                ),
                "points": (
                    registro.puntos_otorgados
                    if registro else 0
                ),
                "status": deteccion.estado_validacion,
                "imagen": (
                    request.build_absolute_uri(deteccion.imagen.url)
                    if deteccion.imagen else None
                ),
                "confianza": (
                    float(deteccion.confianza)
                    if deteccion.confianza is not None else None
                ),
            })

        return Response(resultado)



class AdminRecompensasAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        recompensas = Recompensa.objects.all().order_by("costo_ecucoins", "nombre")
        serializer = AdminRecompensaSerializer(recompensas, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AdminRecompensaSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class AdminRecompensaDetalleAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(Recompensa, pk=pk)

    def put(self, request, pk):
        recompensa = self.get_object(pk)
        serializer = AdminRecompensaSerializer(
            recompensa,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def patch(self, request, pk):
        recompensa = self.get_object(pk)
        serializer = AdminRecompensaSerializer(
            recompensa,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        recompensa = self.get_object(pk)

        if recompensa.canjes.exists():
            return Response(
                {
                    "error": "No se puede eliminar porque existen canjes registrados."
                },
                status=400
            )

        recompensa.delete()

        return Response({
            "detail": "Recompensa eliminada correctamente."
        })


class AdminRetosAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        retos = (
            RetoEcologico.objects
            .annotate()
            .order_by("-fecha_creacion")
        )

        serializer = AdminRetoSerializer(retos, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AdminRetoSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


class AdminRetoDetalleAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(RetoEcologico, pk=pk)

    def put(self, request, pk):
        reto = self.get_object(pk)
        serializer = AdminRetoSerializer(reto, data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def patch(self, request, pk):
        reto = self.get_object(pk)
        serializer = AdminRetoSerializer(
            reto,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        reto = self.get_object(pk)

        if reto.participaciones.exists():
            return Response(
                {
                    "error": "No se puede eliminar porque existen estudiantes inscritos en este reto."
                },
                status=400
            )

        reto.delete()

        return Response({
            "detail": "Reto eliminado correctamente."
        })

def desbloquear_insignia_a_estudiantes(insignia):
    if not insignia.activo:
        return

    perfiles = PerfilEstudiante.objects.filter(
        puntos__gte=insignia.puntos_requeridos
    ).select_related("usuario")

    for perfil in perfiles:
        obtenida, creada = InsigniaObtenida.objects.get_or_create(
            estudiante=perfil,
            insignia=insignia
        )

        if creada:
            Notificacion.objects.create(
                usuario=perfil.usuario,
                titulo="¡Nueva insignia desbloqueada!",
                mensaje=(
                    f"Has obtenido la insignia '{insignia.nombre}'. "
                    "¡Sigue reciclando en EcoCampus AI!"
                ),
                tipo="SUCCESS",
            )

class AdminInsigniasAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        insignias = Insignia.objects.all().order_by(
            "puntos_requeridos",
            "nombre"
        )

        serializer = AdminInsigniaSerializer(insignias, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AdminInsigniaSerializer(data=request.data)

        if serializer.is_valid():
            insignia = serializer.save()

            desbloquear_insignia_a_estudiantes(insignia)

            return Response(
                AdminInsigniaSerializer(insignia).data,
                status=201
            )

        return Response(serializer.errors, status=400)


class AdminInsigniaDetalleAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        return get_object_or_404(Insignia, pk=pk)

    def put(self, request, pk):
        insignia = self.get_object(pk)
        serializer = AdminInsigniaSerializer(
            insignia,
            data=request.data
        )

        if serializer.is_valid():
            insignia = serializer.save()

            desbloquear_insignia_a_estudiantes(insignia)

            return Response(
                AdminInsigniaSerializer(insignia).data
            )

        return Response(serializer.errors, status=400)

    def patch(self, request, pk):
        insignia = self.get_object(pk)
        serializer = AdminInsigniaSerializer(
            insignia,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            insignia = serializer.save()

            desbloquear_insignia_a_estudiantes(insignia)

            return Response(
                AdminInsigniaSerializer(insignia).data
            )

        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        insignia = self.get_object(pk)

        insignia.delete()

        return Response({
            "detail": "Insignia eliminada correctamente."
        })



def generar_excel_reporte(tipo, periodo, datos):
    from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.table import Table, TableStyleInfo
    from django.utils import timezone

    wb = Workbook()
    ws = wb.active
    ws.title = "Reporte"

    # Colores institucionales
    VERDE = "176B45"
    VERDE_CLARO = "E2F0E8"
    BLANCO = "FFFFFF"
    GRIS = "F2F4F3"
    GRIS_TEXTO = "606B66"

    borde = Side(style="thin", color="D9E2DC")

    # Configuración de impresión
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "A12"
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4

    # Encabezado institucional
    ws.merge_cells("A1:F1")
    ws["A1"] = "EcoCampus AI"
    ws["A1"].font = Font(
        name="Arial", size=22, bold=True, color=BLANCO
    )
    ws["A1"].fill = PatternFill("solid", fgColor=VERDE)
    ws["A1"].alignment = Alignment(vertical="center")

    for row in ws["A1:F1"]:
        for cell in row:
            cell.fill = PatternFill("solid", fgColor=VERDE)

    ws.row_dimensions[1].height = 42

    ws.merge_cells("A2:F2")
    ws["A2"] = "SISTEMA INTELIGENTE DE GESTIÓN E INCENTIVO DEL RECICLAJE UNIVERSITARIO"
    ws["A2"].font = Font(size=9, color=BLANCO, italic=True)
    ws["A2"].fill = PatternFill("solid", fgColor=VERDE)
    ws["A2"].alignment = Alignment(vertical="center")

    for row in ws["A2:F2"]:
        for cell in row:
            cell.fill = PatternFill("solid", fgColor=VERDE)

    ws.row_dimensions[2].height = 25

    # Información del reporte
    ws.merge_cells("A4:F4")
    ws["A4"] = tipo.upper()
    ws["A4"].font = Font(size=16, bold=True, color=VERDE)
    ws["A4"].alignment = Alignment(vertical="center")
    ws.row_dimensions[4].height = 30

    ws["A6"] = "Período:"
    ws["B6"] = periodo
    ws["D6"] = "Generado:"
    ws["E6"] = timezone.localtime().strftime("%d/%m/%Y %H:%M")

    for celda in ["A6", "D6"]:
        ws[celda].font = Font(bold=True, color=GRIS_TEXTO)

    # Resumen
    resumen = datos.get("resumen", {})
    ws.merge_cells("A8:F8")
    ws["A8"] = "RESUMEN GENERAL"
    ws["A8"].font = Font(bold=True, color=BLANCO)
    ws["A8"].fill = PatternFill("solid", fgColor=VERDE)

    for cell in ws[8]:
        cell.fill = PatternFill("solid", fgColor=VERDE)

    fila = 9

    if resumen:
        for indicador, valor in resumen.items():
            ws.cell(fila, 1, indicador.replace("_", " ").title())
            ws.cell(fila, 2, valor)

            ws.cell(fila, 1).font = Font(bold=True, color=GRIS_TEXTO)
            ws.cell(fila, 2).font = Font(bold=True, color=VERDE)

            for col in range(1, 3):
                ws.cell(fila, col).fill = PatternFill(
                    "solid", fgColor=GRIS
                )
                ws.cell(fila, col).border = Border(bottom=borde)

            fila += 1

    # Datos del reporte
    listas = [
        valor for valor in datos.values()
        if isinstance(valor, list) and valor
    ]

    if listas:
        fila += 2

        ws.merge_cells(start_row=fila, start_column=1,
                       end_row=fila, end_column=6)

        titulo_detalle = ws.cell(fila, 1, "DETALLE DEL REPORTE")
        titulo_detalle.font = Font(bold=True, color=BLANCO)
        titulo_detalle.fill = PatternFill("solid", fgColor=VERDE)

        for col in range(1, 7):
            ws.cell(fila, col).fill = PatternFill(
                "solid", fgColor=VERDE
            )

        fila += 1

        elementos = listas[-1]
        columnas = list(elementos[0].keys())

        for col, nombre in enumerate(columnas, start=1):
            celda = ws.cell(fila, col, nombre.replace("_", " ").title())
            celda.font = Font(bold=True, color=BLANCO)
            celda.fill = PatternFill("solid", fgColor=VERDE)
            celda.alignment = Alignment(
                horizontal="center", vertical="center"
            )
            celda.border = Border(bottom=borde)

        ws.row_dimensions[fila].height = 25
        fila += 1

        for indice, elemento in enumerate(elementos):
            for col, nombre in enumerate(columnas, start=1):
                valor = elemento.get(nombre, "")

                if isinstance(valor, str):
                    try:
                        fecha = datetime.fromisoformat(
                            valor.replace("Z", "+00:00")
                        )

                        if timezone.is_aware(fecha):
                            fecha = timezone.localtime(fecha)

                        valor = fecha.strftime("%d/%m/%Y %H:%M")

                    except (ValueError, TypeError):
                        pass

                elif hasattr(valor, "strftime"):
                    if timezone.is_aware(valor):
                        valor = timezone.localtime(valor)

                    valor = valor.strftime("%d/%m/%Y %H:%M")

                celda = ws.cell(fila, col, valor)
                celda.alignment = Alignment(vertical="center")
                celda.border = Border(bottom=borde)

                if indice % 2 == 0:
                    celda.fill = PatternFill("solid", fgColor=GRIS)

            fila += 1

    # Ajustar ancho de columnas
    for columna in ws.columns:
        letra = get_column_letter(columna[0].column)
        ancho = max(
            len(str(celda.value or ""))
            for celda in columna
        )
        ws.column_dimensions[letra].width = min(max(ancho + 4, 14), 38)

    # Márgenes y encabezado/pie de página
    ws.page_margins.left = 0.3
    ws.page_margins.right = 0.3
    ws.page_margins.top = 0.5
    ws.page_margins.bottom = 0.5

    ws.oddFooter.center.text = "EcoCampus AI | Informe institucional"
    ws.oddFooter.center.size = 8
    ws.oddFooter.center.font = "Arial"

    # Crear archivo descargable
    response = HttpResponse(
        content_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        )
    )

    nombre = tipo.replace(" ", "_").lower()

    response["Content-Disposition"] = (
        f'attachment; filename="EcoCampus_{nombre}.xlsx"'
    )

    wb.save(response)

    return response


def responder_reporte(request, datos):
    formato = request.query_params.get("formato", "json")

    if formato == "excel":
        return generar_excel_reporte(
            datos["tipo"],
            datos["periodo"],
            datos,
        )

    elif formato == "pdf":
        return generar_pdf_reporte(
            datos["tipo"],
            datos["periodo"],
            datos,
        )

    return Response(datos)


def generar_pdf_reporte(tipo, periodo, datos):
    from io import BytesIO
    from datetime import datetime
    from django.utils import timezone
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
        PageBreak,
    )

    buffer = BytesIO()

    VERDE = colors.HexColor("#176B45")
    VERDE_CLARO = colors.HexColor("#E2F0E8")
    GRIS = colors.HexColor("#F2F4F3")
    GRIS_TEXTO = colors.HexColor("#606B66")
    BLANCO = colors.white

    documento = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.8 * cm,
        title=f"EcoCampus AI - {tipo}",
        author="EcoCampus AI",
    )

    estilos = getSampleStyleSheet()

    titulo = ParagraphStyle(
        "TituloReporte",
        parent=estilos["Title"],
        fontName="Helvetica-Bold",
        fontSize=17,
        textColor=VERDE,
        alignment=TA_LEFT,
        spaceAfter=8,
    )

    subtitulo = ParagraphStyle(
        "Subtitulo",
        parent=estilos["Normal"],
        fontSize=9,
        textColor=GRIS_TEXTO,
        leading=13,
    )

    encabezado = ParagraphStyle(
        "EncabezadoTabla",
        parent=estilos["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=BLANCO,
        alignment=TA_CENTER,
    )

    celda = ParagraphStyle(
        "CeldaTabla",
        parent=estilos["Normal"],
        fontSize=7,
        leading=10,
        textColor=colors.HexColor("#303A35"),
    )

    contenido = []

    # Encabezado institucional
    contenido.append(Paragraph(
        '<font color="#FFFFFF"><b>EcoCampus AI</b></font>',
        ParagraphStyle(
            "Marca",
            parent=estilos["Title"],
            fontSize=23,
            textColor=BLANCO,
            alignment=TA_LEFT,
        )
    ))

    contenido.append(Paragraph(
        '<font color="#FFFFFF">'
        'Sistema Inteligente de Gestión e Incentivo del Reciclaje Universitario'
        '</font>',
        ParagraphStyle(
            "MarcaSub",
            parent=estilos["Normal"],
            fontSize=8,
            textColor=BLANCO,
        )
    ))

    barra = Table(
        [[
            Paragraph(
                '<font color="#FFFFFF"><b>EcoCampus AI</b></font>',
                ParagraphStyle(
                    "MarcaBarra",
                    parent=estilos["Normal"],
                    fontSize=22,
                    textColor=BLANCO,
                )
            ),
            Paragraph(
                '<font color="#FFFFFF">INFORME INSTITUCIONAL</font>',
                ParagraphStyle(
                    "Etiqueta",
                    parent=estilos["Normal"],
                    fontSize=9,
                    textColor=BLANCO,
                    alignment=TA_CENTER,
                )
            )
        ]],
        colWidths=[15 * cm, 10 * cm],
    )

    barra.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), VERDE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))

    contenido.append(barra)
    contenido.append(Spacer(1, 20))

    # Información del reporte
    contenido.append(Paragraph(
        escape(tipo.upper()),
        titulo,
    ))

    fecha_generacion = timezone.localtime().strftime(
        "%d/%m/%Y %H:%M"
    )

    contenido.append(Paragraph(
        f"<b>Período:</b> {escape(str(periodo))}"
        f" &nbsp;&nbsp;&nbsp; "
        f"<b>Fecha de generación:</b> {fecha_generacion}",
        subtitulo,
    ))

    contenido.append(Spacer(1, 18))

    # Resumen general
    resumen = datos.get("resumen", {})

    if resumen:
        contenido.append(Paragraph(
            "RESUMEN GENERAL",
            ParagraphStyle(
                "Seccion",
                parent=estilos["Heading2"],
                fontSize=11,
                textColor=VERDE,
                spaceAfter=8,
            )
        ))

        resumen_data = [
            [
                Paragraph(
                    escape(str(clave).replace("_", " ").title()),
                    encabezado,
                )
                for clave in resumen.keys()
            ],
            [
                str(valor if valor is not None else 0)
                for valor in resumen.values()
            ],
        ]

        tabla_resumen = Table(
            resumen_data,
            repeatRows=1,
        )

        tabla_resumen.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), VERDE),
            ("BACKGROUND", (0, 1), (-1, 1), VERDE_CLARO),
            ("TEXTCOLOR", (0, 1), (-1, 1), VERDE),
            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 1), (-1, 1), 11),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.white),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]))

        contenido.append(tabla_resumen)
        contenido.append(Spacer(1, 20))

    # Seleccionar los datos de detalle
    clave_detalle = None

    for clave in [
        "detalle",
        "materiales",
        "carreras",
        "facultades",
        "recompensas",
        "retos",
        "insignias",
    ]:
        if isinstance(datos.get(clave), list) and datos[clave]:
            clave_detalle = clave
            break

    if clave_detalle:
        elementos = datos[clave_detalle]

        contenido.append(Paragraph(
            "DETALLE DEL REPORTE",
            ParagraphStyle(
                "DetalleTitulo",
                parent=estilos["Heading2"],
                fontSize=11,
                textColor=VERDE,
                spaceAfter=8,
            )
        ))

        columnas = list(elementos[0].keys())

        tabla_datos = [[
            Paragraph(
                escape(str(columna).replace("_", " ").title()),
                encabezado,
            )
            for columna in columnas
        ]]

        for elemento in elementos:
            fila = []

            for columna in columnas:
                valor = elemento.get(columna, "")

                if hasattr(valor, "strftime"):
                    if timezone.is_aware(valor):
                        valor = timezone.localtime(valor)

                    valor = valor.strftime("%d/%m/%Y %H:%M")

                elif isinstance(valor, str):
                    try:
                        fecha = datetime.fromisoformat(
                            valor.replace("Z", "+00:00")
                        )

                        if timezone.is_aware(fecha):
                            fecha = timezone.localtime(fecha)

                        valor = fecha.strftime("%d/%m/%Y %H:%M")

                    except (ValueError, TypeError):
                        pass

                fila.append(
                    Paragraph(
                        escape(str(valor if valor is not None else "")),
                        celda,
                    )
                )

            tabla_datos.append(fila)

        ancho_disponible = landscape(A4)[0] - 3 * cm
        ancho_columna = ancho_disponible / len(columnas)

        tabla = Table(
            tabla_datos,
            colWidths=[ancho_columna] * len(columnas),
            repeatRows=1,
        )

        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), VERDE),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLANCO, GRIS]),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9E2DC")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))

        contenido.append(tabla)

    else:
        contenido.append(Paragraph(
            "No existen registros para los filtros seleccionados.",
            subtitulo,
        ))

    # Nota informativa, si existe
    if datos.get("nota"):
        contenido.append(Spacer(1, 12))
        contenido.append(Paragraph(
            f"<b>Nota:</b> {escape(str(datos['nota']))}",
            subtitulo,
        ))

    # Pie de página y numeración
    def pie_pagina(canvas, doc):
        canvas.saveState()

        ancho, alto = landscape(A4)

        canvas.setStrokeColor(VERDE)
        canvas.setLineWidth(0.7)
        canvas.line(
            1.5 * cm,
            1.2 * cm,
            ancho - 1.5 * cm,
            1.2 * cm,
        )

        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(GRIS_TEXTO)

        canvas.drawString(
            1.5 * cm,
            0.8 * cm,
            "EcoCampus AI | Informe institucional",
        )

        canvas.drawRightString(
            ancho - 1.5 * cm,
            0.8 * cm,
            f"Página {doc.page}",
        )

        canvas.restoreState()

    documento.build(
        contenido,
        onFirstPage=pie_pagina,
        onLaterPages=pie_pagina,
    )

    buffer.seek(0)

    response = HttpResponse(
        buffer.getvalue(),
        content_type="application/pdf",
    )

    nombre = tipo.replace(" ", "_").lower()

    response["Content-Disposition"] = (
        f'attachment; filename="EcoCampus_{nombre}.pdf"'
    )

    buffer.close()

    return response



class AdminReportesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        tipo = request.query_params.get("tipo", "Reciclajes")
        periodo = request.query_params.get("periodo", "Todo el tiempo")
        facultad_id = request.query_params.get("facultad_id")
        formato = request.query_params.get("formato", "json")

        ahora = timezone.now()

        inicio_semana = ahora - timedelta(days=ahora.weekday())

        inicio_semana = inicio_semana.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        # ==================================================
        # REPORTE DE RECOMPENSAS CANJEADAS
        # ==================================================
        if tipo == "Recompensas canjeadas":

            canjes = CanjeRecompensa.objects.select_related(
                "estudiante",
                "estudiante__perfil",
                "estudiante__perfil__facultad_relacionada",
                "estudiante__perfil__carrera_relacionada",
                "recompensa",
            ).all()

            # Filtrar por período
            if periodo == "Esta semana":
                desde = ahora - timedelta(days=ahora.weekday())
                canjes = canjes.filter(
                    fecha_canje__gte=desde.replace(
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    )
                )

            elif periodo == "Este mes":
                canjes = canjes.filter(
                    fecha_canje__year=ahora.year,
                    fecha_canje__month=ahora.month,
                )

            elif periodo == "Este semestre":
                mes_inicio = 1 if ahora.month <= 6 else 7
                canjes = canjes.filter(
                    fecha_canje__year=ahora.year,
                    fecha_canje__month__gte=mes_inicio,
                    fecha_canje__month__lte=mes_inicio + 5,
                )

            # Filtrar por facultad
            if facultad_id:
                canjes = canjes.filter(
                    estudiante__perfil__facultad_relacionada_id=facultad_id
                )

            canjes = canjes.order_by("-fecha_canje")

            resumen_canjes = canjes.aggregate(
                total_canjes=Count("id"),
                ecucoins_utilizados=Sum("costo_ecucoins"),
            )

            recompensas = canjes.values(
                "recompensa__nombre"
            ).annotate(
                total_canjes=Count("id"),
                ecucoins=Sum("costo_ecucoins"),
            ).order_by("-total_canjes")

            detalle_canjes = []

            for canje in canjes:
                usuario = canje.estudiante
                perfil = getattr(usuario, "perfil", None)

                detalle_canjes.append({
                    "fecha": canje.fecha_canje.isoformat(),
                    "estudiante": (
                        usuario.get_full_name()
                        or usuario.get_username()
                    ),
                    "facultad": (
                        perfil.facultad_relacionada.nombre
                        if perfil and perfil.facultad_relacionada
                        else "Sin facultad"
                    ),
                    "carrera": (
                        perfil.carrera_relacionada.nombre
                        if perfil and perfil.carrera_relacionada
                        else "Sin carrera"
                    ),
                    "recompensa": canje.recompensa.nombre,
                    "ecucoins": canje.costo_ecucoins,
                })

            return responder_reporte(request, {
                "tipo": tipo,
                "periodo": periodo,
                "resumen": {
                    "total_canjes": resumen_canjes["total_canjes"] or 0,
                    "ecucoins_utilizados": (
                        resumen_canjes["ecucoins_utilizados"] or 0
                    ),
                },
                "recompensas": [
                    {
                        "recompensa": item["recompensa__nombre"],
                        "total_canjes": item["total_canjes"],
                        "ecucoins": item["ecucoins"] or 0,
                    }
                    for item in recompensas
                ],
                "detalle": detalle_canjes,
            })

        # ==================================================
        # REPORTE DE RETOS COMPLETADOS
        # ==================================================

        if tipo == "Insignias obtenidas":
            perfiles = PerfilEstudiante.objects.select_related(
                "usuario",
                "facultad_relacionada",
                "carrera_relacionada",
            )

            # Filtrar por facultad
            if facultad_id:
                perfiles = perfiles.filter(
                    facultad_relacionada_id=facultad_id
                )

            insignias = Insignia.objects.filter(activo=True).order_by(
                "puntos_requeridos"
            )

            detalle = []
            resumen_insignias = {}

            estudiantes_con_insignias = set()

            for perfil in perfiles:
                for insignia in insignias:
                    if perfil.puntos >= insignia.puntos_requeridos:
                        estudiantes_con_insignias.add(perfil.usuario_id)

                        detalle.append({
                            "estudiante": perfil.usuario.username,
                            "facultad": (
                                perfil.facultad_relacionada.nombre
                                if perfil.facultad_relacionada
                                else "Sin facultad"
                            ),
                            "carrera": (
                                perfil.carrera_relacionada.nombre
                                if perfil.carrera_relacionada
                                else "Sin carrera"
                            ),
                            "insignia": insignia.nombre,
                            "puntos_estudiante": perfil.puntos,
                            "puntos_requeridos": insignia.puntos_requeridos,
                        })

                        if insignia.nombre not in resumen_insignias:
                            resumen_insignias[insignia.nombre] = {
                                "insignia": insignia.nombre,
                                "puntos_requeridos": insignia.puntos_requeridos,
                                "estudiantes": 0,
                            }

                        resumen_insignias[insignia.nombre]["estudiantes"] += 1

            return responder_reporte(request, {
                "tipo": tipo,
                "periodo": "Estado actual",
                "nota": (
                    "Se muestran las insignias que los estudiantes "
                    "cumplen actualmente según sus puntos acumulados. "
                    "No representa un historial de obtenciones."
                ),
                "resumen": {
                    "total_insignias": len(resumen_insignias),
                    "total_estudiantes": len(estudiantes_con_insignias),
                    "total_insignias_alcanzadas": len(detalle),
                },
                "insignias": list(resumen_insignias.values()),
                "detalle": detalle,
            })

        if tipo == "Facultades":
            registros = RegistroReciclaje.objects.select_related(
                "estudiante",
                "estudiante__perfil",
                "estudiante__perfil__facultad_relacionada",
                "estudiante__perfil__carrera_relacionada",
            ).filter(
                estudiante__perfil__facultad_relacionada__isnull=False
            )

            # Filtrar por período
            if periodo == "Esta semana":
                registros = registros.filter(fecha_registro__gte=inicio_semana)

            elif periodo == "Este mes":
                registros = registros.filter(
                    fecha_registro__year=ahora.year,
                    fecha_registro__month=ahora.month,
                )

            elif periodo == "Este semestre":
                registros = registros.filter(
                    fecha_registro__year=ahora.year,
                    fecha_registro__month__gte=1 if ahora.month <= 6 else 7,
                    fecha_registro__month__lte=6 if ahora.month <= 6 else 12,
                )

            # Filtrar por facultad
            if facultad_id:
                registros = registros.filter(
                    estudiante__perfil__facultad_relacionada_id=facultad_id
                )

            facultades = registros.values(
                "estudiante__perfil__facultad_relacionada_id",
                "estudiante__perfil__facultad_relacionada__nombre",
            ).annotate(
                total_carreras=Count(
                    "estudiante__perfil__carrera_relacionada",
                    distinct=True,
                ),
                total_estudiantes=Count("estudiante_id", distinct=True),
                total_reciclajes=Count("id"),
                puntos=Sum("puntos_otorgados"),
            ).order_by("-puntos")

            resumen = registros.aggregate(
                total_facultades=Count(
                    "estudiante__perfil__facultad_relacionada",
                    distinct=True,
                ),
                total_estudiantes=Count("estudiante_id", distinct=True),
                total_reciclajes=Count("id"),
                total_puntos=Sum("puntos_otorgados"),
            )

            return responder_reporte(request, {
                "tipo": tipo,
                "periodo": periodo,
                "resumen": {
                    "total_facultades": resumen["total_facultades"] or 0,
                    "total_estudiantes": resumen["total_estudiantes"] or 0,
                    "total_reciclajes": resumen["total_reciclajes"] or 0,
                    "total_puntos": resumen["total_puntos"] or 0,
                },
                "facultades": [
                    {
                        "facultad": item[
                            "estudiante__perfil__facultad_relacionada__nombre"
                        ],
                        "total_carreras": item["total_carreras"],
                        "total_estudiantes": item["total_estudiantes"],
                        "total_reciclajes": item["total_reciclajes"],
                        "puntos": item["puntos"] or 0,
                    }
                    for item in facultades
                ],
            })

        if tipo == "Carreras":
            registros = RegistroReciclaje.objects.select_related(
                "estudiante",
                "estudiante__perfil",
                "estudiante__perfil__facultad_relacionada",
                "estudiante__perfil__carrera_relacionada",
            ).filter(
                estudiante__perfil__carrera_relacionada__isnull=False
            )

            # Filtrar por período
            if periodo == "Esta semana":
                registros = registros.filter(fecha_registro__gte=inicio_semana)

            elif periodo == "Este mes":
                registros = registros.filter(
                    fecha_registro__year=ahora.year,
                    fecha_registro__month=ahora.month,
                )

            elif periodo == "Este semestre":
                registros = registros.filter(
                    fecha_registro__year=ahora.year,
                    fecha_registro__month__gte=1 if ahora.month <= 6 else 7,
                    fecha_registro__month__lte=6 if ahora.month <= 6 else 12,
                )

            # Filtrar por facultad
            if facultad_id:
                registros = registros.filter(
                    estudiante__perfil__facultad_relacionada_id=facultad_id
                )

            carreras = registros.values(
                "estudiante__perfil__carrera_relacionada_id",
                "estudiante__perfil__carrera_relacionada__nombre",
                "estudiante__perfil__facultad_relacionada__nombre",
            ).annotate(
                total_estudiantes=Count("estudiante_id", distinct=True),
                total_reciclajes=Count("id"),
                puntos=Sum("puntos_otorgados"),
            ).order_by("-puntos")

            resumen = registros.aggregate(
                total_carreras=Count(
                    "estudiante__perfil__carrera_relacionada",
                    distinct=True,
                ),
                total_estudiantes=Count("estudiante_id", distinct=True),
                total_reciclajes=Count("id"),
                total_puntos=Sum("puntos_otorgados"),
            )

            return responder_reporte(request, {
                "tipo": tipo,
                "periodo": periodo,
                "resumen": {
                    "total_carreras": resumen["total_carreras"] or 0,
                    "total_estudiantes": resumen["total_estudiantes"] or 0,
                    "total_reciclajes": resumen["total_reciclajes"] or 0,
                    "total_puntos": resumen["total_puntos"] or 0,
                },
                "carreras": [
                    {
                        "carrera": item[
                            "estudiante__perfil__carrera_relacionada__nombre"
                        ],
                        "facultad": item[
                            "estudiante__perfil__facultad_relacionada__nombre"
                        ] or "Sin facultad",
                        "total_estudiantes": item["total_estudiantes"],
                        "total_reciclajes": item["total_reciclajes"],
                        "puntos": item["puntos"] or 0,
                    }
                    for item in carreras
                ],
            })

        if tipo == "Participación de usuarios":
            registros = RegistroReciclaje.objects.select_related(
                "estudiante",
                "estudiante__perfil",
                "estudiante__perfil__facultad_relacionada",
                "estudiante__perfil__carrera_relacionada",
            )

            # Filtrar por período
            if periodo == "Esta semana":
                registros = registros.filter(fecha_registro__gte=inicio_semana)

            elif periodo == "Este mes":
                registros = registros.filter(
                    fecha_registro__year=ahora.year,
                    fecha_registro__month=ahora.month,
                )

            elif periodo == "Este semestre":
                registros = registros.filter(
                    fecha_registro__year=ahora.year,
                    fecha_registro__month__gte=1 if ahora.month <= 6 else 7,
                    fecha_registro__month__lte=6 if ahora.month <= 6 else 12,
                )

            # Filtrar por facultad
            if facultad_id:
                registros = registros.filter(
                    estudiante__perfil__facultad_relacionada_id=facultad_id
                )

            resumen = registros.aggregate(
                total_actividades=Count("id"),
                total_estudiantes=Count("estudiante_id", distinct=True),
                total_puntos=Sum("puntos_otorgados"),
            )

            participantes = registros.values(
                "estudiante_id",
                "estudiante__username",
                "estudiante__perfil__facultad_relacionada__nombre",
                "estudiante__perfil__carrera_relacionada__nombre",
            ).annotate(
                actividades=Count("id"),
                puntos=Sum("puntos_otorgados"),
            ).order_by("-actividades")

            detalle = [
                {
                    "estudiante": item["estudiante__username"],
                    "facultad": item[
                        "estudiante__perfil__facultad_relacionada__nombre"
                    ] or "Sin facultad",
                    "carrera": item[
                        "estudiante__perfil__carrera_relacionada__nombre"
                    ] or "Sin carrera",
                    "actividades": item["actividades"],
                    "puntos": item["puntos"] or 0,
                }
                for item in participantes
            ]

            return responder_reporte(request, {
                "tipo": tipo,
                "periodo": periodo,
                "resumen": {
                    "total_estudiantes": resumen["total_estudiantes"] or 0,
                    "total_actividades": resumen["total_actividades"] or 0,
                    "total_puntos": resumen["total_puntos"] or 0,
                },
                "detalle": detalle,
            })

        if tipo == "Puntos obtenidos":
            registros = RegistroReciclaje.objects.select_related(
                "estudiante",
                "estudiante__perfil",
                "estudiante__perfil__facultad_relacionada",
                "estudiante__perfil__carrera_relacionada",
            )

            # Filtrar por período
            if periodo == "Esta semana":
                registros = registros.filter(fecha_registro__gte=inicio_semana)

            elif periodo == "Este mes":
                registros = registros.filter(
                    fecha_registro__year=ahora.year,
                    fecha_registro__month=ahora.month,
                )

            elif periodo == "Este semestre":
                registros = registros.filter(
                    fecha_registro__year=ahora.year,
                    fecha_registro__month__gte=1 if ahora.month <= 6 else 7,
                    fecha_registro__month__lte=6 if ahora.month <= 6 else 12,
                )

            # Filtrar por facultad
            if facultad_id:
                registros = registros.filter(
                    estudiante__perfil__facultad_relacionada_id=facultad_id
                )

            resumen = registros.aggregate(
                total_puntos=Sum("puntos_otorgados"),
                total_reciclajes=Count("id"),
            )

            carreras = registros.values(
                "estudiante__perfil__carrera_relacionada__nombre"
            ).annotate(
                puntos=Sum("puntos_otorgados"),
                reciclajes=Count("id"),
            ).order_by("-puntos")

            detalle = []

            for registro in registros.order_by("-fecha_registro"):
                perfil = getattr(registro.estudiante, "perfil", None)

                detalle.append({
                    "fecha": registro.fecha_registro,
                    "estudiante": registro.estudiante.username,
                    "facultad": (
                        perfil.facultad_relacionada.nombre
                        if perfil and perfil.facultad_relacionada
                        else "Sin facultad"
                    ),
                    "carrera": (
                        perfil.carrera_relacionada.nombre
                        if perfil and perfil.carrera_relacionada
                        else "Sin carrera"
                    ),
                    "puntos": registro.puntos_otorgados,
                })

            return responder_reporte(request, {
                "tipo": tipo,
                "periodo": periodo,
                "resumen": {
                    "total_puntos": resumen["total_puntos"] or 0,
                    "total_reciclajes": resumen["total_reciclajes"] or 0,
                },
                "carreras": [
                    {
                        "carrera": item["estudiante__perfil__carrera_relacionada__nombre"] or "Sin carrera",
                        "puntos": item["puntos"],
                        "reciclajes": item["reciclajes"],
                    }
                    for item in carreras
                ],
                "detalle": detalle,
            })


        if tipo == "Retos completados":

            participaciones = ParticipacionReto.objects.select_related(
                "estudiante",
                "estudiante__perfil",
                "estudiante__perfil__facultad_relacionada",
                "estudiante__perfil__carrera_relacionada",
                "reto",
            ).filter(
                fecha_completado__isnull=False
            )

            # Filtrar por período
            if periodo == "Esta semana":
                desde = ahora - timedelta(days=ahora.weekday())
                participaciones = participaciones.filter(
                    fecha_completado__gte=desde.replace(
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    )
                )

            elif periodo == "Este mes":
                participaciones = participaciones.filter(
                    fecha_completado__year=ahora.year,
                    fecha_completado__month=ahora.month,
                )

            elif periodo == "Este semestre":
                mes_inicio = 1 if ahora.month <= 6 else 7
                participaciones = participaciones.filter(
                    fecha_completado__year=ahora.year,
                    fecha_completado__month__gte=mes_inicio,
                    fecha_completado__month__lte=mes_inicio + 5,
                )

            # Filtrar por facultad
            if facultad_id:
                participaciones = participaciones.filter(
                    estudiante__perfil__facultad_relacionada_id=facultad_id
                )

            participaciones = participaciones.order_by(
                "-fecha_completado"
            )

            resumen_retos = participaciones.aggregate(
                total_completados=Count("id"),
                total_estudiantes=Count("estudiante", distinct=True),
            )

            retos = participaciones.values(
                "reto__titulo"
            ).annotate(
                completados=Count("id"),
                estudiantes=Count("estudiante", distinct=True),
            ).order_by("-completados")

            detalle_retos = []

            for participacion in participaciones:
                usuario = participacion.estudiante
                perfil = getattr(usuario, "perfil", None)

                detalle_retos.append({
                    "fecha": participacion.fecha_completado.isoformat(),
                    "estudiante": (
                        usuario.get_full_name()
                        or usuario.get_username()
                    ),
                    "facultad": (
                        perfil.facultad_relacionada.nombre
                        if perfil and perfil.facultad_relacionada
                        else "Sin facultad"
                    ),
                    "carrera": (
                        perfil.carrera_relacionada.nombre
                        if perfil and perfil.carrera_relacionada
                        else "Sin carrera"
                    ),
                    "reto": participacion.reto.titulo,
                    "progreso": participacion.progreso,
                })

            return responder_reporte(request, {
                "tipo": tipo,
                "periodo": periodo,
                "resumen": {
                    "total_completados": (
                        resumen_retos["total_completados"] or 0
                    ),
                    "total_estudiantes": (
                        resumen_retos["total_estudiantes"] or 0
                    ),
                },
                "retos": [
                    {
                        "reto": item["reto__titulo"],
                        "completados": item["completados"],
                        "estudiantes": item["estudiantes"],
                    }
                    for item in retos
                ],
                "detalle": detalle_retos,
            })

        # ==================================================
        # REPORTE GENERAL DE RECICLAJES
        # ==================================================

        # Consultar registros reales
        registros = RegistroReciclaje.objects.select_related(
            "estudiante",
            "estudiante__perfil",
            "estudiante__perfil__facultad_relacionada",
            "estudiante__perfil__carrera_relacionada",
            "tipo_residuo",
            "punto_reciclaje",
        ).all()

        # Filtrar por período
        if periodo == "Esta semana":
            desde = ahora - timedelta(days=ahora.weekday())
            registros = registros.filter(
                fecha_registro__gte=desde.replace(
                    hour=0,
                    minute=0,
                    second=0,
                    microsecond=0,
                )
            )

        elif periodo == "Este mes":
            registros = registros.filter(
                fecha_registro__year=ahora.year,
                fecha_registro__month=ahora.month,
            )

        elif periodo == "Este semestre":
            mes_inicio = 1 if ahora.month <= 6 else 7
            registros = registros.filter(
                fecha_registro__year=ahora.year,
                fecha_registro__month__gte=mes_inicio,
                fecha_registro__month__lte=mes_inicio + 5,
            )

        # Filtrar por facultad
        if facultad_id:
            registros = registros.filter(
                estudiante__perfil__facultad_relacionada_id=facultad_id
            )

        registros = registros.order_by("-fecha_registro")

        # Indicadores generales
        resumen = registros.aggregate(
            total_reciclajes=Count("id"),
            puntos_generados=Sum("puntos_otorgados"),
            cantidad_reciclada=Sum("cantidad"),
        )

        # Agrupar por tipo de residuo
        materiales = list(
            registros.values("tipo_residuo__nombre")
            .annotate(
                reciclajes=Count("id"),
                puntos=Sum("puntos_otorgados"),
                cantidad=Sum("cantidad"),
            )
            .order_by("-reciclajes")
        )

        # Detalle de los registros
        detalle = []

        for registro in registros:
            usuario = registro.estudiante
            perfil = getattr(usuario, "perfil", None)

            detalle.append({
                "fecha": registro.fecha_registro.isoformat(),
                "estudiante": (
                    usuario.get_full_name()
                    or usuario.get_username()
                ),
                "facultad": (
                    perfil.facultad_relacionada.nombre
                    if perfil and perfil.facultad_relacionada
                    else "Sin facultad"
                ),
                "carrera": (
                    perfil.carrera_relacionada.nombre
                    if perfil and perfil.carrera_relacionada
                    else "Sin carrera"
                ),
                "material": registro.tipo_residuo.nombre,
                "cantidad": float(registro.cantidad),
                "puntos": registro.puntos_otorgados,
                "punto_reciclaje": registro.punto_reciclaje.nombre,
            })

        return responder_reporte(request, {
            "tipo": tipo,
            "periodo": periodo,
            "resumen": {
                "total_reciclajes": resumen["total_reciclajes"] or 0,
                "puntos_generados": resumen["puntos_generados"] or 0,
                "cantidad_reciclada": float(
                    resumen["cantidad_reciclada"] or 0
                ),
            },
            "materiales": [
                {
                    "material": item["tipo_residuo__nombre"],
                    "reciclajes": item["reciclajes"],
                    "puntos": item["puntos"] or 0,
                    "cantidad": float(item["cantidad"] or 0),
                }
                for item in materiales
            ],
            "detalle": detalle,
        })


class AdminConfiguracionAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        configuracion, creado = ConfiguracionSistema.objects.get_or_create(
            id=1,
            defaults={"puntos_por_ecucoin": 5},
        )

        return Response({
            "puntos_por_ecucoin": configuracion.puntos_por_ecucoin,
        })

    def patch(self, request):
        configuracion, creado = ConfiguracionSistema.objects.get_or_create(
            id=1,
            defaults={"puntos_por_ecucoin": 5},
        )

        puntos = request.data.get("puntos_por_ecucoin")

        if puntos is None:
            return Response(
                {"error": "Debes indicar los puntos por EcuCoin."},
                status=400,
            )

        try:
            puntos = int(puntos)
        except (TypeError, ValueError):
            return Response(
                {"error": "El valor debe ser un número entero."},
                status=400,
            )

        if puntos < 1 or puntos > 10000:
            return Response(
                {"error": "El valor debe estar entre 1 y 10000."},
                status=400,
            )

        configuracion.puntos_por_ecucoin = puntos
        configuracion.save()

        return Response({
            "mensaje": "Conversión actualizada correctamente.",
            "puntos_por_ecucoin": configuracion.puntos_por_ecucoin,
        })



class NotificacionesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notificaciones = Notificacion.objects.filter(
            usuario=request.user
        ).order_by("-fecha_creacion")

        datos = [
            {
                "id": n.id,
                "titulo": n.titulo,
                "mensaje": n.mensaje,
                "tipo": n.tipo,
                "leida": n.leida,
                "fecha_creacion": n.fecha_creacion,
            }
            for n in notificaciones
        ]

        return Response({
            "notificaciones": datos,
            "no_leidas": notificaciones.filter(leida=False).count(),
        })

    def patch(self, request):
        if request.data.get("marcar_todas"):
            Notificacion.objects.filter(
                usuario=request.user,
                leida=False
            ).update(leida=True)

            return Response({
                "mensaje": "Todas las notificaciones fueron marcadas como leídas."
            })

        notificacion_id = request.data.get("id")

        if not notificacion_id:
            return Response(
                {"error": "Debes indicar el ID de la notificación."},
                status=400
            )

        notificacion = Notificacion.objects.filter(
            id=notificacion_id,
            usuario=request.user
        ).first()

        if notificacion is None:
            return Response(
                {"error": "Notificación no encontrada."},
                status=404
            )

        notificacion.leida = True
        notificacion.save(update_fields=["leida"])

        return Response({
            "mensaje": "Notificación marcada como leída."
        })

    def delete(self, request):
        eliminadas, _ = Notificacion.objects.filter(
            usuario=request.user
        ).delete()

        return Response({
            "mensaje": "Notificaciones eliminadas correctamente.",
            "eliminadas": eliminadas
        })



class MisInsigniasAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            InsigniaObtenida.objects
            .filter(estudiante__usuario=self.request.user)
            .select_related("insignia")
            .order_by("-fecha_obtencion")
        )

    def list(self, request, *args, **kwargs):
        insignias = self.get_queryset()

        resultado = [
            {
                "id": registro.id,
                "nombre": registro.insignia.nombre,
                "descripcion": registro.insignia.descripcion,
                "imagen": (
                    registro.insignia.imagen.url
                    if registro.insignia.imagen
                    else None
                ),
                "fecha_obtencion": registro.fecha_obtencion,
                "puntos_requeridos": registro.insignia.puntos_requeridos,
            }
            for registro in insignias
        ]

        return Response(resultado)



class InsigniasDisponiblesAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Insignia.objects.filter(activo=True).order_by("id")

    def list(self, request, *args, **kwargs):
        insignias = self.get_queryset()

        resultado = [
            {
                "id": insignia.id,
                "nombre": insignia.nombre,
                "descripcion": insignia.descripcion,
                "imagen": (
                    insignia.imagen.url
                    if insignia.imagen
                    else None
                ),
                "puntos_requeridos": insignia.puntos_requeridos,
            }
            for insignia in insignias
        ]

        return Response(resultado)




class RecompensasDisponiblesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        print("USUARIO AUTENTICADO:", request.user)
        print("ID DEL USUARIO:", request.user.id)
        perfil = PerfilEstudiante.objects.filter(
            usuario_id=request.user.id
        ).first()

        print("PERFIL ENCONTRADO:", perfil)
        recompensas = Recompensa.objects.filter(
            activa=True
        ).order_by("costo_ecucoins", "nombre")

        serializer = AdminRecompensaSerializer(
            recompensas,
            many=True,
            context={"request": request}
        )

        return Response(serializer.data)



class CanjearRecompensaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        recompensa_id = request.data.get("recompensa_id")

        if not recompensa_id:
            return Response(
                {"error": "Debes seleccionar una recompensa."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            perfil = get_object_or_404(
                PerfilEstudiante.objects.select_for_update(),
                usuario=request.user
            )

            recompensa = get_object_or_404(
                Recompensa.objects.select_for_update(),
                id=recompensa_id,
                activa=True
            )

            if recompensa.cantidad_disponible <= 0:
                return Response(
                    {"error": "Esta recompensa ya no está disponible."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            configuracion = ConfiguracionSistema.objects.first()
            puntos_por_ecucoin = (
                configuracion.puntos_por_ecucoin
                if configuracion else 5
            )

            total_ecucoins = perfil.puntos // puntos_por_ecucoin

            gastado = CanjeRecompensa.objects.filter(
                estudiante=request.user
            ).aggregate(total=Sum("costo_ecucoins"))["total"] or 0

            saldo = total_ecucoins - gastado

            if saldo < recompensa.costo_ecucoins:
                return Response(
                    {"error": "No tienes suficientes EcuCoins."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            canje = CanjeRecompensa.objects.create(
                estudiante=request.user,
                recompensa=recompensa,
                costo_ecucoins=recompensa.costo_ecucoins,
                nombre_recompensa=recompensa.nombre,
                descripcion_recompensa=recompensa.descripcion
            )

            recompensa.cantidad_disponible -= 1
            recompensa.save(update_fields=["cantidad_disponible"])

        return Response({
            "mensaje": "Recompensa canjeada correctamente.",
            "saldo_restante": saldo - recompensa.costo_ecucoins,
            "voucher": {
                "id": canje.id,
                "codigo": str(canje.codigo),
                "nombre": canje.nombre_recompensa,
                "descripcion": canje.descripcion_recompensa,
                "costo_ecucoins": canje.costo_ecucoins,
                "fecha_canje": canje.fecha_canje
            }
        }, status=status.HTTP_201_CREATED)



class MisRecompensasAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        canjes = CanjeRecompensa.objects.filter(
            estudiante=request.user
        ).select_related("recompensa").order_by("-fecha_canje")

        resultados = []

        for canje in canjes:
            resultados.append({
                "id": canje.id,
                "codigo": str(canje.codigo),
                "recompensa_id": canje.recompensa.id,
                "nombre": canje.nombre_recompensa,
                "descripcion": canje.descripcion_recompensa,
                "costo_ecucoins": canje.costo_ecucoins,
                "fecha_canje": canje.fecha_canje,
                "estado": canje.estado,
            })

        return Response(resultados, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        estado = request.data.get("estado")

        if estado not in ["pendiente", "utilizada"]:
            return Response(
                {"error": "Estado no válido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        canje = get_object_or_404(
            CanjeRecompensa,
            id=pk,
            estudiante=request.user
        )

        canje.estado = estado
        canje.save(update_fields=["estado"])

        return Response({
            "mensaje": "Estado actualizado correctamente.",
            "id": canje.id,
            "estado": canje.estado
        }, status=status.HTTP_200_OK)



class NivelesReciclajeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        niveles = NivelReciclaje.objects.filter(activo=True)

        serializer = NivelReciclajeSerializer(
            niveles,
            many=True
        )

        return Response(serializer.data)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def detectar_residuo(request):
    imagen_base64 = request.data.get("imagen")

    if not imagen_base64:
        return Response(
            {"error": "No se recibió ninguna imagen"},
            status=400
        )

    try:
        if "," in imagen_base64:
            imagen_base64 = imagen_base64.split(",", 1)[1]

        imagen_bytes = base64.b64decode(imagen_base64)

        matriz = np.frombuffer(imagen_bytes, np.uint8)
        imagen = cv2.imdecode(matriz, cv2.IMREAD_COLOR)

        if imagen is None:
            return Response(
                {"error": "Imagen no válida"},
                status=400
            )

        detecciones = detectar_residuos(imagen)

        return Response({
            "correcto": True,
            "detecciones": detecciones
        })

    except Exception as error:
        return Response(
            {"error": str(error)},
            status=500
        )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def validar_qr_estudiante(request):
    codigo_qr = request.data.get("codigo_qr")

    if not codigo_qr:
        return Response(
            {"correcto": False, "error": "No se recibió el código QR"},
            status=400
        )

    perfil = PerfilEstudiante.objects.select_related("usuario").filter(
        codigo_qr=codigo_qr
    ).first()

    if not perfil:
        return Response(
            {"correcto": False, "error": "El estudiante no está registrado"},
            status=404
        )

    nombre = perfil.usuario.get_full_name().strip() or perfil.usuario.username

    return Response({
        "correcto": True,
        "estudiante": {
            "nombre": nombre,
            "facultad": str(perfil.facultad_relacionada) if perfil.facultad_relacionada else "Sin facultad",
            "carrera": str(perfil.carrera_relacionada) if perfil.carrera_relacionada else "Sin carrera"
        }
    })