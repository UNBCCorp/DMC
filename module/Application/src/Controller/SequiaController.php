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
            $datosHistoricos = $this->sequiaBaseService->getDatosHistoricos($fechaBase, 12, $this->sequiaService);

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

}
