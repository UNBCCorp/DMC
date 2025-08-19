<?php

declare(strict_types=1);

namespace Application\Model;

/**
 * Servicio centralizado para la gestión de datos del proyecto DMC
 * Mantiene toda la lógica de procesamiento de datos en un lugar centralizado
 */
class DataManagerService
{
    private $basePath;
    
    public function __construct()
    {
        $this->basePath = getcwd() . '/public';
    }

    /**
     * Obtiene los datos de GeoJSON base de las comunas
     */
    public function getGeojsonComunas(): array
    {
        $path = $this->basePath . '/maps/data/valp.geojson';
        if (!file_exists($path)) {
            throw new \Exception('No se encontró el archivo GeoJSON de comunas');
        }
        
        $data = json_decode(file_get_contents($path), true);
        if (!$data) {
            throw new \Exception('Error al parsear el archivo GeoJSON de comunas');
        }
        
        return $data;
    }

    /**
     * Obtiene los datos de clima por comuna
     */
    public function getGeojsonClima(): array
    {
        $path = $this->basePath . '/maps/data/ClimaPorComuna.geojson';
        if (!file_exists($path)) {
            throw new \Exception('No se encontró el archivo GeoJSON de clima');
        }
        
        $data = json_decode(file_get_contents($path), true);
        if (!$data) {
            throw new \Exception('Error al parsear el archivo GeoJSON de clima');
        }
        
        return $data;
    }

    /**
     * Obtiene la configuración de mapeo de comunas a estaciones
     */
    public function getMapaComunaEstaciones(): array
    {
        $path = $this->basePath . '/js/config.json';
        if (!file_exists($path)) {
            throw new \Exception('No se encontró el archivo de configuración');
        }
        
        $data = json_decode(file_get_contents($path), true);
        if (!$data || !isset($data['MAPA_COMUNA_A_ESTACIONES'])) {
            throw new \Exception('Error al parsear el archivo de configuración');
        }
        
        return $data['MAPA_COMUNA_A_ESTACIONES'];
    }

    /**
     * Busca el archivo de índices más reciente
     */
    public function buscarArchivoIndicesMasReciente(int $mesesAtras = 6): ?string
    {
        $hoy = new \DateTime();
        
        for ($i = 1; $i <= $mesesAtras; $i++) {
            $fecha = clone $hoy;
            $fecha->sub(new \DateInterval("P{$i}M"));
            $rutaArchivo = $this->basePath . '/maps/data/salida/spi/txt/' . $fecha->format('Y_m') . '_indices.txt';
            
            if (file_exists($rutaArchivo)) {
                return file_get_contents($rutaArchivo);
            }
        }
        
        return null;
    }

    /**
     * Parsea el contenido de un archivo de índices TXT
     */
    public function parsearArchivoIndices(string $contenido): array
    {
        if (empty($contenido)) {
            throw new \Exception('El contenido del archivo está vacío');
        }

        $lineas = explode("\n", trim($contenido));
        $cabeceraRaw = array_shift($lineas);
        $cabecera = array_map(function($h) {
            $hLimpia = trim($h);
            return is_numeric($hLimpia) ? "p_{$hLimpia}m" : $hLimpia;
        }, explode(',', $cabeceraRaw));

        $datosParseados = [];
        foreach ($lineas as $linea) {
            if (empty(trim($linea))) continue;
            
            $valores = explode(',', trim($linea));
            $estacionObj = [];
            
            foreach ($cabecera as $index => $clave) {
                if (!isset($valores[$index])) continue;
                
                $valor = trim($valores[$index]);
                $estacionObj[$clave] = is_numeric($valor) ? (float)$valor : $valor;
            }
            
            if (!empty($estacionObj)) {
                $datosParseados[] = $estacionObj;
            }
        }

        return $datosParseados;
    }

    /**
     * Normaliza una cadena de texto para comparaciones
     */
    public function normalizarTexto(string $texto): string
    {
        return strtoupper(trim(str_replace(
            ['Á', 'É', 'Í', 'Ó', 'Ú', 'á', 'é', 'í', 'ó', 'ú'], 
            ['A', 'E', 'I', 'O', 'U', 'a', 'e', 'i', 'o', 'u'], 
            $texto
        )));
    }

    /**
     * Calcula la fecha base para obtener datos según la lógica del negocio
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
}
