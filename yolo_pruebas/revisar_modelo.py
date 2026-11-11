from ultralytics import YOLO

model = YOLO("yolov8n_ecocampus_v1.pt")

print("¡Modelo cargado correctamente!")
print("Tipo de tarea:", model.task)
print("\nClases detectables:")

for id_clase, nombre in model.names.items():
    print(f"{id_clase}: {nombre}")