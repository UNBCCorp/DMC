<?php

declare(strict_types=1);

namespace DMC\Bin\Exception;

class ModuleListenerOptionsNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'No module listener options found in configuration.', int $code = 0, \Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
