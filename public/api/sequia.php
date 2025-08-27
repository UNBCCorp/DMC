<?php
// /api/sequia.php - API para el sistema MVC de sequía

// Headers de respuesta
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
 // Incluir la lógica de datos.php
require_once 'datos.php';
try {
       
    // La lógica principal ya está en datos.php, pero necesitamos reformatear la respuesta
    // para que coincida con lo que espera el sistema MVC
    
    // Reutilizar las funciones de datos.php
    $geojsonData = json_decode(file_get_contents(GEOJSON_PATH), true);
    if (!$geojsonData) {
        throw new Exception('No se pudo cargar el archivo GeoJSON base.');
    }

    $datosSequiaActual = getDatosSequiaActual();
    $datosHistoricos = getDatosHistoricos();
    $datosPersistencia = getDatosPersistencia();
    
    $datosFusionados = fusionarDatos(
        $geojsonData, 
        $datosSequiaActual, 
        $datosPersistencia
    );

    // Calcular promedios regionales para el sidebar
    $promedios = calcularPromediosRegionales($datosSequiaActual);
    
    // Preparar datos históricos para el gráfico regional
    $historicosRegionales = prepararHistoricosRegionales($datosHistoricos);
    
    // Formatear respuesta para el sistema MVC
    $respuesta = [
        'success' => true,
        'geojsonData' => $datosFusionados,
        'datosHistoricosComunales' => $datosHistoricos,
        'datosSidebar' => [
            'promedios' => $promedios,
            'historico' => $historicosRegionales
        ]
    ];

    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    if (ob_get_length()) ob_clean();
    echo json_encode($respuesta, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Calcula los promedios regionales para cada categoría de sequía
 */
function calcularPromediosRegionales($datosSequia) {
    if (empty($datosSequia)) {
        return ['SA' => 0, 'D0' => 0, 'D1' => 0, 'D2' => 0, 'D3' => 0, 'D4' => 0];
    }
    
    $categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
    $sumas = array_fill_keys($categorias, 0);
    $contador = 0;
    
    foreach ($datosSequia as $comuna) {
        foreach ($categorias as $cat) {
            if (isset($comuna[$cat]) && is_numeric($comuna[$cat])) {
                $sumas[$cat] += (float)$comuna[$cat];
            }
        }
        $contador++;
    }
    
    $promedios = [];
    foreach ($categorias as $cat) {
        $promedios[$cat] = $contador > 0 ? round($sumas[$cat] / $contador, 1) : 0;
    }
    
    return $promedios;
}

/**
 * Prepara los datos históricos para el gráfico regional
 */
function prepararHistoricosRegionales($datosHistoricos) {
    $categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
    $fechas = [];
    $seriesPorCategoria = array_fill_keys($categorias, []);
    
    // Recopilar todas las fechas únicas
    foreach ($datosHistoricos as $comunaHistorial) {
        foreach ($comunaHistorial as $registro) {
            if (isset($registro['fecha'])) {
                $fechas[] = $registro['fecha'];
            }
        }
    }
    
    // Eliminar duplicados y ordenar
    $fechas = array_unique($fechas);
    sort($fechas);
    
    // Para cada fecha, calcular el promedio regional
    foreach ($fechas as $fecha) {
        $sumasPorCategoria = array_fill_keys($categorias, 0);
        $contadorComunas = 0;
        
        foreach ($datosHistoricos as $comunaHistorial) {
            foreach ($comunaHistorial as $registro) {
                if ($registro['fecha'] === $fecha) {
                    foreach ($categorias as $cat) {
                        if (isset($registro[$cat]) && is_numeric($registro[$cat])) {
                            $sumasPorCategoria[$cat] += (float)$registro[$cat];
                        }
                    }
                    $contadorComunas++;
                    break; // Solo un registro por comuna por fecha
                }
            }
        }
        
        // Calcular promedios para esta fecha
        foreach ($categorias as $cat) {
            $promedio = $contadorComunas > 0 ? $sumasPorCategoria[$cat] / $contadorComunas : 0;
            $seriesPorCategoria[$cat][] = round($promedio, 1);
        }
    }
    
    // Formatear fechas para mostrar
    $labels = array_map(function($fecha) {
        $dt = new DateTime($fecha);
        return $dt->format('M Y');
    }, $fechas);
    
    return [
        'labels' => $labels,
        'series' => $seriesPorCategoria
    ];
}
?>
