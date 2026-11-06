
import os
import requests
import uuid


from urllib.parse import quote
from django.core.files.storage import Storage
from django.core.exceptions import ImproperlyConfigured
from django.utils.deconstruct import deconstructible


@deconstructible
class SupabaseMediaStorage(Storage):
    """
    Almacenamiento de imágenes en Supabase Storage.
    """

    bucket_name = "ecocampus-media"

    def __init__(self):
        self.project_url = "https://pnajuhfhrnrihzulxgzh.supabase.co"
        self.secret_key = os.environ.get("SUPABASE_SECRET_KEY")

        self.secret_key = os.environ.get("SUPABASE_SECRET_KEY")

    def _get_secret_key(self):
        secret_key = os.environ.get("SUPABASE_SECRET_KEY")

        if not secret_key:
            raise ImproperlyConfigured(
                "Falta configurar SUPABASE_SECRET_KEY."
            )

        return secret_key

    def _save(self, name, content):
        name = name.replace("\\", "/").lstrip("/")

        # Generar un nombre único para evitar sobrescribir imágenes.
        carpeta = name.rpartition("/")[0]
        extension = os.path.splitext(name)[1].lower()

        nombre_unico = f"{uuid.uuid4().hex}{extension}"

        name = f"{carpeta}/{nombre_unico}" if carpeta else nombre_unico

        encoded_name = quote(name, safe="/")

        url = (
            f"{self.project_url}/storage/v1/object/"
            f"{self.bucket_name}/{encoded_name}"
        )

        content_type = getattr(
            content,
            "content_type",
            "application/octet-stream"
        )

        secret_key = self._get_secret_key()

        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": content_type,
            "x-upsert": "false",
        }

        content.seek(0)

        response = requests.post(
            url,
            headers=headers,
            data=content,
            timeout=60
        )

        if response.status_code not in (200, 201):
            raise Exception(
                f"Error al subir imagen a Supabase: "
                f"{response.status_code} - {response.text}"
            )

        return name

    def url(self, name):
        encoded_name = quote(name, safe="/")

        return (
            f"{self.project_url}/storage/v1/object/public/"
            f"{self.bucket_name}/{encoded_name}"
        )

    def exists(self, name):
        return False


    def _open(self, name, mode="rb"):
        raise NotImplementedError(
            "La lectura de archivos se realiza mediante su URL pública."
        )

    def delete(self, name):
        if not name:
            return

        encoded_name = quote(name, safe="/")

        url = (
            f"{self.project_url}/storage/v1/object/"
            f"{self.bucket_name}/{encoded_name}"
        )

        secret_key = self._get_secret_key()
        headers = {
            "apikey": self.secret_key,
            "Authorization": f"Bearer {self.secret_key}",
        }

        response = requests.delete(
            url,
            headers=headers,
            timeout=60,
        )

        if response.status_code not in (200, 204):
            raise Exception(
                f"Error al eliminar imagen de Supabase: "
                f"{response.status_code} - {response.text}"
            )

