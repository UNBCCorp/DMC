<?php

namespace Application\Exception;

class FileNotFoundException extends \Exception
{
    public function __construct($filePath = "", $code = 0, \Throwable $previous = null)
    {
        $message = $filePath ? "No se encontró el archivo: {$filePath}" : "Archivo no encontrado";
        parent::__construct($message, $code, $previous);
    }
}
