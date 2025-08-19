<?php

declare(strict_types=1);

namespace Application\Model;

class SequiaDataService
{
    private function fetchApiData($ano, $mes)
    {
        $url = "https://prodatos.meteochile.gob.cl/intranet/caster/getdp3/{$ano}/{$mes}";
        
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        
        $json = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($httpCode === 200 && $json) {
            $data = json_decode($json, true);
            if (!empty($data['datos'])) {
                return $data['datos'];
            }
        }
        
        // Si la API falla, usar el respaldo local
        $fallbackPath = getcwd() . '/public/maps/data/dummy_api_data.json';
        if (file_exists($fallbackPath)) {
            $fallbackData = json_decode(file_get_contents($fallbackPath), true);
            return $fallbackData['datos'] ?? null;
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
