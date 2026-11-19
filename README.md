# Веб-сервис конструктора персонажей. Backend

ICC — Interactive Character Catalog. Серверная часть на Laravel 13, PHP 8.3+ и Laravel Sanctum. Текущий этап: КП 8.

## Установка

Требуются PHP с pdo_mysql, mbstring, openssl, fileinfo, curl и gd, Composer, MySQL и Git.

```sh
composer install
cp .env.example .env
php artisan key:generate
```

Создайте базу MySQL, укажите DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME и DB_PASSWORD в локальном .env. Установите APP_NAME=ICC, APP_LOCALE=ru и APP_URL для своего сервера.

```sh
php artisan migrate --seed
php artisan serve
php artisan route:list --path=api
```

Проверка: GET http://127.0.0.1:8000/api/health. При доступной БД возвращаются JSON и код 200, при недоступной — 503. Передавайте Accept: application/json.

.env, vendor, node_modules и локальные данные исключены из Git. Пароли в .env.example отсутствуют. Перед публикацией настройте HTTPS и APP_DEBUG=false.

## Этапы

- КП 4: окружение Laravel, Sanctum и проверка подключения к БД
- КП 5: миграции, модели, связи, фабрики и ресурсы API
- КП 6: маршруты REST API, контроллеры и сервисы
- КП 7: CRUD связанных данных, валидация и JSON-ошибки
- КП 8: регистрация, токены Sanctum, роли и политики доступа

## Данные и доступ

Сущности: User, Maker, Asset, Character, Post, Comment, Like. Связь Character–Asset хранится в asset_character с порядком слоёв. Модели, фабрики, миграции и сидеры находятся в database и app/Models; валидация — app/Http/Requests, ответы — app/Http/Resources.

Локальные демонстрационные аккаунты: admin@icc.test, creator@icc.test, user@icc.test; пароль DemoPass123!. Для реального размещения эти пароли нужно заменить.
