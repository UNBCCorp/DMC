<?php

declare(strict_types=1);

namespace DMC\Bin\Exception;

class ComposerAutoloaderNotFoundException extends \RuntimeException
{
    public function __construct(string $message = 'Composer autoloader not found. Run composer install first.', int $code = 0, \Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
