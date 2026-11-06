import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q
from usuarios.storage import SupabaseMediaStorage

class Facultad(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    activa = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class Carrera(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    facultad = models.ForeignKey(
        Facultad,
        on_delete=models.PROTECT,
        related_name="carreras"
    )
    activa = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["nombre", "facultad"],
                name="carrera_unica_por_facultad"
            )
        ]

    def __str__(self):
        return self.nombre

class PerfilEstudiante(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil"
    )

    codigo_qr = models.CharField(
        max_length=36,
        unique=True,
        default=uuid.uuid4,
        editable=False
    )

    
    identificacion = models.CharField(
        max_length=10,
        unique=True,
        null=True,
        blank=True
    )

    semestre = models.PositiveSmallIntegerField()

    puntos = models.PositiveIntegerField(default=0)
    puntos_recompensas = models.PositiveIntegerField(default=0)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    facultad_relacionada = models.ForeignKey(
        Facultad,
        on_delete=models.PROTECT,
        related_name="estudiantes",
        null=True,
        blank=True
    )

    carrera_relacionada = models.ForeignKey(
        Carrera,
        on_delete=models.PROTECT,
        related_name="estudiantes",
        null=True,
        blank=True
    )

    def __str__(self):
        return self.usuario.email or self.usuario.username


class TipoResiduo(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class DeteccionResiduo(models.Model):
    class EstadoValidacion(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        VALIDADA = "VALIDADA", "Validada"
        RECHAZADA = "RECHAZADA", "Rechazada"

    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="detecciones_residuos"
    )

    tipo_residuo = models.ForeignKey(
        TipoResiduo,
        on_delete=models.PROTECT,
        related_name="detecciones"
    )

    imagen = models.ImageField(
        upload_to="detecciones/",
        blank=True,
        null=True
    )

    confianza = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        blank=True,
        null=True
    )

    fecha_deteccion = models.DateTimeField(auto_now_add=True)

    estado_validacion = models.CharField(
        max_length=10,
        choices=EstadoValidacion.choices,
        default=EstadoValidacion.PENDIENTE
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(confianza__isnull=True)
                    | (
                        Q(confianza__gte=0)
                        & Q(confianza__lte=1)
                    )
                ),
                name="confianza_entre_0_y_1",
            ),
        ]
    def __str__(self):
        return f"{self.tipo_residuo} - {self.estado_validacion}"


class PuntoReciclaje(models.Model):
    nombre = models.CharField(max_length=150)
    ubicacion = models.CharField(max_length=255)
    codigo_qr = models.CharField(max_length=100, unique=True)
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre


class RegistroReciclaje(models.Model):
    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="registros_reciclaje"
    )

    punto_reciclaje = models.ForeignKey(
        PuntoReciclaje,
        on_delete=models.PROTECT,
        related_name="registros"
    )

    tipo_residuo = models.ForeignKey(
        TipoResiduo,
        on_delete=models.PROTECT,
        related_name="registros_reciclaje"
    )

    deteccion = models.OneToOneField(
        DeteccionResiduo,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="registros_reciclaje"
    )

    cantidad = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=1
    )

    puntos_otorgados = models.PositiveIntegerField(default=0)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(cantidad__gt=0),
                name="cantidad_mayor_que_cero",
            ),
        ]

    def __str__(self):
        return (
            f"{self.estudiante} - "
            f"{self.tipo_residuo} - "
            f"{self.puntos_otorgados} puntos"
        )


class NivelReciclaje(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    puntos_minimos = models.PositiveIntegerField(default=0)
    imagen = models.ImageField(
        upload_to="niveles/",
        blank=True,
        null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["puntos_minimos"]

    def __str__(self):
        return f"{self.nombre} ({self.puntos_minimos} puntos)"


class Insignia(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    puntos_requeridos = models.PositiveIntegerField(default=0)
    imagen = models.ImageField(
        upload_to="insignias/",
        storage=SupabaseMediaStorage(),
        blank=True,
        null=True
    )
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["puntos_requeridos", "nombre"]

    def __str__(self):
        return self.nombre


class InsigniaObtenida(models.Model):
    estudiante = models.ForeignKey(
        PerfilEstudiante,
        on_delete=models.CASCADE,
        related_name="insignias_obtenidas"
    )

    insignia = models.ForeignKey(
        Insignia,
        on_delete=models.CASCADE,
        related_name="estudiantes_que_la_obtuvieron"
    )

    fecha_obtencion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_obtencion"]
        constraints = [
            models.UniqueConstraint(
                fields=["estudiante", "insignia"],
                name="unique_insignia_por_estudiante"
            )
        ]

    def __str__(self):
        return f"{self.estudiante} - {self.insignia.nombre}"


class RetoEcologico(models.Model):

    class Estado(models.TextChoices):
        ACTIVO = "ACTIVO", "Activo"
        PROXIMO = "PROXIMO", "Próximo"
        FINALIZADO = "FINALIZADO", "Finalizado"

    class Modalidad(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        GRUPAL = "GRUPAL", "Grupal"

    class Alcance(models.TextChoices):
        CARRERA = "CARRERA", "Por carrera"
        FACULTAD = "FACULTAD", "Por facultad"

    class TipoObjetivo(models.TextChoices):
        RECICLAJES = "RECICLAJES", "Cantidad de reciclajes"
        PUNTOS = "PUNTOS", "Acumulación de puntos"
        MATERIAL = "MATERIAL", "Material específico"

    titulo = models.CharField(max_length=150)
    descripcion = models.TextField()

    # Configuración del reto
    modalidad = models.CharField(
        max_length=15,
        choices=Modalidad.choices,
        default=Modalidad.INDIVIDUAL
    )

    alcance = models.CharField(
        max_length=10,
        choices=Alcance.choices,
        blank=True,
        null=True
    )

    carrera = models.ForeignKey(
        "Carrera",
        on_delete=models.PROTECT,
        related_name="retos",
        blank=True,
        null=True
    )

    facultad = models.ForeignKey(
        "Facultad",
        on_delete=models.PROTECT,
        related_name="retos",
        blank=True,
        null=True
    )

    tipo_objetivo = models.CharField(
        max_length=15,
        choices=TipoObjetivo.choices,
        default=TipoObjetivo.RECICLAJES
    )

    meta = models.PositiveIntegerField(default=1)

    tipo_residuo = models.ForeignKey(
        "TipoResiduo",
        on_delete=models.PROTECT,
        related_name="retos",
        blank=True,
        null=True
    )

    recompensa_puntos = models.PositiveIntegerField(default=0)

    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    fecha_completado = models.DateTimeField(
        blank=True,
        null=True
    )

    estado = models.CharField(
        max_length=10,
        choices=Estado.choices,
        default=Estado.PROXIMO
    )

    destacado = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha_inicio", "titulo"]

        constraints = [
            models.CheckConstraint(
                condition=(
                        Q(
                            modalidad="INDIVIDUAL",
                            alcance__isnull=True,
                            carrera__isnull=True,
                            facultad__isnull=True,
                        )
                        | Q(
                    modalidad="GRUPAL",
                    alcance="CARRERA",
                    carrera__isnull=True,
                    facultad__isnull=True,
                )
                        | Q(
                    modalidad="GRUPAL",
                    alcance="FACULTAD",
                    carrera__isnull=True,
                    facultad__isnull=True,
                )
                ),
                name="reto_modalidad_alcance_valido",
            ),
            models.CheckConstraint(
                condition=(
                        Q(
                            tipo_objetivo="MATERIAL",
                            tipo_residuo__isnull=False,
                        )
                        | (
                                ~Q(tipo_objetivo="MATERIAL")
                                & Q(tipo_residuo__isnull=True)
                        )
                ),
                name="reto_material_valido",
            ),
            models.CheckConstraint(
                condition=Q(meta__gt=0),
                name="reto_meta_mayor_cero",
            ),
        ]

    def __str__(self):
        return self.titulo



class ParticipacionReto(models.Model):
    reto = models.ForeignKey(
        RetoEcologico,
        on_delete=models.CASCADE,
        related_name="participaciones"
    )
    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="retos_ecologicos"
    )
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_completado = models.DateTimeField(
        blank=True,
        null=True
    )
    progreso = models.PositiveSmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["reto", "estudiante"],
                name="reto_unico_por_estudiante"
            ),
            models.CheckConstraint(
                condition=Q(progreso__lte=100),
                name="progreso_reto_hasta_100"
            ),
        ]

    def __str__(self):
        return f"{self.estudiante} - {self.reto}"



class ParticipacionRetoGrupal(models.Model):
    reto = models.ForeignKey(
        RetoEcologico,
        on_delete=models.CASCADE,
        related_name="participantes_grupales"
    )

    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="participaciones_grupales"
    )

    fecha_participacion = models.DateTimeField(auto_now_add=True)

    recompensa_entregada = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["reto", "estudiante"],
                name="reto_grupal_unico_por_estudiante"
            )
        ]

    def __str__(self):
        return f"{self.estudiante} - {self.reto}"

class ProgresoRetoGrupal(models.Model):
    reto = models.ForeignKey(
        RetoEcologico,
        on_delete=models.CASCADE,
        related_name="progresos_grupales"
    )

    carrera = models.ForeignKey(
        "Carrera",
        on_delete=models.PROTECT,
        related_name="progresos_retos",
        blank=True,
        null=True
    )

    facultad = models.ForeignKey(
        "Facultad",
        on_delete=models.PROTECT,
        related_name="progresos_retos",
        blank=True,
        null=True
    )

    valor_actual = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    fecha_completado = models.DateTimeField(
        blank=True,
        null=True
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(carrera__isnull=False, facultad__isnull=True)
                    | Q(carrera__isnull=True, facultad__isnull=False)
                ),
                name="progreso_reto_un_solo_grupo"
            ),
            models.UniqueConstraint(
                fields=["reto", "carrera"],
                condition=Q(carrera__isnull=False),
                name="progreso_reto_unico_carrera"
            ),
            models.UniqueConstraint(
                fields=["reto", "facultad"],
                condition=Q(facultad__isnull=False),
                name="progreso_reto_unico_facultad"
            ),
        ]

    def __str__(self):
        grupo = self.carrera or self.facultad
        return f"{self.reto.titulo} - {grupo}"


class Recompensa(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    costo_ecucoins = models.PositiveIntegerField()
    cantidad_disponible = models.PositiveIntegerField(default=0)
    imagen = models.ImageField(
        upload_to="recompensas/",
        storage=SupabaseMediaStorage(),
        blank=True,
        null=True
    )
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["costo_ecucoins", "nombre"]
        constraints = [
            models.CheckConstraint(
                condition=Q(costo_ecucoins__gt=0),
                name="recompensa_costo_mayor_cero"
            )
        ]

    def __str__(self):
        return self.nombre


class CanjeRecompensa(models.Model):

    ESTADOS = [
        ("pendiente", "Pendiente de uso"),
        ("utilizada", "Utilizada"),
    ]

    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="canjes_recompensas"
    )

    recompensa = models.ForeignKey(
        Recompensa,
        on_delete=models.PROTECT,
        related_name="canjes"
    )

    costo_ecucoins = models.PositiveIntegerField()
    fecha_canje = models.DateTimeField(auto_now_add=True)

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default="pendiente"
    )

    def __str__(self):
        return f"{self.estudiante} - {self.recompensa}"

    
class ConfiguracionSistema(models.Model):
    puntos_por_ecucoin = models.PositiveIntegerField(default=5)

    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.puntos_por_ecucoin} puntos = 1 EcuCoin"

    class Meta:
        verbose_name = "Configuración del sistema"
        verbose_name_plural = "Configuración del sistema"


class Notificacion(models.Model):

    TIPOS = [
        ("INFO", "Información"),
        ("SUCCESS", "Éxito"),
        ("WARNING", "Advertencia"),
        ("DANGER", "Alerta"),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificaciones"
    )

    titulo = models.CharField(max_length=150)
    mensaje = models.TextField()
    tipo = models.CharField(
        max_length=10,
        choices=TIPOS,
        default="INFO"
    )

    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_creacion"]
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"

    def __str__(self):
        return f"{self.usuario} - {self.titulo}"


