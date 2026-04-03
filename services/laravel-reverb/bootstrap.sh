#!/usr/bin/env bash
set -euo pipefail

if [ ! -f artisan ]; then
  composer create-project laravel/laravel .
  composer require laravel/reverb laravel/sanctum fakerphp/faker
  php artisan install:broadcasting --no-interaction || true
fi

cat > routes/api.php <<'ROUTES'
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/token', function (Request $request) {
    $user = \App\Models\User::firstOrCreate(
        ['email' => $request->input('email', fake()->safeEmail())],
        ['name' => fake()->name(), 'password' => bcrypt('password')]
    );

    return ['token' => $user->createToken('soccli')->plainTextToken, 'user' => $user];
});
ROUTES

php artisan migrate --force
php artisan reverb:start --host=0.0.0.0 --port=36722 &
php artisan serve --host=0.0.0.0 --port=36721
