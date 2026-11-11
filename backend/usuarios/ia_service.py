
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "modelos_ia" / "yolov8n_ecocampus_v1.pt"

modelo = YOLO(str(MODEL_PATH))


def detectar_residuos(imagen):
    resultados = modelo.track(
        source=imagen,
        conf=0.40,
        tracker="bytetrack.yaml",
        persist=True,
        verbose=False
    )

    detecciones = []

    for resultado in resultados:
        for caja in resultado.boxes:
            clase_id = int(caja.cls[0])

            track_id = None

            if caja.id is not None:
                track_id = int(caja.id[0])

            detecciones.append({
                "track_id": track_id,
                "clase": modelo.names[clase_id],
                "confianza": round(float(caja.conf[0]) * 100, 2),
                "coordenadas": caja.xyxy[0].tolist()
            })

    return detecciones
