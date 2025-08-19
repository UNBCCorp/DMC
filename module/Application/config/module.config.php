<?php

declare(strict_types=1);

namespace Application;

use Laminas\Router\Http\Literal;
use Laminas\Router\Http\Segment;
use Laminas\ServiceManager\Factory\InvokableFactory;

return [
    'router' => [
        'routes' => [
            'home' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/',
                    'defaults' => [
                        'controller' => Controller\IndexController::class,
                        'action'     => 'index',
                    ],
                ],
            ],
            'application' => [
                'type'    => Segment::class,
                'options' => [
                    'route'    => '/application[/:action]',
                    'defaults' => [
                        'controller' => Controller\IndexController::class,
                        'action'     => 'index',
                    ],
                ],
            ],
            'indice-combinado' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/indice-combinado', // La URL que el usuario visitará
                    'defaults' => [
                        'controller' => Controller\SequiaController::class, // El controlador que se usará
                        'action'     => 'index', // La función dentro del controlador
                    ],
                ],
            ],
            'otros-indices' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/otros-indices', // La URL que el usuario visitará
                    'defaults' => [
                        'controller' => Controller\IndexController::class, // El controlador que se usará
                        'action'     => 'otros', // La función dentro del controlador
                    ],
                ],
            ],
            'percentiles' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/mapas-percentiles', // La URL que el usuario visitará
                    'defaults' => [
                        'controller' => Controller\PercentilesController::class, // El controlador que se usará
                        'action'     => 'index', // La función dentro del controlador
                    ],
                ],
            ],
            'climas-regional' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/clima-regional', // La URL que el usuario visitará
                    'defaults' => [
                        'controller' => Controller\ClimaController::class, // El controlador que se usará
                        'action'     => 'index', // La función dentro del controlador
                    ],
                ],
            ],
            'climograma' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/climograma', // La URL que el usuario visitará
                    'defaults' => [
                        'controller' => Controller\IndexController::class, // El controlador que se usará
                        'action'     => 'climograma', // La función dentro del controlador
                    ],
                ],
            ],
            'api-sequia' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/api/sequia', // La URL debe coincidir con la del 'fetch'
                    'defaults' => [
                        'controller' => Controller\SequiaController::class,
                        'action'     => 'datosSequia',
                    ],
                ],
            ],
            'api-percentiles' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/api/datos_percentiles',
                    'defaults' => [
                        'controller' => Controller\PercentilesController::class,
                        'action'     => 'datosPercentiles',
                    ],
                ],
            ],
            'api-clima' => [
                'type'    => Literal::class,
                'options' => [
                    'route'    => '/api/clima',
                    'defaults' => [
                        'controller' => Controller\ClimaController::class,
                        'action'     => 'datosClima',
                    ],
                ],
            ],
            'ping-test' => [
                'type'    => \Laminas\Router\Http\Literal::class,
                'options' => [
                    'route'    => '/ping',
                    'defaults' => [
                        'controller' => \Application\Controller\TestController::class,
                        'action'     => 'ping',
                    ],
                ],
            ],

        ],
    ],
    'controllers' => [
        'factories' => [
            \Application\Controller\IndexController::class => \Laminas\ServiceManager\Factory\InvokableFactory::class,
            \Application\Controller\TestController::class => \Laminas\ServiceManager\Factory\InvokableFactory::class,

            \Application\Controller\ApiController::class => function($container) {
                $service = $container->get(\Application\Model\ApiDataService::class);
                return new \Application\Controller\ApiController($service);
            },
            \Application\Controller\PercentilesController::class => function($container) {
                $service = $container->get(\Application\Model\PercentilesDataService::class);
                return new \Application\Controller\PercentilesController($service);
            },
            \Application\Controller\ClimaController::class => function($container) {
                $service = $container->get(\Application\Model\ClimaDataService::class);
                return new \Application\Controller\ClimaController($service);
            },
            \Application\Controller\SequiaController::class => function($container) {
                $service = $container->get(\Application\Model\SequiaDataService::class);
                return new \Application\Controller\SequiaController($service);
            },
        ],
    ],
    'service_manager' => [
        'factories' => [
            Model\ApiDataService::class => InvokableFactory::class,
            Model\PercentilesDataService::class => InvokableFactory::class,
            Model\ClimaDataService::class => InvokableFactory::class,
            Model\SequiaDataService::class => InvokableFactory::class,
            Model\DataManagerService::class => InvokableFactory::class,
        ],
    ],
    'view_manager' => [
        'display_not_found_reason' => true,
        'display_exceptions'       => true,
        'doctype'                  => 'HTML5',
        'not_found_template'       => 'error/404',
        'exception_template'       => 'error/index',
        'template_map' => [
        ],
        'template_path_stack' => [
            __DIR__ . '/../view',
        ],
        'strategies' => [
            'ViewJsonStrategy',
    ],
    ],
];
