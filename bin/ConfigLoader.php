<?php

declare(strict_types=1);

namespace DMC\Bin;

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
            throw new \RuntimeException('Composer autoloader not found. Run composer install first.');
        }
        
        require_once 'vendor/autoload.php';
        
        if (!file_exists('config/application.config.php')) {
            throw new \RuntimeException('Application configuration file not found.');
        }
        
        $this->config = include 'config/application.config.php';
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
            throw new \RuntimeException('No module listener options found in configuration.');
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
