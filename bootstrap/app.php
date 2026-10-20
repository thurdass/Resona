<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

$application = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustHosts(at: ['^127\\.0\\.0\\.1$', '^localhost$'], subdomains: false);
        $middleware->validateCsrfTokens(except: ['internal/import']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

if (PHP_OS_FAMILY === 'Windows') {
    foreach (range('A', 'Z') as $drive) {
        $application->addAbsoluteCachePathPrefix($drive.':');
        $application->addAbsoluteCachePathPrefix(strtolower($drive).':');
    }
}

return $application;
