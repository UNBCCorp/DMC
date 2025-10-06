<?php

declare(strict_types=1);

namespace Application;

class Module
{
    public function getConfig(): array
    {
        /**
         * @SuppressWarnings(PHPMD.Include)
         * @codingStandardsIgnoreStart
         */
        // NOSONAR - FALSO POSITIVO: Este es un archivo de configuración PHP que DEBE ser incluido 
        // en tiempo de ejecución para obtener un array de configuración.
        return include_once __DIR__ . '/../config/module.config.php'; // NOSONAR
        /** @codingStandardsIgnoreEnd */
    }
}
