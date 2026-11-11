
from pathlib import Path

import torch
from ultralytics import YOLO

# Limitar los hilos de CPU para evitar sobrecargar Render.
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "modelos_ia" / "yolov8n_ecocampus_v1.pt"

modelo = YOLO(str(MODEL_PATH))


def detectar_residuos(imagen):
    resultados = modelo.predict(
        source=imagen,
        conf=0.40,
        verbose=False,
        imgsz=320,
        device="cpu",
        max_det=10
    )

    detecciones = []

    for resultado in resultados:
        for caja in resultado.boxes:
            clase_id = int(caja.cls[0])

            detecciones.append({
                "clase": modelo.names[clase_id],
                "confianza": round(float(caja.conf[0]) * 100, 2),
                "coordenadas": caja.xyxy[0].tolist()
            })

    return detecciones
