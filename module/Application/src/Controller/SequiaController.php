<?php

declare(strict_types=1);

namespace Application\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\JsonModel;
use Laminas\View\Model\ViewModel;
use Application\Model\SequiaDataService;
use Application\Service\SequiaBaseService;
use Application\Exception\SequiaDataException;
use Application\Exception\FileNotFoundException;

class SequiaController extends AbstractActionController
{
    private $sequiaService;
    private $sequiaBaseService;

    public function __construct(SequiaDataService $sequiaService, SequiaBaseService $sequiaBaseService)
    {
        $this->sequiaService = $sequiaService;
        $this->sequiaBaseService = $sequiaBaseService;
    }

    public function indexAction()
    {
        return new ViewModel();
    }

    public function datosSequiaAction()
    {
        try {
            // 1. OBTENER DATOS DE SEQUÍA ACTUAL
            $fechaBase = $this->sequiaBaseService->calcularFechaBase();
            $anoActual = (int) $fechaBase->format('Y');
            $mesActual = (int) $fechaBase->format('m');
            $datosSequiaActual = $this->sequiaService->getDp3($anoActual, $mesActual);
            $this->sequiaBaseService->validarDatosSequiaActual($datosSequiaActual, $anoActual, $mesActual);

            // 2. OBTENER DATOS HISTÓRICOS (ÚLTIMOS 6 MESES)
            $datosHistoricos = $this->getDatosHistoricos($fechaBase, 12);

            // 3. OBTENER DATOS DE PERSISTENCIA (SPI DESDE .TXT)
            $datosPersistencia = $this->getDatosPersistencia();

            // 4. OBTENER GEOJSON BASE
            $geojsonData = $this->sequiaBaseService->cargarGeojsonBase();

            // 5. FUSIONAR DATOS: Combinar GeoJSON base con datos de sequía actual y persistencia SPI
            $geojsonDataFusionado = $this->fusionarDatos($geojsonData, $datosSequiaActual, $datosPersistencia);
            
            // 6. PREPARAR DATOS REGIONALES PARA LA BARRA LATERAL
            $datosSidebar = [
                'promedios' => $this->sequiaBaseService->calcularPromediosRegionales($datosSequiaActual),
                'historico' => $this->sequiaBaseService->calcularHistoricoRegional($datosHistoricos)
            ];

            // 7. PREPARAR Y ENVIAR RESPUESTA: Crear respuesta JSON con todos los datos procesados
            return new JsonModel([
                'success' => true,
                'geojsonData' => $geojsonDataFusionado,
                'datosHistoricosComunales' => $datosHistoricos,
                'datosSidebar' => $datosSidebar
            ]);

        } catch (\Exception $e) {
            return new JsonModel(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // --- MÉTODOS PRIVADOS DE PROCESAMIENTO ---

    /**
     * Crea un mapa de datos de sequía con códigos de 4 y 5 dígitos
     */
    private function crearMapaSequia($datosSequia) {
        $mapaSequia = [];
        foreach ($datosSequia as $item) {
            $code = (string)$item['Code'];
            $mapaSequia[$code] = $item;
            // También agregar con cero inicial si no lo tiene (4 dígitos -> 5 dígitos)
            if (strlen($code) === 4) {
                $mapaSequia['0' . $code] = $item;
            }
        }
        return $mapaSequia;
    }

    /**
     * Fusiona datos de sequía en las propiedades de una feature
     */
    private function fusionarDatosSequia(&$props, $mapaSequia, $cutCom) {
        // Intentar ambos formatos de código
        $codigoParaBuscar = $cutCom;
        if (strlen($cutCom) === 5 && $cutCom[0] === '0') {
            $codigoParaBuscar = substr($cutCom, 1); // Quitar cero inicial para buscar versión de 4 dígitos
        }
        
        if (isset($mapaSequia[$cutCom])) {
            $props = array_merge($props, $mapaSequia[$cutCom]);
        } elseif (isset($mapaSequia[$codigoParaBuscar])) {
            $props = array_merge($props, $mapaSequia[$codigoParaBuscar]);
        }
    }

    /**
     * Calcula el promedio de valores para un período específico
     */
    private function calcularPromedioValores($codigosEstacion, $datosPersistencia, $periodo) {
        $valores = [];
        foreach ($codigosEstacion as $codigo) {
            if (isset($datosPersistencia['mapa'][$codigo]) && isset($datosPersistencia['mapa'][$codigo][$periodo])) {
                $valores[] = $datosPersistencia['mapa'][$codigo][$periodo];
            }
        }
        return !empty($valores) ? array_sum($valores) / count($valores) : null;
    }

    /**
     * Fusiona datos de persistencia en las propiedades de una feature
     */
    private function fusionarDatosPersistencia(&$props, $mapaComunaAEstaciones, $datosPersistencia) {
        $nombreComunaNorm = $this->sequiaBaseService->normalizarNombreComuna($props['COMUNA'] ?? '');
        
        if (isset($mapaComunaAEstaciones[$nombreComunaNorm])) {
            $codigosEstacion = $mapaComunaAEstaciones[$nombreComunaNorm];
            foreach ($datosPersistencia['periodos'] as $periodo) {
                $props[$periodo] = $this->calcularPromedioValores($codigosEstacion, $datosPersistencia, $periodo);
            }
        }
    }

    /**
     * Fusiona todos los datos en el GeoJSON
     */
    private function fusionarDatos($geojsonData, $datosSequia, $datosPersistencia) {
        $mapaSequia = $this->crearMapaSequia($datosSequia);
        $mapaComunaAEstaciones = json_decode(file_get_contents(getcwd() . '/public/js/config.json'), true)['MAPA_COMUNA_A_ESTACIONES'];

        foreach ($geojsonData['features'] as &$feature) {
            $props = &$feature['properties'];
            $cutCom = (string)($props['CUT_COM'] ?? '');
            
            // Fusionar datos de sequía actual
            $this->fusionarDatosSequia($props, $mapaSequia, $cutCom);

            // Fusionar datos de persistencia
            $this->fusionarDatosPersistencia($props, $mapaComunaAEstaciones, $datosPersistencia);
        }
        return $geojsonData;
    }

    private function getDatosHistoricos($fechaBase, $numMeses) {
        $historicos = [];
        
        for ($i = 0; $i < $numMeses; $i++) {
            $fechaFetch = $this->calcularFechaMes($fechaBase, $i);
            $datosMes = $this->obtenerDatosMes($fechaFetch);
            
            if ($datosMes) {
                $this->procesarDatosMes($datosMes, $fechaFetch, $historicos);
            }
        }
        
        $this->ordenarHistoricosPorFecha($historicos);
        return $historicos;
    }
    
    /**
     * Calcula la fecha para un mes específico hacia atrás
     */
    private function calcularFechaMes($fechaBase, $mesesAtras) {
        $fechaFetch = clone $fechaBase;
        $fechaFetch->modify("-$mesesAtras months");
        return $fechaFetch;
    }
    
    /**
     * Obtiene los datos de sequía para una fecha específica
     */
    private function obtenerDatosMes($fecha) {
        $ano = (int) $fecha->format('Y');
        $mes = (int) $fecha->format('m');
        return $this->sequiaService->getDp3($ano, $mes);
    }
    
    /**
     * Procesa los datos de un mes y los agrega al histórico
     */
    private function procesarDatosMes($datosMes, $fecha, &$historicos) {
        foreach ($datosMes as $comuna) {
            $codigo = (string)$comuna['Code'];
            $comuna['fecha'] = $fecha->format('Y-m-d');
            
            $this->agregarComunaAlHistorico($historicos, $codigo, $comuna);
        }
    }
    
    /**
     * Agrega una comuna al histórico con ambos formatos de código
     */
    private function agregarComunaAlHistorico(&$historicos, $codigo, $comuna) {
        // Guardar con el código original
        $this->inicializarArraySiNoExiste($historicos, $codigo);
        $historicos[$codigo][] = $comuna;
        
        // También guardar con cero inicial si es código de 4 dígitos
        if (strlen($codigo) === 4) {
            $codigoConCero = '0' . $codigo;
            $this->inicializarArraySiNoExiste($historicos, $codigoConCero);
            $historicos[$codigoConCero][] = $comuna;
        }
    }
    
    /**
     * Inicializa un array en el histórico si no existe
     */
    private function inicializarArraySiNoExiste(&$historicos, $codigo) {
        if (!isset($historicos[$codigo])) {
            $historicos[$codigo] = [];
        }
    }
    
    /**
     * Ordena todos los registros históricos por fecha
     */
    private function ordenarHistoricosPorFecha(&$historicos) {
        foreach ($historicos as &$registros) {
            usort($registros, fn($a, $b) => strcmp($a['fecha'], $b['fecha']));
        }
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
        if (!$contenidoTxt) {
            return ['mapa' => [], 'periodos' => []];
        }

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
        
        $periodos = array_filter($cabecera, function($h) {
            // Verificamos si la cabecera comienza con 'p_'
            // Usamos substr en vez de str_starts_with por compatibilidad con PHP < 8
            return substr($h, 0, 2) === 'p_';
        });
        return ['mapa' => $mapaEstaciones, 'periodos' => array_values($periodos)];
    }
}