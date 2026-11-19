# ICC Frontend

Клиент написан на React и собирается Vite. Из каталога client/react выполните:

    npm ci
    npm run dev

Для сервера разработки API проксируется на локальный Laravel в OSPanel. URL Vite выводится в терминале. Для своего окружения можно передать VITE_API_URL в .env.local.

    npm run build

Vite создаст dist. Для публикации в OSPanel скопируйте содержимое dist в client. Скопируйте папку assets до замены client/index.html. При открытии https://icc.local клиент обращается к https://api.icc.local/api. Производственная сборка не требует запуска Node.js.

Редактор использует Canvas, HTTP-клиент обращается к Laravel через fetch.
