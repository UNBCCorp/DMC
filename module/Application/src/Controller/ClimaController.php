<?php

declare(strict_types=1);

namespace Application\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\JsonModel;
use Laminas\View\Model\ViewModel;
use Application\Model\ClimaDataService;

class ClimaController extends AbstractActionController
{
    private $climaService;

    public function __construct(ClimaDataService $climaService)
    {
        $this->climaService = $climaService;
    }

    public function indexAction()
    {
        return new ViewModel();
    }

    public function datosClimaAction()
    {
        try {
            $datos = $this->climaService->getDatosClima();
            return new JsonModel($datos);

        } catch (\Exception $e) {
            $this->getResponse()->setStatusCode(500);
            return new JsonModel([
                'error' => 'Error al cargar datos de clima: ' . $e->getMessage()
            ]);
        }
    }
}
