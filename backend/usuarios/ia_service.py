
from pathlib import Path

from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "modelos_ia" / "YOLO_V2" / "best.onnx"

modelo = YOLO(str(MODEL_PATH), task="detect")

print("[YOLO] Modelo ONNX cargado.")
print("[YOLO] Clases:", modelo.names)


def detectar_residuos(imagen):
    resultados = modelo.predict(
        source=imagen,
        conf=0.25,
        verbose=False,
        imgsz=480,
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
