<?php
// Archivo: module/Application/src/Controller/TestController.php

namespace Application\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\JsonModel;

class TestController extends AbstractActionController
{
    // Este controlador no tiene constructor ni dependencias.

    public function pingAction()
    {
        return new JsonModel(['status' => 'ok', 'message' => 'El enrutador funciona!']);
    }
}