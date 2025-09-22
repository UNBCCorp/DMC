<?php

declare(strict_types=1);

namespace Application\Service;

use Application\Exception\SequiaDataException;
use Application\Exception\FileNotFoundException;

/**
 * Servicio base compartido para lógica común de sequía
 * Elimina duplicación entre ApiController y SequiaController
 */
class SequiaBaseService
{
    /**
     * Calcula la fecha base según la lógica del negocio
     */
    public function calcularFechaBase(): \DateTime
    {
        $hoy = new \DateTime();
        $diaDeHoy = (int) $hoy->format('d');
        $fechaBase = new \DateTime();
        
        if ($diaDeHoy < 17) {
            $fechaBase->modify('-2 months');
        } else {
            $fechaBase->modify('-1 month');
        }
        
        return $fechaBase;
    }
    
    /**
     * Normaliza el nombre de una comuna para búsqueda
     */
    public function normalizarNombreComuna(?string $nombreComuna): string
    {
        return strtoupper(trim(str_replace(['Á','É','Í','Ó','Ú'], ['A','E','I','O','U'], $nombreComuna ?? '')));
    }
    
    /**
     * Valida y obtiene datos de sequía actual
     */
    public function validarDatosSequiaActual($datosSequiaActual, int $ano, int $mes): void
    {
        if ($datosSequiaActual === null) {
            throw new SequiaDataException("No se pudieron obtener datos de sequía actual para el período {$ano}-{$mes}");
        }
    }
    
    /**
     * Carga y valida archivo GeoJSON
     */
    public function cargarGeojsonBase(): array
    {
        $geojsonPath = getcwd() . '/public/maps/data/valp.geojson';
        if (!file_exists($geojsonPath)) {
            throw new FileNotFoundException($geojsonPath);
        }
        
        return json_decode(file_get_contents($geojsonPath), true);
    }
    
    /**
     * Calcula promedios regionales de datos de sequía
     */
    public function calcularPromediosRegionales(array $datos): array
    {
        $promedios = [];
        $categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
        $sumas = array_fill_keys($categorias, 0);
        $totalComunas = count($datos);
        
        if ($totalComunas === 0) {
            return $sumas;
        }

        foreach ($datos as $comuna) {
            foreach ($categorias as $cat) {
                $sumas[$cat] += (float)($comuna[$cat] ?? 0);
            }
        }
        
        foreach ($sumas as $cat => $suma) {
            $promedios[$cat] = round($suma / $totalComunas, 1);
        }
        
        return $promedios;
    }
    
    /**
     * Calcula histórico regional de datos
     */
    public function calcularHistoricoRegional(array $datosHistoricos): array
    {
        $promediosMensuales = [];
        $categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
        
        foreach ($datosHistoricos as $historialComuna) {
            foreach ($historialComuna as $registro) {
                $monthKey = substr($registro['fecha'], 0, 7);
                if (!isset($promediosMensuales[$monthKey])) {
                    $promediosMensuales[$monthKey] = [
                        'sumas' => array_fill_keys($categorias, 0),
                        'count' => 0,
                        'fecha' => $registro['fecha']
                    ];
                }
                foreach ($categorias as $cat) {
                    $promediosMensuales[$monthKey]['sumas'][$cat] += (float)($registro[$cat] ?? 0);
                }
                $promediosMensuales[$monthKey]['count']++;
            }
        }
        
        usort($promediosMensuales, fn($a, $b) => strcmp($a['fecha'], $b['fecha']));
        
        $resultado = ['labels' => [], 'series' => array_fill_keys($categorias, [])];
        foreach ($promediosMensuales as $dataMes) {
            $fecha = new \DateTime($dataMes['fecha']);
            $resultado['labels'][] = $fecha->format('M y');
            foreach ($categorias as $cat) {
                $resultado['series'][$cat][] = round($dataMes['sumas'][$cat] / $dataMes['count'], 1);
            }
        }
        
        return $resultado;
    }
}
