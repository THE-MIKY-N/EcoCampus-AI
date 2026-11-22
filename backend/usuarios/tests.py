import base64
from rest_framework.test import APISimpleTestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase

from usuarios.models import PuntoReciclaje

from usuarios.services import normalizar_texto, obtener_puntos


class PruebasPuntosResiduos(SimpleTestCase):
    """PU-01 a PU-04: puntos que se asignan por tipo de residuo."""

    def test_pu01_vidrio_da_30_puntos(self):
        self.assertEqual(obtener_puntos("Vidrio"), 30)

    def test_pu02_lata_da_20_puntos(self):
        self.assertEqual(obtener_puntos("Lata"), 20)

    def test_pu03_plastico_con_tilde_da_5_puntos(self):
        self.assertEqual(obtener_puntos("Plástico"), 5)

    def test_pu04_residuo_desconocido_lanza_error(self):
        with self.assertRaises(ValidationError):
            obtener_puntos("Madera")

class PruebasNormalizarTexto(SimpleTestCase):
    def test_pu05_quita_tildes_y_pasa_a_minusculas(self):
        self.assertEqual(normalizar_texto("CARTÓN"), "carton")


class PruebasDeteccionAPI(APISimpleTestCase):
    """PU-06 y PU-07: la ruta de detección rechaza entradas inválidas."""

    RUTA = "/api/detectar-residuo/"

    def test_pu06_sin_imagen_responde_400(self):
        respuesta = self.client.post(self.RUTA, {}, format="json")
        self.assertEqual(respuesta.status_code, 400)

    def test_pu07_archivo_que_no_es_imagen_responde_400(self):
        texto = base64.b64encode(b"esto no es una imagen").decode()
        respuesta = self.client.post(
            self.RUTA, {"imagen": texto}, format="json"
        )
        self.assertEqual(respuesta.status_code, 400)

class PruebasIntegracionPaginas(TestCase):
    """PI-01 a PI-05: acceso a las páginas principales."""

    def setUp(self):
        # setUp se ejecuta antes de cada prueba: crea un usuario de prueba.
        self.usuario = get_user_model().objects.create_user(
            username="estudiante_prueba", password="Clave12345!"
        )

    def test_pi01_login_carga_correctamente(self):
        respuesta = self.client.get("/login/")
        self.assertEqual(respuesta.status_code, 200)

    def test_pi02_registro_carga_correctamente(self):
        respuesta = self.client.get("/registro/")
        self.assertEqual(respuesta.status_code, 200)

    def test_pi03_inicio_sin_sesion_redirige(self):
        respuesta = self.client.get("/inicio/")
        self.assertEqual(respuesta.status_code, 302)

    def test_pi04_historial_sin_sesion_redirige(self):
        respuesta = self.client.get("/historial/")
        self.assertEqual(respuesta.status_code, 302)

    def test_pi05_inicio_con_sesion_carga(self):
        self.client.force_login(self.usuario)
        respuesta = self.client.get("/inicio/")
        self.assertEqual(respuesta.status_code, 200)


class PruebasIntegracionAPI(TestCase):
    """PI-06 a PI-08: acceso a rutas de la API."""

    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="estudiante_api", password="Clave12345!"
        )
        PuntoReciclaje.objects.create(
            nombre="Punto de prueba",
            ubicacion="Bloque A",
            codigo_qr="QR-PRUEBA-01",
        )

    def test_pi06_puntos_sin_sesion_es_rechazado(self):
        respuesta = self.client.get("/api/puntos-reciclaje/")
        self.assertEqual(respuesta.status_code, 403)

    def test_pi07_puntos_con_sesion_devuelve_lista(self):
        self.client.force_login(self.usuario)
        respuesta = self.client.get("/api/puntos-reciclaje/")
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.json()), 1)

    def test_pi08_puntos_de_la_estacion_son_publicos(self):
        respuesta = self.client.get("/api/estacion/puntos-reciclaje/")
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.json()), 1)


