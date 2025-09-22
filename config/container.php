<?php

use Laminas\Mvc\Application;
use Laminas\Stdlib\ArrayUtils;

// Retrieve configuration
$appConfig = require_once __DIR__ . '/application.config.php'; // NOSONAR - Config file inclusion, not a class import
if (file_exists(__DIR__ . '/development.config.php')) {
    /** @var array $devConfig */
    $devConfig = require_once __DIR__ . '/development.config.php'; // NOSONAR - Config file inclusion, not a class import
    $appConfig = ArrayUtils::merge($appConfig, $devConfig);
}

return Application::init($appConfig)
    ->getServiceManager();
