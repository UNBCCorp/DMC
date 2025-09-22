<?php

namespace Application\Exception;

class SequiaDataException extends \Exception
{
    public function __construct($message = "Error al obtener datos de sequía", $code = 0, \Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
