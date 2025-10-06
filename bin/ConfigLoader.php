<?php

declare(strict_types=1);

namespace DMC\Bin;

use DMC\Bin\Exception\ComposerAutoloaderNotFoundException;
use DMC\Bin\Exception\ConfigurationFileNotFoundException;
use DMC\Bin\Exception\ModuleListenerOptionsNotFoundException;

/**
 * Configuration loader utility class
 */
class ConfigLoader
{
    private string $projectRoot;
    private array $config;

    public function __construct(string $projectRoot = null)
    {
        $this->projectRoot = $projectRoot ?? dirname(__DIR__);
        $this->loadConfig();
    }

    /**
     * Load application configuration
     */
    private function loadConfig(): void
    {
        chdir($this->projectRoot);
        
        if (!file_exists('vendor/autoload.php')) {
            throw new ComposerAutoloaderNotFoundException();
        }
        
        require_once 'vendor/autoload.php';
        
        if (!file_exists('config/application.config.php')) {
            throw new ConfigurationFileNotFoundException();
        }
        
        /**
         * @SuppressWarnings(PHPMD.Include)
         * @codingStandardsIgnoreStart
         */
        // NOSONAR - FALSO POSITIVO: Este es un archivo de configuración PHP que DEBE ser incluido 
        // en tiempo de ejecución para obtener un array de configuración. No es una clase o namespace
        // que pueda importarse con "use". SonarQube está confundiendo la inclusión de archivos de
        // configuración con la importación de clases/namespaces.
        $this->config = include_once 'config/application.config.php'; // NOSONAR
        /** @codingStandardsIgnoreEnd */
    }

    /**
     * Get the loaded configuration
     */
    public function getConfig(): array
    {
        return $this->config;
    }

    /**
     * Get module listener options
     */
    public function getModuleListenerOptions(): array
    {
        if (!isset($this->config['module_listener_options'])) {
            throw new ModuleListenerOptionsNotFoundException();
        }
        
        return $this->config['module_listener_options'];
    }

    /**
     * Check if configuration cache is enabled
     */
    public function isConfigCacheEnabled(): bool
    {
        $options = $this->getModuleListenerOptions();
        return $options['config_cache_enabled'] ?? false;
    }

    /**
     * Get configuration cache file path
     */
    public function getConfigCacheFile(): string
    {
        $options = $this->getModuleListenerOptions();
        $cacheDir = $options['cache_dir'] ?? 'data/cache/';
        $cacheKey = $options['config_cache_key'] ?? 'application.config.cache';
        
        return $this->projectRoot . '/' . $cacheDir . $cacheKey . '.php';
    }
}
