<?php

declare(strict_types=1);

namespace Application\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\JsonModel;
use Laminas\View\Model\ViewModel;
use Application\Model\PercentilesDataService;

class PercentilesController extends AbstractActionController
{
    private $percentilesService;

    public function __construct(PercentilesDataService $percentilesService)
    {
        $this->percentilesService = $percentilesService;
    }

    public function indexAction()
    {
        return new ViewModel();
    }

    public function datosPercentilesAction()
    {
        try {
            $datos = $this->percentilesService->getDatosPercentiles();
            
            if ($datos === null) {
                $this->getResponse()->setStatusCode(503);
                return new JsonModel([
                    'error' => 'Los datos de los mapas aún no están disponibles. Por favor, intente más tarde.'
                ]);
            }

            return new JsonModel($datos);

        } catch (\Exception $e) {
            $this->getResponse()->setStatusCode(500);
            return new JsonModel([
                'error' => 'Error interno del servidor: ' . $e->getMessage()
            ]);
        }
    }
}
