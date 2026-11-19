# Проверка серверной части

Дата: 19.11.2026. PHP 8.4, MySQL 8.4.7. Проверки выполнялись в отдельной рабочей копии с базой icc_backend_test.

- `php artisan test --log-junit=storage/logs/kp10-tests.xml`: 40 тестов, 226 проверок, ошибок и пропусков нет.
- `php artisan route:list --path=api --json`: маршруты успешно загружаются.
- `php artisan scribe:generate --no-interaction`: HTML, OpenAPI и коллекция Postman созданы. Scribe выводит предупреждения сторонней библиотеки о deprecated nullable-параметрах PHP 8.4 и о необязательных методах bodyParameters; генерация завершается успешно.
- `/api/health`: 200, `database=ok`, `driver=mysql`, `server_version=8.4.7`. Проверен запуск health для всех семи этапов КП 4–10.
- Учебный `CourseworkDatasetSeeder`: users=10, makers=10, assets=60, characters=10, posts=10, comments=10, likes=10, asset_character=60. Обычный DatabaseSeeder приложения не изменён.
- `.env`, `.env.testing`, vendor, node_modules и клиент отсутствуют в серверной истории. Секреты подключения остаются в локальных файлах.

История собрана заново по этапам КП 4–10. Даты коммитов соответствуют дате пересборки. Тесты фиксируют проверку итоговой серверной версии; промежуточные этапы не заявлены как полные копии готового приложения.
