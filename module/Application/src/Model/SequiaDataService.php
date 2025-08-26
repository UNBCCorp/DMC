<?php

declare(strict_types=1);

namespace Application\Model;

class SequiaDataService
{
    private function fetchApiData($ano, $mes)
    {
        $url = "https://climatologia.meteochile.gob.cl/application/serviciosb/getMonitorSequia/{$ano}/{$mes}";
        
        $curl = curl_init($url);
        
        // Configuración SSL: En desarrollo local (Laragon/XAMPP) es común tener problemas
        // con certificados SSL. En producción, se recomienda habilitar la verificación.
        $isProduction = isset($_SERVER['HTTP_HOST']) && !in_array($_SERVER['HTTP_HOST'], ['localhost', '127.0.0.1']);
        
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => $isProduction,
            CURLOPT_SSL_VERIFYHOST => $isProduction ? 2 : false,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ]);
        
        $json = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);
        
        // // Si hay error de cURL
        // if ($curlError) {
        //     return $this->getFallbackData();
        // }
        
        // // Si el código HTTP no es 200
        // if ($httpCode !== 200) {
        //     return $this->getFallbackData();
        // }
        
        // // Si no hay respuesta
        // if (!$json) {
        //     return $this->getFallbackData();
        // }
        
        // // Intentar decodificar JSON
        // $data = json_decode($json, true);
        // if (json_last_error() !== JSON_ERROR_NONE) {
        //     return $this->getFallbackData();
        // }
        
        // Verificar si existen los datos esperados
        if (!empty($data['datos'])) {
            // return $data['datos'];
        } elseif (!empty($data)) {
            return $data;
        }
        
        return $this->getFallbackData();
    }
    
    private function getFallbackData()
    {
        $fallbackPath = getcwd() . '/public/maps/data/dummy_api_data.json';
        if (file_exists($fallbackPath)) {
            $fallbackData = json_decode(file_get_contents($fallbackPath), true);
            if (!empty($fallbackData['datos'])) {
                return $fallbackData['datos'];
            } elseif (!empty($fallbackData)) {
                return $fallbackData;
            }
        }
        
        return null;
    }

    /**
     * Obtiene los datos del endpoint 'getdp3'.
     */
    public function getDp3($ano, $mes)
    {
        return $this->fetchApiData($ano, $mes);
    }
}
