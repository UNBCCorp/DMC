<?php

declare(strict_types=1);

namespace Application\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\ViewModel;

class IndexController extends AbstractActionController
{
    public function indexAction()
    {
        return new ViewModel();
    }
    public function monitorAction()
    {
        // Esta función le dice a Laminas que muestre la vista "monitor.phtml"
        return new ViewModel();
    }
    public function otrosAction()
    {
        // Esta función le dice a Laminas que muestre la vista "otrosindices.phtml"
        return new ViewModel();
    }
    public function percentilesAction()
    {
        // Esta función le dice a Laminas que muestre la vista "percentiles.phtml"
        return new ViewModel();
    }
    public function climaAction()
    {
        // Esta función le dice a Laminas que muestre la vista "clima.phtml"
        return new ViewModel();
    }
    public function climogramaAction()
    {
        // Esta función le dice a Laminas que muestre la vista "climograma.phtml"
        return new ViewModel();
    }
}

