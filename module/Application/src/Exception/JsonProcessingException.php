<?php

namespace Application\Exception;

class JsonProcessingException extends \Exception
{
    public function __construct($message = "Error al procesar JSON", $code = 0, \Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
