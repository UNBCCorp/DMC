<?php
// Archivo: module/Application/src/Model/ApiDataService.php

namespace Application\Model;

class ApiDataService {

     private function fetchApiData( $ano, $mes) {
        $url = "https://prodatos.meteochile.gob.cl/intranet/caster/getdp3/{$ano}/{$mes}";
        
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_TIMEOUT => 10, // Es bueno tener un timeout
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        
        $json = curl_exec($curl);
        curl_close($curl);
        
        if (!$json) {
            // Podrías lanzar una excepción o devolver null
            return null;
        }
        
        $data = json_decode($json, true);
        // Devuelve solo el array 'datos' o null si no existe
        return $data['datos'] ?? null;
    }

    /**
     * Obtiene los datos del endpoint 'getdp3'.
     */
    public function getDp3($ano, $mes) {
        return $this->fetchApiData( $ano, $mes);
    }

  
}