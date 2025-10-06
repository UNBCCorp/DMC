<?php
// Script simple para eliminar archivos de caché

$cacheDir = __DIR__ . '/data/cache';
$cacheFile = $cacheDir . '/module-config-cache.application.config.cache.php';

if (file_exists($cacheFile)) {
    if (unlink($cacheFile)) {
        echo "Caché eliminada correctamente: $cacheFile\n";
    } else {
        echo "Error al eliminar el archivo de caché: $cacheFile\n";
    }
} else {
    echo "El archivo de caché no existe: $cacheFile\n";
}
