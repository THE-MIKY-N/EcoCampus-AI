from django.urls import path

from .api_views import (
    MiPerfilAPIView,
    TiposResiduoAPIView,
    PuntosReciclajeAPIView,
    MisDeteccionesAPIView,
    MiHistorialAPIView,
    RankingEstudiantesAPIView,
    RetosEcologicosAPIView,
    MisLogrosAPIView,
    obtener_csrf,
    iniciar_sesion_api,
    cerrar_sesion_api,
    estado_sesion_api,
    AdminUsuariosAPIView,
    AdminDashboardAPIView,
    AdminFacultadesAPIView,
    AdminFacultadDetalleAPIView,
    AdminCarrerasAPIView,
    AdminCarreraDetalleAPIView,
    AdminReciclajesAPIView,
    AdminRecompensasAPIView,
    AdminRecompensaDetalleAPIView,
    AdminRetosAPIView,
    AdminRetoDetalleAPIView,
    AdminInsigniasAPIView,
    AdminInsigniaDetalleAPIView,
    AdminReportesAPIView,
    AdminConfiguracionAPIView,
    NotificacionesAPIView,
    MisInsigniasAPIView,
    InsigniasDisponiblesAPIView,
    ParticiparRetoGrupalAPIView,
    RecompensasDisponiblesAPIView,
    CanjearRecompensaAPIView,
    MisRecompensasAPIView,

)

app_name = "api"

urlpatterns = [
    path("csrf/", obtener_csrf, name="csrf"),
    path("login/", iniciar_sesion_api, name="api-login"),
    path("logout/", cerrar_sesion_api, name="api-logout"),
    path("sesion/", estado_sesion_api, name="estado-sesion"),
    path("perfil/", MiPerfilAPIView.as_view(), name="mi-perfil"),
    path("residuos/", TiposResiduoAPIView.as_view(), name="tipos-residuo"),
    path("puntos-reciclaje/", PuntosReciclajeAPIView.as_view(), name="puntos-reciclaje"),
    path("detecciones/", MisDeteccionesAPIView.as_view(), name="mis-detecciones"),
    path("historial/", MiHistorialAPIView.as_view(), name="mi-historial"),
    path("ranking/", RankingEstudiantesAPIView.as_view(), name="ranking",),
    path("mis-logros/", MisLogrosAPIView.as_view(), name="mis-logros"),
    path("retos/", RetosEcologicosAPIView.as_view(), name="retos-ecologicos",),
    path(
        "admin/usuarios/",
        AdminUsuariosAPIView.as_view(),
        name="admin-usuarios",
    ),
    path(
        "admin/dashboard/",
        AdminDashboardAPIView.as_view(),
        name="admin-dashboard",
    ),
    path(
        "admin/facultades/",
        AdminFacultadesAPIView.as_view(),
        name="admin-facultades",
    ),
    path(
        "admin/facultades/<int:pk>/",
        AdminFacultadDetalleAPIView.as_view(),
        name="admin-facultad-detalle",
    ),
    path(
        "admin/carreras/",
        AdminCarrerasAPIView.as_view(),
        name="admin-carreras",
    ),
    path(
        "admin/carreras/<int:pk>/",
        AdminCarreraDetalleAPIView.as_view(),
        name="admin-carrera-detalle",
    ),
    path(
        "admin/reciclajes/",
        AdminReciclajesAPIView.as_view(),
        name="admin-reciclajes",
    ),
    # Administración de recompensas
    path(
        "admin/recompensas/",
        AdminRecompensasAPIView.as_view(),
        name="admin-recompensas"
    ),
    path(
        "admin/recompensas/<int:pk>/",
        AdminRecompensaDetalleAPIView.as_view(),
        name="admin-recompensa-detalle"
    ),

    # Administración de retos
    path(
        "admin/retos/",
        AdminRetosAPIView.as_view(),
        name="admin-retos"
    ),
    path(
        "admin/retos/<int:pk>/",
        AdminRetoDetalleAPIView.as_view(),
        name="admin-reto-detalle"
    ),

    # Administración de insignias
    path(
        "admin/insignias/",
        AdminInsigniasAPIView.as_view(),
        name="admin-insignias"
    ),
    path(
        "admin/insignias/<int:pk>/",
        AdminInsigniaDetalleAPIView.as_view(),
        name="admin-insignia-detalle"
    ),
    path("admin/reportes/",
         AdminReportesAPIView.as_view(),
         name="admin-reportes"),
    path(
        "admin/configuracion/",
        AdminConfiguracionAPIView.as_view(),
        name="admin-configuracion",
    ),
    path(
        "notificaciones/",
        NotificacionesAPIView.as_view(),
        name="notificaciones",
    ),
    path(
        "mis-insignias/",
        MisInsigniasAPIView.as_view(),
        name="mis_insignias",
    ),
    path("insignias-disponibles/", InsigniasDisponiblesAPIView.as_view()),
    path(
        "retos/<int:pk>/participar/",
        ParticiparRetoGrupalAPIView.as_view(),
        name="participar-reto-grupal",
    ),
    # Recompensas del estudiante
    path(
        "recompensas/",
        RecompensasDisponiblesAPIView.as_view(),
        name="recompensas-disponibles",
    ),
    #path(
       # "mis-canjes/",
        #MisCanjesAPIView.as_view(),
        #name="mis-canjes",
   # ),
    #path(
        #"recompensas/<int:pk>/canjear/",
       # CanjearRecompensaAPIView.as_view(),
        #name="canjear-recompensa",
   # ),
    path(
        "recompensas/canjear/",
        CanjearRecompensaAPIView.as_view(),
        name="canjear-recompensa",
    ),
    path("mis-recompensas/", MisRecompensasAPIView.as_view(), name="mis-recompensas"),
    path(
        "mis-recompensas/<int:pk>/",
        MisRecompensasAPIView.as_view(),
        name="actualizar-mis-recompensas"
    ),
]
