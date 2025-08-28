#!/bin/bash

# Script wrapper para sincronización de índices
# Este script carga las variables de entorno y ejecuta el script PHP

# Obtener el directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Cargar variables de entorno si existe el archivo
if [ -f "$PROJECT_DIR/config/sync-config.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/config/sync-config.env" | xargs)
fi

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR"

# Ejecutar el script PHP
php bin/sync-indices-data.php

# Capturar código de salida
EXIT_CODE=$?

# Log del resultado en syslog si está disponible
if command -v logger >/dev/null 2>&1; then
    if [ $EXIT_CODE -eq 0 ]; then
        logger -t "dmc-sync" "Sincronización de índices completada exitosamente"
    else
        logger -t "dmc-sync" "Sincronización de índices falló con código $EXIT_CODE"
    fi
fi

exit $EXIT_CODE
