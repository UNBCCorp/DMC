<?php

declare(strict_types=1);

namespace Application\Model;

use Application\Exception\FileNotFoundException;
use Application\Exception\JsonProcessingException;

class ClimaDataService
{
    public function getDatosClima()
    {
        $geojsonComunasPath = getcwd() . '/public/maps/data/valp.geojson';
        $geojsonClimaPath = getcwd() . '/public/maps/data/ClimaPorComuna.geojson';
        
        if (!file_exists($geojsonComunasPath) || !file_exists($geojsonClimaPath)) {
            $archivoFaltante = !file_exists($geojsonComunasPath) ? $geojsonComunasPath : $geojsonClimaPath;
            throw new FileNotFoundException($archivoFaltante);
        }
        
        $geoJsonComunas = json_decode(file_get_contents($geojsonComunasPath), true);
        $geoJsonClima = json_decode(file_get_contents($geojsonClimaPath), true);
        
        if (!$geoJsonComunas || !$geoJsonClima) {
            $archivoProblematico = !$geoJsonComunas ? $geojsonComunasPath : $geojsonClimaPath;
            throw new JsonProcessingException("Error al parsear el archivo GeoJSON: {$archivoProblematico}");
        }
        
        return [
            'comunas' => $geoJsonComunas,
            'clima' => $geoJsonClima
        ];
    }
}

