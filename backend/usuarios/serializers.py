import os
from rest_framework import serializers
from django.db.models import Sum
from .models import (
    PerfilEstudiante,
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
    Carrera,
    Facultad,
)

class PerfilEstudianteSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(
        source="usuario.username",
        read_only=True
    )

    correo = serializers.EmailField(
        source="usuario.email",
        read_only=True
    )

    facultad = serializers.CharField(
        source="facultad_relacionada.nombre",
        read_only=True
    )

    carrera = serializers.CharField(
        source="carrera_relacionada.nombre",
        read_only=True
    )

    ecucoins = serializers.SerializerMethodField()

    class Meta:
        model = PerfilEstudiante
        fields = [
            "usuario",
            "correo",
            "identificacion",
            "facultad",
            "carrera",
            "semestre",
            "puntos",
            "ecucoins",
            "fecha_registro",
        ]
        read_only_fields = fields

    def get_ecucoins(self, obj):
        configuracion = ConfiguracionSistema.objects.first()

        puntos_por_ecucoin = (
            configuracion.puntos_por_ecucoin
            if configuracion else 5
        )

        acumulados = obj.puntos // puntos_por_ecucoin

        gastados = CanjeRecompensa.objects.filter(
            estudiante=obj.usuario
        ).aggregate(
            total=Sum("costo_ecucoins")
        )["total"] or 0

        return acumulados - gastados


class TipoResiduoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoResiduo
        fields = ["id", "nombre", "descripcion", "activo"]
        read_only_fields = fields


class PuntoReciclajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PuntoReciclaje
        fields = ["id", "nombre", "ubicacion", "activo"]
        read_only_fields = fields


class DeteccionResiduoSerializer(serializers.ModelSerializer):
    tipo_residuo_nombre = serializers.CharField(
        source="tipo_residuo.nombre",
        read_only=True,
    )

    class Meta:
        model = DeteccionResiduo
        fields = [
            "id",
            "tipo_residuo",
            "tipo_residuo_nombre",
            "confianza",
            "fecha_deteccion",
            "estado_validacion",
        ]
        read_only_fields = fields


class RegistroReciclajeSerializer(serializers.ModelSerializer):
    tipo_residuo_nombre = serializers.CharField(
        source="tipo_residuo.nombre",
        read_only=True,
    )
    punto_reciclaje_nombre = serializers.CharField(
        source="punto_reciclaje.nombre",
        read_only=True,
    )

    class Meta:
        model = RegistroReciclaje
        fields = [
            "id",
            "tipo_residuo_nombre",
            "punto_reciclaje_nombre",
            "cantidad",
            "puntos_otorgados",
            "fecha_registro",
        ]
        read_only_fields = fields

class RankingEstudianteSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(
        source="usuario.username",
        read_only=True
    )

    facultad = serializers.CharField(
        source="facultad_relacionada.nombre",
        read_only=True,
        allow_null=True
    )

    carrera = serializers.CharField(
        source="carrera_relacionada.nombre",
        read_only=True,
        allow_null=True
    )

    posicion = serializers.SerializerMethodField()
    ecucoins = serializers.SerializerMethodField()

    class Meta:
        model = PerfilEstudiante
        fields = [
            "posicion",
            "usuario",
            "facultad",
            "carrera",
            "puntos",
            "ecucoins",
        ]

    def get_posicion(self, obj):
        return getattr(obj, "posicion_ranking", 0)

    def get_ecucoins(self, obj):
        return obj.puntos // 5



class NivelReciclajeSerializer(serializers.ModelSerializer):
    imagen = serializers.SerializerMethodField()

    class Meta:
        model = NivelReciclaje
        fields = [
            "nombre",
            "descripcion",
            "puntos_minimos",
            "imagen",
        ]

    def get_imagen(self, obj):
        if not obj.imagen:
            return None

        storage_url = os.environ.get("SUPABASE_STORAGE_URL")

        if storage_url:
            return (
                f"{storage_url.rstrip('/')}"
                f"/niveles/{obj.imagen.name}"
            )

        return obj.imagen.url


class InsigniaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insignia
        fields = [
            "nombre",
            "descripcion",
            "puntos_requeridos",
            "imagen",
        ]


class AdminRecompensaSerializer(serializers.ModelSerializer):
    canjes_realizados = serializers.SerializerMethodField()

    def get_canjes_realizados(self, obj):
        return obj.canjes.count()

    class Meta:
        model = Recompensa
        fields = [
            "id",
            "nombre",
            "descripcion",
            "costo_ecucoins",
            "cantidad_disponible",
            "imagen",
            "activa",
            "canjes_realizados",
            "fecha_creacion",
        ]


class AdminCanjeRecompensaSerializer(serializers.ModelSerializer):
    estudiante = serializers.CharField(
        source="estudiante.username",
        read_only=True
    )
    recompensa = serializers.CharField(
        source="recompensa.nombre",
        read_only=True
    )

    class Meta:
        model = CanjeRecompensa
        fields = [
            "id",
            "estudiante",
            "recompensa",
            "costo_ecucoins",
            "fecha_canje",
        ]


class AdminInsigniaSerializer(serializers.ModelSerializer):
    obtenidas = serializers.SerializerMethodField()

    class Meta:
        model = Insignia
        fields = [
            "id",
            "nombre",
            "descripcion",
            "puntos_requeridos",
            "imagen",
            "activo",
            "obtenidas",
        ]

    def get_obtenidas(self, obj):
        return 0


class AdminRetoSerializer(serializers.ModelSerializer):
    participantes = serializers.SerializerMethodField()
    completados = serializers.SerializerMethodField()

    carrera = serializers.PrimaryKeyRelatedField(
        queryset=Carrera.objects.all(),
        required=False,
        allow_null=True
    )

    facultad = serializers.PrimaryKeyRelatedField(
        queryset=Facultad.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = RetoEcologico
        fields = [
            "id",
            "titulo",
            "descripcion",
            "modalidad",
            "alcance",
            "carrera",
            "facultad",
            "tipo_objetivo",
            "meta",
            "tipo_residuo",
            "recompensa_puntos",
            "fecha_inicio",
            "fecha_fin",
            "estado",
            "destacado",
            "activo",
            "participantes",
            "completados",
        ]

        read_only_fields = [
            "id",
            "participantes",
            "completados",
        ]

    def get_completados(self, obj):
        return obj.participaciones.filter(
            fecha_completado__isnull=False
        ).count()

    def get_participantes(self, obj):
        if obj.modalidad == "GRUPAL":
            return obj.participantes_grupales.count()

        return obj.participaciones.count()