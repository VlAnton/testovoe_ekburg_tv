# testovoe_ekburg_tv

handlers.js — хэндлеры запросов
app.js — express-приложение

db:
- index.js — клиент postgres
- setup_table.sql — скрипт для создания таблички

Чтобы запустить приложение, необходимо указать имя пользователя и базу данных по умолчанию в index.js, а затем прописать `sh run.sh` в терминале.
UPD. Оказывается, можно вставить пустую строку в username и database, и оно само определит базу и юзера по умолчанию.

Методы и урлы приложения:
- /api/notes с методом GET — list всех заметок;
- /api/notes с методом POST — создание новой заметки;
- /api/notes/:id с методом GET — получение заметки по индексу;
- /api/notes/:id с методом PATCH — изменение существующей.

Nginx реверс-проксирует 8080 порт, сам работает на 80. На 90 порту отдаёт картинки (например, http://localhost:90/IMG_2987.JPG). Конфигурация — в файле nginx.conf.

Redis обновляет кэш при создании новой заметки, обновлении старой или если мы используем один из GET-запросов, не имея предварительно кэш.
