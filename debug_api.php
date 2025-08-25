<?php
require_once 'public/api/datos.php';

echo "=== DEBUG API ===\n";

$datosSequia = getDatosSequiaActual();
echo "Datos de sequía actual: " . count($datosSequia) . " registros\n";
if (count($datosSequia) > 0) {
    echo "Primer registro de sequía:\n";
    print_r($datosSequia[0]);
}

$geojsonData = json_decode(file_get_contents(GEOJSON_PATH), true);
echo "\nDatos GeoJSON: " . count($geojsonData['features']) . " features\n";
if (count($geojsonData['features']) > 0) {
    echo "Primera feature CUT_COM: " . $geojsonData['features'][0]['properties']['CUT_COM'] . "\n";
}

$datosPersistencia = getDatosPersistencia();
echo "\nDatos de persistencia: " . count($datosPersistencia) . " registros\n";

// Probar fusión
$datosFusionados = fusionarDatos($geojsonData, $datosSequia, $datosPersistencia);
echo "\nDespués de fusionar - Primera feature:\n";
print_r($datosFusionados['features'][0]['properties']);
?>
