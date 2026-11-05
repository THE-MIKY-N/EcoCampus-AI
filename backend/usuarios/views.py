from .models import RegistroReciclaje
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect

from .forms import RegistroEstudianteForm


def registro(request):
    if request.method == "POST":
        form = RegistroEstudianteForm(request.POST)

        if form.is_valid():
            form.save()
            return redirect("login")
    else:
        form = RegistroEstudianteForm()

    return render(request, "registration/registro.html", {
        "form": form
    })


@login_required
def inicio(request):
    return render(request, "usuarios/inicio.html")

@login_required
def historial_reciclaje(request):
    registros = (
        RegistroReciclaje.objects
        .filter(estudiante=request.user)
        .select_related("tipo_residuo", "punto_reciclaje")
        .order_by("-fecha_registro")
    )

    return render(
        request,
        "usuarios/historial_reciclaje.html",
        {"registros": registros},
    )