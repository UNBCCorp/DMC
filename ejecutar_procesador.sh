#!/bin/bash

# --- Script para ejecutar el procesador de mapas y registrar la salida ---

# Navega al directorio del proyecto para asegurar que las rutas funcionen
cd /home/usuario/DMC/

# Activa el entorno virtual de Python
source venv/bin/activate

# Define la ruta del archivo de registro
LOG_FILE="/home/usuario/DMC/cron.log"

# Escribe la fecha y hora de inicio en el registro
echo "--- Tarea iniciada en: $(date) ---" >> $LOG_FILE

# Ejecuta el script de Python y redirige TODA su salida (éxitos y errores) al archivo de registro
python procesador_mapas.py >> $LOG_FILE 2>&1

# Escribe la fecha y hora de finalización
echo "--- Tarea finalizada en: $(date) ---" >> $LOG_FILE
echo "" >> $LOG_FILE # Añade una línea en blanco para separar los registros