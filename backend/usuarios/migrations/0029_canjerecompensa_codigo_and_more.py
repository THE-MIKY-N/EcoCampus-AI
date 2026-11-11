
import uuid
from django.db import migrations, models


def generar_codigos_unicos(apps, schema_editor):
    CanjeRecompensa = apps.get_model("usuarios", "CanjeRecompensa")

    for canje in CanjeRecompensa.objects.filter(codigo__isnull=True):
        canje.codigo = uuid.uuid4()
        canje.save(update_fields=["codigo"])


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0028_puntoreciclaje_descripcion_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="canjerecompensa",
            name="codigo",
            field=models.UUIDField(
                null=True,
                editable=False,
            ),
        ),
        migrations.RunPython(
            generar_codigos_unicos,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="canjerecompensa",
            name="codigo",
            field=models.UUIDField(
                default=uuid.uuid4,
                unique=True,
                editable=False,
            ),
        ),
        migrations.AddField(
            model_name="canjerecompensa",
            name="descripcion_recompensa",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="canjerecompensa",
            name="nombre_recompensa",
            field=models.CharField(default="", max_length=150),
        ),
    ]
