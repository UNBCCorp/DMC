<?php

declare(strict_types=1);

namespace Application\Model;

class PercentilesDataService
{
    public function getDatosPercentiles()
    {
        $rutaArchivoJson = getcwd() . '/public/maps/data/datos_percentiles.json';
        
        if (!file_exists($rutaArchivoJson)) {
            return null;
        }
        
        $contenido = file_get_contents($rutaArchivoJson);
        if ($contenido === false) {
            return null;
        }
        
        return json_decode($contenido, true);
    }
}
