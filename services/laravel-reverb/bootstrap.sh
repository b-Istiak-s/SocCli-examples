#!/usr/bin/env bash
set -euo pipefail

: "${REVERB_APP_ID:=local}"
: "${REVERB_APP_KEY:=localkey}"
: "${REVERB_APP_SECRET:=localsecret}"
: "${APP_KEY:=base64:8fF4fIXD8prk6if3wW3E+w9u6P/6WzQxQB2eQ6jQ4W0=}"

if [ ! -f artisan ]; then
  composer create-project laravel/laravel .
  composer require laravel/reverb laravel/sanctum fakerphp/faker
  php artisan install:api --no-interaction || true
  php artisan install:broadcasting --no-interaction || true
fi

if [ -f .env ]; then
  sed -i "s#^APP_KEY=.*#APP_KEY=${APP_KEY}#" .env || true
  sed -i "s#^DB_CONNECTION=.*#DB_CONNECTION=sqlite#" .env || true
  grep -q '^DB_CONNECTION=sqlite' .env || echo 'DB_CONNECTION=sqlite' >> .env
  grep -q '^REVERB_APP_ID=' .env && sed -i "s#^REVERB_APP_ID=.*#REVERB_APP_ID=${REVERB_APP_ID}#" .env || echo "REVERB_APP_ID=${REVERB_APP_ID}" >> .env
  grep -q '^REVERB_APP_KEY=' .env && sed -i "s#^REVERB_APP_KEY=.*#REVERB_APP_KEY=${REVERB_APP_KEY}#" .env || echo "REVERB_APP_KEY=${REVERB_APP_KEY}" >> .env
  grep -q '^REVERB_APP_SECRET=' .env && sed -i "s#^REVERB_APP_SECRET=.*#REVERB_APP_SECRET=${REVERB_APP_SECRET}#" .env || echo "REVERB_APP_SECRET=${REVERB_APP_SECRET}" >> .env
fi

mkdir -p database
touch database/database.sqlite

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

cat > routes/channels.php <<'CHANNELS'
<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('private-users.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
CHANNELS

php artisan migrate --force
php artisan reverb:start --host=0.0.0.0 --port=36722 &
php artisan serve --host=0.0.0.0 --port=36721
