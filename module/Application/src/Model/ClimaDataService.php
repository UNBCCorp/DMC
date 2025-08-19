<?php

declare(strict_types=1);

namespace Application\Model;

class ClimaDataService
{
    public function getDatosClima()
    {
        $geojsonComunasPath = getcwd() . '/public/maps/data/valp.geojson';
        $geojsonClimaPath = getcwd() . '/public/maps/data/ClimaPorComuna.geojson';
        
        if (!file_exists($geojsonComunasPath) || !file_exists($geojsonClimaPath)) {
            throw new \Exception('No se pudieron cargar los archivos GeoJSON necesarios.');
        }
        
        $geoJsonComunas = json_decode(file_get_contents($geojsonComunasPath), true);
        $geoJsonClima = json_decode(file_get_contents($geojsonClimaPath), true);
        
        if (!$geoJsonComunas || !$geoJsonClima) {
            throw new \Exception('Error al parsear los archivos GeoJSON.');
        }
        
        return [
            'comunas' => $geoJsonComunas,
            'clima' => $geoJsonClima
        ];
    }
}
