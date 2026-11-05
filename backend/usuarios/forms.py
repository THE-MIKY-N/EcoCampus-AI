from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.db import transaction

from .models import PerfilEstudiante


class RegistroEstudianteForm(UserCreationForm):
    email = forms.EmailField(label="Correo institucional")
    facultad = forms.CharField(max_length=150)
    carrera = forms.CharField(max_length=150)
    semestre = forms.IntegerField(min_value=1, max_value=12)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password1",
            "password2",
            "facultad",
            "carrera",
            "semestre",
        ]

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()

        if not email.endswith("@unemi.edu.ec"):
            raise forms.ValidationError(
                "Debes usar un correo terminado en @unemi.edu.ec."
            )

        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError(
                "Este correo ya está registrado."
            )

        return email

    @transaction.atomic
    def save(self, commit=True):
        usuario = super().save(commit=False)
        usuario.email = self.cleaned_data["email"]

        if commit:
            usuario.save()

            PerfilEstudiante.objects.create(
                usuario=usuario,
                facultad=self.cleaned_data["facultad"],
                carrera=self.cleaned_data["carrera"],
                semestre=self.cleaned_data["semestre"],
            )

        return usuario


