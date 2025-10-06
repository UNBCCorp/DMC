<?php

declare(strict_types=1);

use Laminas\ModuleManager\Listener\ListenerOptions;

chdir(__DIR__ . '/../');
require_once 'vendor/autoload.php';

// @SuppressWarnings(php:S1409) - Config file inclusion, not a class import
$config = include_once 'config/application.config.php'; // NOSONAR

if (! isset($config['module_listener_options'])) {
    echo "No module listener options found. Can not determine config cache location." . PHP_EOL;
    exit(0);
}

$options = new ListenerOptions($config['module_listener_options']);
$configCacheFile = $options->getConfigCacheFile();

if (!file_exists($configCacheFile)) {
    printf(
        "Configured config cache file '%s' not found%s",
        $configCacheFile,
        PHP_EOL
    );
    exit(0);
}

if (false === unlink($configCacheFile)) {
    printf(
        "Error removing config cache file '%s'%s",
        $configCacheFile,
        PHP_EOL
    );
    exit(1);
}

printf(
    "Removed configured config cache file '%s'%s",
    $configCacheFile,
    PHP_EOL
);
exit(0);
