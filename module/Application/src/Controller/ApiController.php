<?php
// Archivo: module/Application/src/Controller/ApiController.php

namespace Application\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\JsonModel;
use Application\Model\ApiDataService;
use Application\Model\SequiaDataService;
use Application\Service\SequiaBaseService;
use Application\Exception\SequiaDataException;
use Application\Exception\FileNotFoundException;
use Application\Exception\JsonProcessingException;

class ApiController extends AbstractActionController {
    
    private $apiService;
    private $sequiaBaseService;

    public function __construct(ApiDataService $apiService, SequiaBaseService $sequiaBaseService) {
        $this->apiService = $apiService;
        $this->sequiaBaseService = $sequiaBaseService;
    }

    public function datosSequiaAction() {
        try {
            // 1. OBTENER DATOS DE SEQUÍA ACTUAL
            $fechaBase = $this->sequiaBaseService->calcularFechaBase();
            $anoActual = (int) $fechaBase->format('Y');
            $mesActual = (int) $fechaBase->format('m');
            
            // Intentar obtener datos del mes calculado
            $datosSequiaActual = $this->apiService->getDp3($anoActual, $mesActual);
            
            // Si falla, intentar con el mes anterior como fallback
            if ($datosSequiaActual === null) {
                $fechaFallback = clone $fechaBase;
                $fechaFallback->modify('-1 month');
                $anoFallback = (int) $fechaFallback->format('Y');
                $mesFallback = (int) $fechaFallback->format('m');
                
                $datosSequiaActual = $this->apiService->getDp3($anoFallback, $mesFallback);
                
                // Si encuentra datos en el fallback, actualizar las variables
                if ($datosSequiaActual !== null) {
                    $anoActual = $anoFallback;
                    $mesActual = $mesFallback;
                    $fechaBase = $fechaFallback;
                }
            }
            
            $this->sequiaBaseService->validarDatosSequiaActual($datosSequiaActual, $anoActual, $mesActual);

            // 2. OBTENER DATOS HISTÓRICOS (ÚLTIMOS 6 MESES)
            $datosHistoricos = $this->sequiaBaseService->getDatosHistoricos($fechaBase, 6, $this->apiService);

            // 3. OBTENER DATOS DE PERSISTENCIA (SPI DESDE .TXT)
            $datosPersistencia = $this->sequiaBaseService->getDatosPersistencia();

            // 4. OBTENER GEOJSON BASE
            $geojsonData = $this->sequiaBaseService->cargarGeojsonBase();

            // 5. FUSIONAR DATOS: Combinar GeoJSON base con datos de sequía actual y persistencia SPI
            $geojsonDataFusionado = $this->sequiaBaseService->fusionarDatos($geojsonData, $datosSequiaActual, $datosPersistencia);
            
            // 6. PREPARAR DATOS REGIONALES PARA LA BARRA LATERAL
            $datosSidebar = [
                'promedios' => $this->sequiaBaseService->calcularPromediosRegionales($datosSequiaActual),
                'historico' => $this->sequiaBaseService->calcularHistoricoRegional($datosHistoricos)
            ];

            // 7. PREPARAR Y LIMPIAR RESPUESTA
            $responseData = [
                'success' => true,
                'fechaBase' => $anoActual . '/' . $mesActual,
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

    
    /**
     * Valida que los datos puedan ser serializados a JSON sin problemas
     */
    private function validateJsonResponse($data) {
        // Intentar serializar a JSON para detectar problemas
        $jsonString = json_encode($data, JSON_UNESCAPED_UNICODE);
        
        if ($jsonString === false) {
            $error = json_last_error_msg();
            throw new JsonProcessingException("Error al serializar respuesta a JSON: $error");
        }
        
        // Verificar que el JSON se pueda decodificar correctamente
        $decoded = json_decode($jsonString, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            $error = json_last_error_msg();
            throw new JsonProcessingException("Error al validar JSON generado: $error");
        }
        
        // Verificar estructura mínima requerida
        if (!isset($decoded['success']) || !isset($decoded['geojsonData'])) {
            throw new JsonProcessingException("Estructura de respuesta JSON inválida: faltan campos obligatorios");
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
        $result = $data; // Valor por defecto
        
        if (is_array($data)) {
            $result = $this->sanitizeArrayData($data);
        } elseif (is_string($data)) {
            $result = $this->sanitizeStringData($data);
        } elseif (is_numeric($data)) {
            $result = $this->sanitizeNumericData($data);
        }
        
        return $result;
    }
    
    /**
     * Limpia datos de tipo array
     */
    private function sanitizeArrayData($data) {
        $cleaned = [];
        foreach ($data as $key => $value) {
            // Limpiar claves
            $cleanKey = is_string($key) ? trim($key) : $key;
            
            // Limpiar valores recursivamente
            $cleaned[$cleanKey] = $this->sanitizeResponseData($value);
        }
        return $cleaned;
    }
    
    /**
     * Limpia datos de tipo string
     */
    private function sanitizeStringData($data) {
        // Limpiar strings: eliminar caracteres de control, normalizar espacios
        $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $data);
        return trim($cleaned);
    }
    
    /**
     * Limpia y valida datos numéricos
     */
    private function sanitizeNumericData($data) {
        // Validar números
        if (is_float($data) && (is_nan($data) || is_infinite($data))) {
            return null; // Convertir NaN/Infinity a null
        }
        return $data;
    }
}
