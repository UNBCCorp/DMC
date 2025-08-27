<?php
// Archivo: module/Application/src/Controller/ApiController.php

namespace Application\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\JsonModel;
use Application\Model\ApiDataService;

class ApiController extends AbstractActionController {
    
    private $apiService;

    public function __construct(ApiDataService $apiService) {
        $this->apiService = $apiService;
    }

    public function datosSequiaAction() {
        try {
            // 1. OBTENER DATOS DE SEQUÍA ACTUAL
            $hoy = new \DateTime();
            $diaDeHoy = (int) $hoy->format('d');
            $fechaBase = new \DateTime();
            if ($diaDeHoy < 17) $fechaBase->modify('-2 months');
            else $fechaBase->modify('-1 month');
            $anoActual = (int) $fechaBase->format('Y');
            $mesActual = (int) $fechaBase->format('m');
            $datosSequiaActual = $this->apiService->getDp3($anoActual, $mesActual);
            if ($datosSequiaActual === null) {
                throw new \Exception("No se pudieron obtener datos de sequía actual.");
            }

            // 2. OBTENER DATOS HISTÓRICOS (ÚLTIMOS 6 MESES)
            $datosHistoricos = $this->getDatosHistoricos($fechaBase, 6);

            // 3. OBTENER DATOS DE PERSISTENCIA (SPI DESDE .TXT)
            $datosPersistencia = $this->getDatosPersistencia();

            // 4. OBTENER GEOJSON BASE
            $geojsonPath = getcwd() . '/public/maps/data/valp.geojson';
            if (!file_exists($geojsonPath)) throw new \Exception("No se encontró el archivo GeoJSON.");
            $geojsonData = json_decode(file_get_contents($geojsonPath), true);

            // 5. FUSIONAR TODO EN UN SOLO GEOJSON
            $geojsonDataFusionado = $this->fusionarDatos($geojsonData, $datosSequiaActual, $datosPersistencia);
            
            // 6. PREPARAR DATOS REGIONALES PARA LA BARRA LATERAL
            $datosSidebar = [
                'promedios' => $this->calcularPromediosRegionales($datosSequiaActual),
                'historico' => $this->calcularHistoricoRegional($datosHistoricos)
            ];

            // 7. PREPARAR Y LIMPIAR RESPUESTA
            $responseData = [
                'success' => true,
                'geojsonData' => $geojsonDataFusionado,
                'datosHistoricosComunales' => $datosHistoricos,
                'datosSidebar' => $datosSidebar,
                'timestamp' => date('c'),
                'version' => '1.0'
            ];
            
            // 8. SANITIZAR DATOS PARA EVITAR PROBLEMAS DE CODIFICACIÓN
            $responseData = $this->sanitizeResponseData($responseData);
            
            // 9. VALIDAR QUE LA RESPUESTA SEA JSON VÁLIDO
            $this->validateJsonResponse($responseData);
            
            // 10. CONFIGURAR HEADERS Y ENVIAR RESPUESTA
            return $this->createJsonResponse($responseData);

        } catch (\Exception $e) {
            // Log del error para debugging
            error_log("Error en ApiController::datosSequiaAction: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            
            // Preparar respuesta de error
            $errorResponse = [
                'success' => false,
                'message' => $e->getMessage(),
                'timestamp' => date('c'),
                'version' => '1.0'
            ];
            
            // Configurar código de estado HTTP
            $this->getResponse()->setStatusCode(500);
            
            // Usar el mismo método para respuestas de error
            return $this->createJsonResponse($errorResponse);
        }
    }

    // --- MÉTODOS PRIVADOS DE PROCESAMIENTO ---

    private function fusionarDatos($geojsonData, $datosSequia, $datosPersistencia) {
        $mapaSequia = array_column($datosSequia, null, 'Code');
        $mapaComunaAEstaciones = json_decode(file_get_contents(getcwd() . '/public/js/config.json'), true)['MAPA_COMUNA_A_ESTACIONES'];

        foreach ($geojsonData['features'] as &$feature) {
            $props = &$feature['properties'];
            $cutCom = (string)($props['CUT_COM'] ?? '');
            
            // Fusionar datos de sequía actual
            if (isset($mapaSequia[$cutCom])) {
                $props = array_merge($props, $mapaSequia[$cutCom]);
            }

            // Fusionar datos de persistencia
            $nombreComunaNorm = strtoupper(trim(str_replace(['Á','É','Í','Ó','Ú'], ['A','E','I','O','U'], $props['COMUNA'] ?? '')));
            if (isset($mapaComunaAEstaciones[$nombreComunaNorm])) {
                $codigosEstacion = $mapaComunaAEstaciones[$nombreComunaNorm];
                foreach ($datosPersistencia['periodos'] as $periodo) {
                    $valores = [];
                    foreach ($codigosEstacion as $codigo) {
                        if (isset($datosPersistencia['mapa'][$codigo]) && isset($datosPersistencia['mapa'][$codigo][$periodo])) {
                            $valores[] = $datosPersistencia['mapa'][$codigo][$periodo];
                        }
                    }
                    $props[$periodo] = count($valores) > 0 ? array_sum($valores) / count($valores) : null;
                }
            }
        }
        return $geojsonData;
    }

    private function getDatosHistoricos($fechaBase, $numMeses) {
        $historicos = [];
        for ($i = 0; $i < $numMeses; $i++) {
            $fechaFetch = clone $fechaBase;
            $fechaFetch->modify("-$i months");
            $ano = (int) $fechaFetch->format('Y');
            $mes = (int) $fechaFetch->format('m');
            $datosMes = $this->apiService->getDp3($ano, $mes);
            if ($datosMes) {
                foreach ($datosMes as $comuna) {
                    $codigo = (string)$comuna['Code'];
                    $comuna['fecha'] = $fechaFetch->format('Y-m-d');
                    if (!isset($historicos[$codigo])) $historicos[$codigo] = [];
                    $historicos[$codigo][] = $comuna;
                }
            }
        }
        foreach ($historicos as &$registros) {
            usort($registros, fn($a, $b) => strcmp($a['fecha'], $b['fecha']));
        }
        return $historicos;
    }
    
    private function getDatosPersistencia($mesesAtras = 6) {
        $hoy = new \DateTime();
        $contenidoTxt = null;
        for ($i = 1; $i <= $mesesAtras; $i++) {
            $fecha = clone $hoy;
            $fecha->sub(new \DateInterval("P{$i}M"));
            $rutaArchivo = getcwd() . '/public/maps/data/salida/spi/txt/' . $fecha->format('Y_m') . '_indices.txt';
            if (file_exists($rutaArchivo)) {
                $contenidoTxt = file_get_contents($rutaArchivo);
                break;
            }
        }
        if (!$contenidoTxt) return ['mapa' => [], 'periodos' => []];

        $lineas = explode("\n", trim($contenidoTxt));
        $cabeceraRaw = array_shift($lineas);
        $cabecera = array_map(fn($h) => is_numeric(trim($h)) ? "p_".trim($h)."m" : trim($h), explode(',', $cabeceraRaw));
        
        $mapaEstaciones = [];
        foreach ($lineas as $linea) {
            $valores = explode(',', trim($linea));
            $estacionObj = [];
            foreach ($cabecera as $index => $clave) {
                $valor = trim($valores[$index]);
                $estacionObj[$clave] = is_numeric($valor) ? (float)$valor : $valor;
            }
            $mapaEstaciones[$estacionObj['Estacion']] = $estacionObj;
        }
        
        $periodos = array_filter($cabecera, fn($h) => str_starts_with($h, 'p_'));
        return ['mapa' => $mapaEstaciones, 'periodos' => array_values($periodos)];
    }

    private function calcularPromediosRegionales($datos) {
        $promedios = [];
        $categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
        $sumas = array_fill_keys($categorias, 0);
        $totalComunas = count($datos);
        if ($totalComunas === 0) return $sumas;

        foreach ($datos as $comuna) {
            foreach ($categorias as $cat) {
                $sumas[$cat] += (float)($comuna[$cat] ?? 0);
            }
        }
        foreach ($sumas as $cat => $suma) {
            $promedios[$cat] = round($suma / $totalComunas, 1);
        }
        return $promedios;
    }
    
    private function calcularHistoricoRegional($datosHistoricos) {
        $promediosMensuales = [];
        $categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
        
        foreach ($datosHistoricos as $historialComuna) {
            foreach ($historialComuna as $registro) {
                $monthKey = substr($registro['fecha'], 0, 7);
                if (!isset($promediosMensuales[$monthKey])) {
                    $promediosMensuales[$monthKey] = ['sumas' => array_fill_keys($categorias, 0), 'count' => 0, 'fecha' => $registro['fecha']];
                }
                foreach ($categorias as $cat) {
                    $promediosMensuales[$monthKey]['sumas'][$cat] += (float)($registro[$cat] ?? 0);
                }
                $promediosMensuales[$monthKey]['count']++;
            }
        }
        
        usort($promediosMensuales, fn($a, $b) => strcmp($a['fecha'], $b['fecha']));
        
        $resultado = ['labels' => [], 'series' => array_fill_keys($categorias, [])];
        foreach ($promediosMensuales as $dataMes) {
            $fecha = new \DateTime($dataMes['fecha']);
            $resultado['labels'][] = $fecha->format('M y');
            foreach ($categorias as $cat) {
                $resultado['series'][$cat][] = round($dataMes['sumas'][$cat] / $dataMes['count'], 1);
            }
        }
        return $resultado;
    }
    
    /**
     * Valida que los datos puedan ser serializados a JSON sin problemas
     */
    private function validateJsonResponse($data) {
        // Intentar serializar a JSON para detectar problemas
        $jsonString = json_encode($data, JSON_UNESCAPED_UNICODE);
        
        if ($jsonString === false) {
            $error = json_last_error_msg();
            throw new \Exception("Error al serializar respuesta a JSON: $error");
        }
        
        // Verificar que el JSON se pueda decodificar correctamente
        $decoded = json_decode($jsonString, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            $error = json_last_error_msg();
            throw new \Exception("Error al validar JSON generado: $error");
        }
        
        // Verificar estructura mínima requerida
        if (!isset($decoded['success']) || !isset($decoded['geojsonData'])) {
            throw new \Exception("Estructura de respuesta JSON inválida: faltan campos obligatorios");
        }
        
        // Verificar tamaño razonable (evitar respuestas excesivamente grandes)
        $sizeInMB = strlen($jsonString) / (1024 * 1024);
        if ($sizeInMB > 50) { // Límite de 50MB
            error_log("Advertencia: Respuesta JSON muy grande: {$sizeInMB}MB");
        }
        
        return true;
    }
    
    /**
     * Crea una respuesta JSON con headers apropiados
     */
    private function createJsonResponse($data) {
        // Configurar headers de respuesta
        $response = $this->getResponse();
        $headers = $response->getHeaders();
        
        // Headers para JSON
        $headers->addHeaderLine('Content-Type', 'application/json; charset=utf-8');
        $headers->addHeaderLine('Cache-Control', 'no-cache, no-store, must-revalidate');
        $headers->addHeaderLine('Pragma', 'no-cache');
        $headers->addHeaderLine('Expires', '0');
        
        // Headers CORS si es necesario
        $headers->addHeaderLine('Access-Control-Allow-Origin', '*');
        $headers->addHeaderLine('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        $headers->addHeaderLine('Access-Control-Allow-Headers', 'Content-Type');
        
        // Crear JsonModel con configuración específica
        $jsonModel = new JsonModel($data);
        $jsonModel->setOption('prettyPrint', false); // Compacto para reducir tamaño
        
        return $jsonModel;
    }
    
    /**
     * Limpia y valida datos antes de incluirlos en la respuesta
     */
    private function sanitizeResponseData($data) {
        if (is_array($data)) {
            $cleaned = [];
            foreach ($data as $key => $value) {
                // Limpiar claves
                $cleanKey = is_string($key) ? trim($key) : $key;
                
                // Limpiar valores recursivamente
                $cleaned[$cleanKey] = $this->sanitizeResponseData($value);
            }
            return $cleaned;
        } elseif (is_string($data)) {
            // Limpiar strings: eliminar caracteres de control, normalizar espacios
            $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $data);
            return trim($cleaned);
        } elseif (is_numeric($data)) {
            // Validar números
            if (is_float($data) && (is_nan($data) || is_infinite($data))) {
                return null; // Convertir NaN/Infinity a null
            }
            return $data;
        }
        
        return $data;
    }
}