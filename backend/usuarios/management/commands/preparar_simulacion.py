
import random
import uuid

from datetime import timedelta
from decimal import Decimal
from secrets import randbelow

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from usuarios.models import (
    Facultad,
    Carrera,
    PerfilEstudiante,
    TipoResiduo,
    DeteccionResiduo,
    PuntoReciclaje,
    RegistroReciclaje,
    NivelReciclaje,
    Insignia,
    InsigniaObtenida,
    RetoEcologico,
    ParticipacionReto,
    ParticipacionRetoGrupal,
    ProgresoRetoGrupal,
    Recompensa,
    CanjeRecompensa,
    ConfiguracionSistema,
    Notificacion,
)


class Command(BaseCommand):
    help = "Prepara los datos de simulación de EcoCampus AI"

    def generar_cedula_ficticia(self):
        base = "090" + "".join(
            str(randbelow(10)) for _ in range(6)
        )

        total = 0

        for indice, caracter in enumerate(base):
            numero = int(caracter)

            if indice % 2 == 0:
                numero *= 2

                if numero > 9:
                    numero -= 9

            total += numero

        digito = (10 - total % 10) % 10

        return base + str(digito)

    def limpiar_datos(self):
        self.stdout.write("Limpiando datos anteriores...")

        # Primero se eliminan los registros dependientes.
        ProgresoRetoGrupal.objects.all().delete()
        ParticipacionReto.objects.all().delete()
        ParticipacionRetoGrupal.objects.all().delete()
        InsigniaObtenida.objects.all().delete()
        CanjeRecompensa.objects.all().delete()

        RegistroReciclaje.objects.all().delete()
        DeteccionResiduo.objects.all().delete()
        Notificacion.objects.all().delete()

        RetoEcologico.objects.all().delete()
        Recompensa.objects.all().delete()
        Insignia.objects.all().delete()
        NivelReciclaje.objects.all().delete()

        PuntoReciclaje.objects.all().delete()
        TipoResiduo.objects.all().delete()

        ConfiguracionSistema.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS("Datos anteriores eliminados.")
        )

    def preparar_usuarios(self):
        User = get_user_model()

        administradores = User.objects.filter(is_superuser=True)

        if administradores.count() != 1:
            raise CommandError(
                "Se esperaba exactamente una cuenta administradora."
            )

        if User.objects.filter(
            is_staff=True,
            is_superuser=False
        ).exists():
            raise CommandError(
                "Existe una cuenta staff que requiere revisión."
            )

        estudiantes_originales = User.objects.filter(
            is_superuser=False,
            is_staff=False
        )

        if estudiantes_originales.count() not in (2, 9):
            raise CommandError(
                "Se esperaban 2 estudiantes originales o 9 "
                "si la simulación ya fue preparada."
            )

        for i in range(1, 8):
            username = f"estudiante{i:02d}"

            usuario, creado = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"estudiante{i:02d}@ecocampus.test",
                    "first_name": f"Estudiante {i}",
                    "last_name": "EcoCampus",
                    "is_staff": False,
                    "is_superuser": False,
                },
            )

            if creado:
                usuario.set_password("EcoCampus2026*")
                usuario.save()

            elif usuario.is_staff or usuario.is_superuser:
                raise CommandError(
                    f"La cuenta {username} tiene privilegios "
                    "administrativos."
                )

        estudiantes = list(
            User.objects.filter(
                is_superuser=False,
                is_staff=False
            ).order_by("id")
        )

        if len(estudiantes) != 9:
            raise CommandError(
                "La simulación debe tener exactamente 9 estudiantes."
            )

        if User.objects.count() != 10:
            raise CommandError(
                "La simulación debe tener exactamente 10 cuentas "
                "en total. Revisa las cuentas existentes."
            )

        return estudiantes

    def preparar_perfiles(self, estudiantes, facultad, carrera):
        perfiles = []

        for usuario in estudiantes:
            perfil, _ = PerfilEstudiante.objects.get_or_create(
                usuario=usuario,
                defaults={
                    "semestre": random.randint(1, 8),
                },
            )

            identificacion = self.generar_cedula_ficticia()

            while PerfilEstudiante.objects.filter(
                    identificacion=identificacion
            ).exclude(pk=perfil.pk).exists():
                identificacion = self.generar_cedula_ficticia()

            perfil.identificacion = identificacion
            perfil.semestre = random.randint(1, 8)
            perfil.facultad_relacionada = facultad
            perfil.carrera_relacionada = carrera
            perfil.puntos = 0
            perfil.puntos_recompensas = 0
            perfil.codigo_qr = uuid.uuid4()

            perfil.save()

            perfiles.append(perfil)

        return perfiles


    def preparar_materiales(self):
        materiales = [
            ("Plastico", 5),
            ("Lata", 20),
            ("Papel", 10),
            ("Carton", 10),
            ("Vidrio", 30),
            ("Organico", 5),
        ]

        tipos = {}

        for nombre, puntos in materiales:
            tipos[nombre] = TipoResiduo.objects.create(
                nombre=nombre,
                descripcion=f"Residuo de simulación: {nombre}",
                activo=True,
            )

        return materiales, tipos

    def preparar_puntos(self, tipos):
        puntos = []

        ubicaciones = [
            ("Punto Biblioteca", "Biblioteca"),
            ("Punto Cafetería", "Cafetería"),
            ("Punto Polideportivo", "Polideportivo"),
        ]

        for nombre, ubicacion in ubicaciones:
            punto = PuntoReciclaje.objects.create(
                nombre=nombre,
                ubicacion=ubicacion,
                descripcion="Punto de reciclaje de simulación.",
                residuos_aceptados=", ".join(tipos.keys()),
                codigo_qr=uuid.uuid4(),
                activo=True,
            )

            puntos.append(punto)

        return puntos

    def preparar_niveles_e_insignias(self):
        niveles = [
            ("Principiante", 0),
            ("Reciclador", 50),
            ("EcoHéroe", 100),
            ("Guardián del Campus", 200),
        ]

        for nombre, minimo in niveles:
            NivelReciclaje.objects.create(
                nombre=nombre,
                descripcion=f"Nivel {nombre} de EcoCampus AI.",
                puntos_minimos=minimo,
                activo=True,
            )

        insignias = []

        for nombre, minimo in [
            ("Primer reciclaje", 5),
            ("EcoComprometido", 50),
            ("Guardián del campus", 100),
        ]:
            insignias.append(
                Insignia.objects.create(
                    nombre=nombre,
                    descripcion=f"Insignia: {nombre}.",
                    puntos_requeridos=minimo,
                    activo=True,
                )
            )

        return insignias

    def preparar_retos(self, estudiantes, facultad):
        ahora = timezone.now()

        reto_individual = RetoEcologico.objects.create(
            titulo="Mi compromiso ecológico",
            descripcion="Registra dos reciclajes para completar el reto.",
            modalidad="INDIVIDUAL",
            tipo_objetivo="RECICLAJES",
            meta=2,
            recompensa_puntos=10,
            fecha_inicio=ahora,
            fecha_fin=ahora + timedelta(days=30),
            estado="ACTIVO",
            destacado=True,
            activo=True,
        )

        reto_grupal = RetoEcologico.objects.create(
            titulo="Facultad sostenible",
            descripcion=(
                "La facultad debe alcanzar 25 reciclajes "
                "para completar el desafío."
            ),
            modalidad="GRUPAL",
            alcance="FACULTAD",
            tipo_objetivo="RECICLAJES",
            meta=25,
            recompensa_puntos=15,
            fecha_inicio=ahora,
            fecha_fin=ahora + timedelta(days=30),
            estado="ACTIVO",
            destacado=False,
            activo=True,
        )

        # Crear participaciones antes de los reciclajes.
        for usuario in estudiantes:
            ParticipacionReto.objects.create(
                reto=reto_individual,
                estudiante=usuario,
                progreso=0,
            )

            ParticipacionRetoGrupal.objects.create(
                reto=reto_grupal,
                estudiante=usuario,
                recompensa_entregada=False,
            )

        return reto_individual, reto_grupal

    def preparar_reciclajes(
        self,
        perfiles,
        materiales,
        tipos,
        puntos,
        reto_individual,
        reto_grupal,
    ):
        puntos_por_material = dict(materiales)
        total_grupal = 0

        for indice, perfil in enumerate(perfiles):
            total_reciclaje = 0

            for vuelta in range(2):
                nombre_material = materiales[
                    (indice + vuelta) % len(materiales)
                ][0]

                tipo = tipos[nombre_material]
                puntos_otorgados = puntos_por_material[nombre_material]

                punto = puntos[
                    (indice + vuelta) % len(puntos)
                ]

                deteccion = DeteccionResiduo.objects.create(
                    estudiante=perfil.usuario,
                    tipo_residuo=tipo,
                    confianza=Decimal("0.9500"),
                    estado_validacion="VALIDADA",
                )

                RegistroReciclaje.objects.create(
                    estudiante=perfil.usuario,
                    punto_reciclaje=punto,
                    tipo_residuo=tipo,
                    deteccion=deteccion,
                    cantidad=Decimal("1.00"),
                    puntos_otorgados=puntos_otorgados,
                )

                total_reciclaje += puntos_otorgados
                total_grupal += 1

            # Cada estudiante completa el reto individual.
            perfil.puntos_recompensas = 10
            perfil.puntos = total_reciclaje + 10

            perfil.save(
                update_fields=["puntos", "puntos_recompensas"]
            )

            participacion = ParticipacionReto.objects.get(
                reto=reto_individual,
                estudiante=perfil.usuario,
            )

            participacion.progreso = 100
            participacion.fecha_completado = timezone.now()

            participacion.save(
                update_fields=["progreso", "fecha_completado"]
            )

        ProgresoRetoGrupal.objects.create(
            reto=reto_grupal,
            facultad=perfil.facultad_relacionada,
            valor_actual=total_grupal,
        )

    def preparar_insignias(self, perfiles, insignias):
        for perfil in perfiles:
            for insignia in insignias:
                if perfil.puntos >= insignia.puntos_requeridos:
                    InsigniaObtenida.objects.get_or_create(
                        estudiante=perfil,
                        insignia=insignia,
                    )

    def preparar_recompensas(self, perfiles):
        recompensa = Recompensa.objects.create(
            nombre="Botella reutilizable",
            descripcion=(
                "Botella reutilizable como recompensa "
                "de la simulación EcoCampus AI."
            ),
            costo_ecucoins=2,
            cantidad_disponible=20,
            activa=True,
        )

        # Tres estudiantes tendrán un canje de ejemplo.
        for perfil in perfiles[:3]:
            CanjeRecompensa.objects.create(
                estudiante=perfil.usuario,
                recompensa=recompensa,
                costo_ecucoins=2,
                nombre_recompensa=recompensa.nombre,
                descripcion_recompensa=recompensa.descripcion,
                estado="pendiente",
            )

        recompensa.cantidad_disponible -= 3

        recompensa.save(
            update_fields=["cantidad_disponible"]
        )

    def preparar_notificaciones(self, perfiles):
        for perfil in perfiles:
            Notificacion.objects.create(
                usuario=perfil.usuario,
                titulo="¡Bienvenido a EcoCampus AI!",
                mensaje=(
                    "Tu cuenta de simulación está preparada. "
                    "Ya puedes consultar tus puntos y retos."
                ),
                tipo="SUCCESS",
            )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.WARNING("\nSIMULACIÓN DE ECOCAMPUS AI")
        )

        self.stdout.write(
            "Se conservarán las 10 cuentas y sus contraseñas."
        )
        self.stdout.write(
            "Se reiniciarán los datos de la aplicación."
        )
        self.stdout.write(
            "La facultad y carrera actuales se conservarán."
        )

        self.stdout.write(
            "\nLa contraseña temporal de las cuentas nuevas será:"
        )
        self.stdout.write("EcoCampus2026*")

        confirmacion = input(
            "\nEscribe SIMULAR para continuar: "
        ).strip()

        if confirmacion != "SIMULAR":
            self.stdout.write(
                self.style.WARNING(
                    "Operación cancelada. No se modificaron datos."
                )
            )
            return

        with transaction.atomic():
            self.limpiar_datos()

            facultad, _ = Facultad.objects.get_or_create(
                nombre="Ciencias e Ingenierías",
                defaults={"activa": True},
            )

            carrera, _ = Carrera.objects.get_or_create(
                nombre="Ingeniería Industrial",
                facultad=facultad,
                defaults={"activa": True},
            )

            estudiantes = self.preparar_usuarios()

            perfiles = self.preparar_perfiles(
                estudiantes,
                facultad,
                carrera,
            )

            materiales, tipos = self.preparar_materiales()

            puntos = self.preparar_puntos(tipos)

            insignias = self.preparar_niveles_e_insignias()

            reto_individual, reto_grupal = self.preparar_retos(
                estudiantes,
                facultad,
            )

            self.preparar_reciclajes(
                perfiles,
                materiales,
                tipos,
                puntos,
                reto_individual,
                reto_grupal,
            )

            self.preparar_insignias(perfiles, insignias)

            self.preparar_recompensas(perfiles)

            self.preparar_notificaciones(perfiles)

            ConfiguracionSistema.objects.create(
                puntos_por_ecucoin=5
            )

        User = get_user_model()

        self.stdout.write(
            self.style.SUCCESS(
                "\n¡SIMULACIÓN PREPARADA CORRECTAMENTE!"
            )
        )

        self.stdout.write(f"Cuentas totales: {User.objects.count()}")
        self.stdout.write(f"Estudiantes: {len(perfiles)}")
        self.stdout.write(
            f"Perfiles: {PerfilEstudiante.objects.count()}"
        )
        self.stdout.write(
            f"Detecciones: {DeteccionResiduo.objects.count()}"
        )
        self.stdout.write(
            f"Reciclajes: {RegistroReciclaje.objects.count()}"
        )
        self.stdout.write(
            f"Retos: {RetoEcologico.objects.count()}"
        )
        self.stdout.write(
            f"Insignias: {Insignia.objects.count()}"
        )
        self.stdout.write(
            f"Recompensas: {Recompensa.objects.count()}"
        )

        self.stdout.write(
            "\nLas identificaciones generadas son ficticias."
        )
