<?php
/**
 * Script para sincronizar archivos de índices SPEI y SPI
 *
 * Este script copia archivos desde directorios de origen hacia
 * las carpetas de destino en public/maps/data/
 *
 * Uso: php bin/sync-indices-data.php
 */

// Configuración de directorios
$config = [
    'spei' => [
        'origen' => getcwd() . '/prueba/spei',
        'destino' => getcwd() . '/public/maps/data/salida/spei/txt',
        'patron' => '*.txt', // Patrón de archivos a copiar
    ],
    'spi' => [
        'origen' => getcwd() . '/prueba/spi',
        'destino' => getcwd() . '/public/maps/data/salida/spi/txt',
        'patron' => '*.txt',
    ]
];

// Configuración de logging
$logFile = getcwd() . '/data/logs/sync-indices.log';
$logDir = dirname($logFile);

// Crear directorio de logs si no existe
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

/**
 * Función para escribir logs
 */
function writeLog($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    echo $logMessage;
}

/**
 * Función para validar directorios de origen y destino
 */
function validateDirectories($origen, $destino) {
    // Verificar que el directorio origen existe
    if (!is_dir($origen)) {
        writeLog("ERROR: Directorio origen no existe: $origen", 'ERROR');
        return ['valid' => false, 'errors' => 1];
    }

    // Crear directorio destino si no existe
    if (!is_dir($destino)) {
        if (!mkdir($destino, 0755, true)) {
            writeLog("ERROR: No se pudo crear directorio destino: $destino", 'ERROR');
            return ['valid' => false, 'errors' => 1];
        }
        writeLog("Directorio destino creado: $destino");
    }

    return ['valid' => true, 'errors' => 0];
}

/**
 * Función para procesar un archivo individual
 */
function processFile($archivoOrigen, $archivoDestino, $nombreArchivo) {
    $resultado = ['copied' => 0, 'errors' => 0, 'skipped' => false];

    try {
        // Verificar si el archivo ya existe y comparar fechas de modificación
        if (file_exists($archivoDestino)) {
            $fechaOrigen = filemtime($archivoOrigen);
            $fechaDestino = filemtime($archivoDestino);

            if ($fechaOrigen <= $fechaDestino) {
                writeLog("Archivo ya actualizado, omitiendo: $nombreArchivo", 'DEBUG');
                $resultado['skipped'] = true;
                return $resultado;
            }
        }

        // Copiar archivo
        if (copy($archivoOrigen, $archivoDestino)) {
            writeLog("Copiado: $nombreArchivo");
            // Preservar la fecha de modificación original
            touch($archivoDestino, filemtime($archivoOrigen));
            $resultado['copied'] = 1;
        } else {
            writeLog("ERROR: No se pudo copiar: $nombreArchivo", 'ERROR');
            $resultado['errors'] = 1;
        }

    } catch (Exception $e) {
        writeLog("ERROR: Excepción al copiar $nombreArchivo: " . $e->getMessage(), 'ERROR');
        $resultado['errors'] = 1;
    }

    return $resultado;
}

/**
 * Función para copiar archivos con validación
 */
function copyFiles($origen, $destino, $patron) {
    $copiedCount = 0;
    $errorCount = 0;

    // Validar directorios
    $validation = validateDirectories($origen, $destino);
    if (!$validation['valid']) {
        return ['copied' => 0, 'errors' => $validation['errors']];
    }

    // Buscar archivos que coincidan con el patrón
    $archivos = glob($origen . '/' . $patron);

    if (empty($archivos)) {
        writeLog("ADVERTENCIA: No se encontraron archivos con patrón '$patron' en: $origen", 'WARN');
        return ['copied' => 0, 'errors' => 0];
    }

    writeLog("Encontrados " . count($archivos) . " archivos para copiar desde: $origen");

    foreach ($archivos as $archivoOrigen) {
        $nombreArchivo = basename($archivoOrigen);
        $archivoDestino = $destino . '/' . $nombreArchivo;

        $resultado = processFile($archivoOrigen, $archivoDestino, $nombreArchivo);
        $copiedCount += $resultado['copied'];
        $errorCount += $resultado['errors'];
    }

    return ['copied' => $copiedCount, 'errors' => $errorCount];
}

/**
 * Función principal
 */
function main() {
    global $config;

    writeLog("=== INICIO DE SINCRONIZACIÓN DE ÍNDICES ===");
    writeLog("Timestamp: " . date('c'));

    $totalCopied = 0;
    $totalErrors = 0;

    foreach ($config as $tipo => $configuracion) {
        writeLog("--- Procesando índices $tipo ---");
        writeLog("Origen: " . $configuracion['origen']);
        writeLog("Destino: " . $configuracion['destino']);
        writeLog("Patrón: " . $configuracion['patron']);

        $resultado = copyFiles(
            $configuracion['origen'],
            $configuracion['destino'],
            $configuracion['patron']
        );

        $totalCopied += $resultado['copied'];
        $totalErrors += $resultado['errors'];

        writeLog("$tipo - Archivos copiados: " . $resultado['copied']);
        writeLog("$tipo - Errores: " . $resultado['errors']);
    }

    writeLog("=== RESUMEN FINAL ===");
    writeLog("Total archivos copiados: $totalCopied");
    writeLog("Total errores: $totalErrors");
    writeLog("=== FIN DE SINCRONIZACIÓN ===");

    // Código de salida para el cron
    exit($totalErrors > 0 ? 1 : 0);
}

// Ejecutar solo si se llama directamente
if (php_sapi_name() === 'cli') {
    main();
} else {
    echo "Este script debe ejecutarse desde línea de comandos.\n";
    exit(1);
}

