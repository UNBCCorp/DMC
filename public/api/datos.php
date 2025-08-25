<?php
// /api/datos.php

// -------------------
// CONFIGURACIÓN
// -------------------
// Es buena práctica definir las rutas como constantes.
// realpath() asegura que las rutas sean absolutas al servidor.
define('BASE_PATH', realpath(dirname(__FILE__) . '/..'));
define('GEOJSON_PATH', BASE_PATH . '/maps/data/valp.geojson');
define('INDICES_DIR', BASE_PATH . '/maps/data/salida/spi/txt/');
define('API_BASE_URL', 'https://prodatos.meteochile.gob.cl/intranet/caster/getdp3/');
define('FALLBACK_API_PATH', BASE_PATH . '/maps/data/dummy_api_data.json');

// -------------------
// HEADERS DE RESPUESTA
// -------------------
// Indicamos que la respuesta será en formato JSON.
header('Content-Type: application/json');
// Permitimos el acceso desde cualquier origen (CORS), útil para desarrollo.
// En producción, podrías restringirlo a tu dominio: header('Access-Control-Allow-Origin: https://tu-sitio.com');
header('Access-Control-Allow-Origin: *');

// -------------------
// LÓGICA PRINCIPAL
// -------------------
try {
    // 1. Cargar el GeoJSON base
    $geojsonData = json_decode(file_get_contents(GEOJSON_PATH), true);
    if (!$geojsonData) {
        throw new Exception('No se pudo cargar el archivo GeoJSON base.');
    }

    // 2. Cargar datos de sequía (API o respaldo) y datos históricos en paralelo
    $datosSequiaActual = getDatosSequiaActual();
    $datosHistoricos = getDatosHistoricos();

    // 3. Cargar datos de persistencia desde el archivo .txt más reciente
    $datosPersistencia = getDatosPersistencia();

    // 4. Fusionar todos los datos en el GeoJSON
    $datosFusionados = fusionarDatos(
        $geojsonData, 
        $datosSequiaActual, 
        $datosPersistencia
    );

    // 5. Construir la respuesta final
    $respuesta = [
        'geojsonData' => $datosFusionados,
        'datosHistoricos' => $datosHistoricos
    ];

    // 6. Enviar la respuesta como JSON
    echo json_encode($respuesta);

} catch (Exception $e) {
    // En caso de error, enviar una respuesta de error clara.
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// -------------------
// FUNCIONES AUXILIARES
// -------------------

/**
 * Obtiene los datos de sequía del mes correcto desde la API de Meteochile.
 * Usa un archivo de respaldo si la API falla.
 */
function getDatosSequiaActual() {
    $hoy = new DateTime();
    $diaDeHoy = (int)$hoy->format('d');
    
    // Lógica de fechas de la API
    $intervalo = ($diaDeHoy < 17) ? 'P2M' : 'P1M';
    $fechaObjetivo = $hoy->sub(new DateInterval($intervalo));
    
    $ano = $fechaObjetivo->format('Y');
    $mes = $fechaObjetivo->format('m');
    $apiUrl = API_BASE_URL . "$ano/$mes";
    
    error_log("=== CARGA DE DATOS DE SEQUÍA ===");
    error_log("URL de API: $apiUrl");
    
    // Usamos cURL para más control sobre la petición
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // Tiempo de espera de 10 segundos
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if (!empty($data['datos'])) {
            error_log("API exitosa. Datos obtenidos: " . count($data['datos']) . " registros");
            return $data['datos'];
        }
    }
    
    error_log("API falló (HTTP: $httpCode). Usando respaldo local.");
    
    // Si la API falla, usamos el respaldo local
    $fallbackData = json_decode(file_get_contents(FALLBACK_API_PATH), true);
    $datosRespaldo = $fallbackData['datos'];
    error_log("Respaldo cargado: " . count($datosRespaldo) . " registros");
    
    return $datosRespaldo;
}

/**
 * Obtiene los datos históricos de los últimos 6 meses.
 */
function getDatosHistoricos($numMeses = 6) {
    $hoy = new DateTime();
    $fechaBase = new DateTime();
    $intervalo = ((int)$hoy->format('d') < 17) ? 'P2M' : 'P1M';
    $fechaBase->sub(new DateInterval($intervalo));

    $historicos = [];
    for ($i = 0; $i < $numMeses; $i++) {
        $fechaFetch = clone $fechaBase;
        $fechaFetch->sub(new DateInterval("P{$i}M"));
        $ano = $fechaFetch->format('Y');
        $mes = $fechaFetch->format('m');
        
        $url = API_BASE_URL . "$ano/$mes";
        $response = @file_get_contents($url); // Usamos @ para suprimir warnings si falla
        
        if ($response) {
            $data = json_decode($response, true);
            if (!empty($data['datos'])) {
                foreach ($data['datos'] as $comuna) {
                    $fechaRegistro = new DateTime("$ano-$mes-15");
                    $comuna['fecha'] = $fechaRegistro->format(DateTime::ISO8601);
                    $codigo = (string)$comuna['Code'];
                    if (!isset($historicos[$codigo])) {
                        $historicos[$codigo] = [];
                    }
                    $historicos[$codigo][] = $comuna;
                }
            }
        }
    }

    // Ordenar los registros de cada comuna por fecha
    foreach ($historicos as $codigo => &$registros) {
        usort($registros, function($a, $b) {
            return strtotime($a['fecha']) - strtotime($b['fecha']);
        });
    }

    return $historicos;
}


/**
 * Encuentra y parsea el archivo de índices .txt más reciente.
 */
function getDatosPersistencia($mesesAtras = 6) {
    $hoy = new DateTime();
    $contenidoTxt = null;

    for ($i = 1; $i <= $mesesAtras; $i++) {
        $fecha = clone $hoy;
        $fecha->sub(new DateInterval("P{$i}M"));
        $rutaArchivo = INDICES_DIR . $fecha->format('Y_m') . '_indices.txt';
        if (file_exists($rutaArchivo)) {
            $contenidoTxt = file_get_contents($rutaArchivo);
            break;
        }
    }

    if (!$contenidoTxt) {
        throw new Exception('No se encontraron archivos de índices de persistencia.');
    }

    $lineas = explode("\n", trim($contenidoTxt));
    $cabeceraRaw = array_shift($lineas);
    
    // Parsear la cabecera especial que tiene formato "meses:1,3,6,9,12,24,36,48"
    $cabecera = [];
    $columnas = explode(',', $cabeceraRaw);
    
    for ($i = 0; $i < count($columnas); $i++) {
        $col = trim($columnas[$i]);
        if (strpos($col, 'meses:') === 0) {
            // Extraer los números después de "meses:" y procesar el resto de las columnas
            $mesesStr = substr($col, 6); // Quitar "meses:"
            $primerMes = trim($mesesStr);
            $cabecera[] = "p_{$primerMes}m";
            
            // Procesar las siguientes columnas como meses adicionales
            for ($j = $i + 1; $j < count($columnas); $j++) {
                $mes = trim($columnas[$j]);
                if (is_numeric($mes)) {
                    $cabecera[] = "p_{$mes}m";
                } else {
                    break;
                }
            }
            break;
        } else {
            $cabecera[] = $col;
        }
    }
    
    $datosParseados = [];
    foreach ($lineas as $linea) {
        $valores = explode(',', trim($linea));
        $estacionObj = [];
        foreach ($cabecera as $index => $clave) {
            $valor = trim($valores[$index]);
            $estacionObj[$clave] = is_numeric($valor) ? (float)$valor : $valor;
        }
        $datosParseados[] = $estacionObj;
    }
    
    // Convertir a un mapa por código de estación para búsqueda fácil
    $mapaEstaciones = [];
    foreach ($datosParseados as $item) {
        $mapaEstaciones[$item['Estacion']] = $item;
    }
    return $mapaEstaciones;
}

/**
 * Función principal para fusionar todas las fuentes de datos en el GeoJSON.
 */
function fusionarDatos($geojsonData, $datosSequia, $datosPersistencia) {
    // Log para depuración
    error_log("=== INICIO FUSIÓN DE DATOS ===");
    error_log("Cantidad de datos de sequía: " . count($datosSequia));
    error_log("Cantidad de features en GeoJSON: " . count($geojsonData['features']));
    
    // Crear mapas para búsqueda eficiente (clave => valor)
    // Crear el mapa con ambos formatos de código (con y sin cero inicial)
    $mapaSequia = [];
    foreach ($datosSequia as $item) {
        $code = (string)$item['Code'];
        $mapaSequia[$code] = $item;
        // También agregar con cero inicial si no lo tiene
        if (strlen($code) === 4) {
            $mapaSequia['0' . $code] = $item;
        }
        // Log de los primeros códigos para depuración
        if (count($mapaSequia) <= 5) {
            error_log("Código de sequía: " . $code . " -> SA: " . ($item['SA'] ?? 'N/A'));
        }
    }
    
    // Verificar si existe el archivo de configuración
    $configPath = BASE_PATH . '/js/config.json';
    if (!file_exists($configPath)) {
        error_log("ADVERTENCIA: No se encontró el archivo config.json en: " . $configPath);
        $mapaComunaAEstaciones = [];
    } else {
        $configData = json_decode(file_get_contents($configPath), true);
        $mapaComunaAEstaciones = $configData['MAPA_COMUNA_A_ESTACIONES'] ?? [];
    }

    $periodosPersistencia = ['p_3m', 'p_9m', 'p_12m', 'p_24m', 'p_48m'];
    $fusionesExitosas = 0;

    foreach ($geojsonData['features'] as &$feature) {
        $props = &$feature['properties'];
        $cutCom = (string)$props['CUT_COM'];
        
        // 1. Fusionar datos de sequía actual
        // Intentar con el código original y también sin el cero inicial
        $codigoParaBuscar = $cutCom;
        if (strlen($cutCom) === 5 && $cutCom[0] === '0') {
            $codigoParaBuscar = substr($cutCom, 1);
        }
        
        $fusionado = false;
        if (isset($mapaSequia[$cutCom])) {
            $props = array_merge($props, $mapaSequia[$cutCom]);
            $fusionado = true;
            $fusionesExitosas++;
        } elseif (isset($mapaSequia[$codigoParaBuscar])) {
            $props = array_merge($props, $mapaSequia[$codigoParaBuscar]);
            $fusionado = true;
            $fusionesExitosas++;
        }
        
        // Log para las primeras features
        if ($fusionesExitosas <= 3) {
            error_log("Feature CUT_COM: $cutCom, Código buscado: $codigoParaBuscar, Fusionado: " . ($fusionado ? 'SÍ' : 'NO'));
            if ($fusionado) {
                error_log("  -> SA: " . ($props['SA'] ?? 'N/A') . ", D0: " . ($props['D0'] ?? 'N/A'));
            }
        }
        
        // 2. Fusionar datos de persistencia
        $nombreComunaNorm = strtoupper(trim(str_replace(
            ['Á', 'É', 'Í', 'Ó', 'Ú'], ['A', 'E', 'I', 'O', 'U'], $props['COMUNA']
        )));
        
        if (isset($mapaComunaAEstaciones[$nombreComunaNorm])) {
            $codigosEstacion = $mapaComunaAEstaciones[$nombreComunaNorm];
            foreach ($periodosPersistencia as $periodo) {
                $valores = [];
                foreach ($codigosEstacion as $codigo) {
                    if (isset($datosPersistencia[$codigo]) && isset($datosPersistencia[$codigo][$periodo])) {
                        $valores[] = $datosPersistencia[$codigo][$periodo];
                    }
                }
                if (count($valores) > 0) {
                    $props[$periodo] = array_sum($valores) / count($valores);
                } else {
                    $props[$periodo] = null;
                }
            }
        }
    }
    
    error_log("=== FIN FUSIÓN DE DATOS ===");
    error_log("Total de fusiones exitosas: $fusionesExitosas de " . count($geojsonData['features']) . " features");
    
    return $geojsonData;
}