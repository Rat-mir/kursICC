# Веб-сервис конструктора персонажей. Backend

ICC — Interactive Character Catalog. Серверная часть на Laravel 13, PHP 8.3+ и Laravel Sanctum. Текущий этап: КП 4.

## Установка

Требуются PHP с pdo_mysql, mbstring, openssl, fileinfo, curl и gd, Composer, MySQL и Git.

```sh
composer install
cp .env.example .env
php artisan key:generate
```

Создайте базу MySQL, укажите DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME и DB_PASSWORD в локальном .env. Установите APP_NAME=ICC, APP_LOCALE=ru и APP_URL для своего сервера.

```sh
php artisan migrate
php artisan serve
php artisan route:list --path=api
```

Проверка: GET http://127.0.0.1:8000/api/health. При доступной БД возвращаются JSON и код 200, при недоступной — 503. Передавайте Accept: application/json.

.env, vendor, node_modules и локальные данные исключены из Git. Пароли в .env.example отсутствуют. Перед публикацией настройте HTTPS и APP_DEBUG=false.

## Этапы

- КП 4: окружение Laravel, Sanctum и проверка подключения к БД
