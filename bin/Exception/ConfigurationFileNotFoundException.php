<?php

declare(strict_types=1);

namespace DMC\Bin\Exception;

class ConfigurationFileNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Application configuration file not found.', int $code = 0, \Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
