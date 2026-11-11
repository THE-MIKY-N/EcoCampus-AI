from ultralytics import YOLO

# Cargar el modelo entrenado
model = YOLO("yolov8n_ecocampus_v1.pt")

# Analizar la fotografía
resultados = model.predict(
    source="prueba.jpg",
    conf=0.25,
    save=True
)

# Mostrar los resultados
for resultado in resultados:
    print("\nRESIDUOS DETECTADOS:")

    for caja in resultado.boxes:
        clase_id = int(caja.cls[0])
        confianza = float(caja.conf[0])

        nombre = model.names[clase_id]

        print(f"Residuo: {nombre}")
        print(f"Confianza: {confianza * 100:.2f}%")
        print("----------------------")