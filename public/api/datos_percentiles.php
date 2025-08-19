<?php
header('Content-Type: application/json; charset=utf-8');

$ruta_archivo_json = dirname(__DIR__, 2) . '/public/maps/data/datos_percentiles.json';

if (file_exists($ruta_archivo_json)) {
    readfile($ruta_archivo_json);
} else {
    http_response_code(503); 
    echo json_encode(['error' => 'Los datos de los mapas aún no están disponibles. Por favor, intente más tarde.']);
}
?>