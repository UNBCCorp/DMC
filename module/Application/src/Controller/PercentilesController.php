<?php

namespace Application\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\JsonModel;

class PercentilesController extends AbstractActionController
{
    /**
     * Endpoint para obtener datos de percentiles
     * Reemplaza a /public/api/datos_percentiles.php
     */
    public function datosAction()
    {
        $ruta_archivo_json = getcwd() . '/public/maps/data/datos_percentiles.json';

        if (file_exists($ruta_archivo_json)) {
            // Configurar headers de respuesta
            $response = $this->getResponse();
            $headers = $response->getHeaders();
            $headers->addHeaderLine('Content-Type', 'application/json; charset=utf-8');
            
            // Leer y devolver el contenido del archivo
            $content = file_get_contents($ruta_archivo_json);
            $data = json_decode($content, true);
            
            return new JsonModel($data);
        } else {
            $this->getResponse()->setStatusCode(503);
            return new JsonModel([
                'error' => 'Los datos de los mapas aún no están disponibles. Por favor, intente más tarde.'
            ]);
        }
    }
    
    /**
     * Acción para mostrar la vista de percentiles
     */
    public function indexAction()
    {
        return [];
    }
}
