from django import forms
from django.contrib import admin, messages
from django.contrib.admin.helpers import ActionForm
from django.core.exceptions import ValidationError

from .models import (
    PerfilEstudiante,
    TipoResiduo,
    DeteccionResiduo,
    PuntoReciclaje,
    RegistroReciclaje,
    NivelReciclaje,
    Insignia,
)
from .services import validar_reciclaje, rechazar_deteccion


class DeteccionActionForm(ActionForm):
    punto_reciclaje = forms.ModelChoiceField(
        queryset=PuntoReciclaje.objects.filter(activo=True),
        required=False,
        label="Punto de reciclaje para validar",
        help_text="Selecciona el punto antes de ejecutar Validar reciclaje.",
    )


@admin.register(PerfilEstudiante)
class PerfilEstudianteAdmin(admin.ModelAdmin):
    list_display = (
        "usuario",
        "facultad_relacionada",
        "carrera_relacionada",
        "semestre",
        "puntos",
    )

    search_fields = (
        "usuario__username",
        "usuario__email",
        "carrera_relacionada__nombre",
        "facultad_relacionada__nombre",
    )

    list_filter = (
        "facultad_relacionada",
        "carrera_relacionada",
        "semestre",
    )
@admin.register(TipoResiduo)
class TipoResiduoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "activo")
    search_fields = ("nombre",)
    list_filter = ("activo",)


@admin.register(DeteccionResiduo)
class DeteccionResiduoAdmin(admin.ModelAdmin):
    list_display = (
        "estudiante",
        "tipo_residuo",
        "confianza",
        "fecha_deteccion",
        "estado_validacion",
    )
    search_fields = (
        "estudiante__username",
        "estudiante__email",
        "tipo_residuo__nombre",
    )
    list_filter = ("estado_validacion", "tipo_residuo")
    action_form = DeteccionActionForm
    actions = ("validar_seleccionadas", "rechazar_seleccionadas")

    @admin.action(description="Validar reciclaje seleccionado")
    def validar_seleccionadas(self, request, queryset):
        punto_id = request.POST.get("punto_reciclaje")

        if not punto_id:
            self.message_user(
                request,
                "Selecciona un punto de reciclaje antes de validar.",
                level=messages.ERROR,
            )
            return

        try:
            punto = PuntoReciclaje.objects.get(
                pk=punto_id,
                activo=True,
            )
        except (PuntoReciclaje.DoesNotExist, ValueError):
            self.message_user(
                request,
                "El punto seleccionado no existe o está inactivo.",
                level=messages.ERROR,
            )
            return

        exitos = 0
        errores = []

        for deteccion in queryset:
            try:
                validar_reciclaje(deteccion.pk, punto.pk)
                exitos += 1
            except ValidationError as error:
                errores.append(
                    f"Detección {deteccion.pk}: {'; '.join(error.messages)}"
                )
            except Exception:
                errores.append(
                    f"Detección {deteccion.pk}: ocurrió un error inesperado. "
                    "Revisa la consola de Django."
                )

        if exitos:
            self.message_user(
                request,
                f"Se validaron {exitos} detección(es) y se otorgaron "
                "los puntos correspondientes.",
                level=messages.SUCCESS,
            )

        for error in errores:
            self.message_user(request, error, level=messages.ERROR)

    @admin.action(description="Rechazar detección seleccionada")
    def rechazar_seleccionadas(self, request, queryset):
        exitos = 0
        errores = []

        for deteccion in queryset:
            try:
                rechazar_deteccion(deteccion.pk)
                exitos += 1
            except ValidationError as error:
                errores.append(
                    f"Detección {deteccion.pk}: {'; '.join(error.messages)}"
                )
            except Exception:
                errores.append(
                    f"Detección {deteccion.pk}: ocurrió un error inesperado. "
                    "Revisa la consola de Django."
                )

        if exitos:
            self.message_user(
                request,
                f"Se rechazaron {exitos} detección(es). No se otorgaron puntos.",
                level=messages.SUCCESS,
            )

        for error in errores:
            self.message_user(request, error, level=messages.ERROR)


@admin.register(PuntoReciclaje)
class PuntoReciclajeAdmin(admin.ModelAdmin):
    list_display = ("nombre", "ubicacion", "codigo_qr", "activo")
    search_fields = ("nombre", "ubicacion", "codigo_qr")
    list_filter = ("activo",)


@admin.register(RegistroReciclaje)
class RegistroReciclajeAdmin(admin.ModelAdmin):
    list_display = (
        "estudiante",
        "punto_reciclaje",
        "tipo_residuo",
        "cantidad",
        "puntos_otorgados",
        "fecha_registro",
    )
    search_fields = (
        "estudiante__username",
        "estudiante__email",
        "tipo_residuo__nombre",
        "punto_reciclaje__nombre",
    )
    list_filter = ("tipo_residuo", "punto_reciclaje")


@admin.register(NivelReciclaje)
class NivelReciclajeAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "puntos_minimos",
        "activo",
    )
    search_fields = ("nombre",)
    list_filter = ("activo",)
    list_editable = ("puntos_minimos", "activo")
    ordering = ("puntos_minimos",)


@admin.register(Insignia)
class InsigniaAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "puntos_requeridos",
        "activo",
    )
    search_fields = ("nombre",)
    list_filter = ("activo",)
    list_editable = ("puntos_requeridos", "activo")
    ordering = ("puntos_requeridos", "nombre")
