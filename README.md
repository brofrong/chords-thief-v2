# chords-thief-v2

Telegram-бот: присылаешь ссылку на страницу с аккордами → бот качает HTML, вычищает шум cheerio-селекторами, стримит разбор через OpenRouter и умеет сохранить результат в `.md`.

## Setup

Нужен [Bun](https://bun.com) 1.4+.

```bash
bun install
cp .env.example .env
# заполни TELEGRAM_BOT_TOKEN (и опционально ADMIN_ID)
```

## Run

```bash
bun start
```

Скрипт запускает `src/index.ts`. Health-check слушает `HEALTH_PORT` (по умолчанию `8080`) и отвечает `ok`.

## Docker

```bash
cd docker
docker compose up --build -d
```

Compose монтирует `./db` и `./chords`, прокидывает env из `.env`, healthcheck бьёт в `http://127.0.0.1:8080`.

## Commands

| Command | Описание |
|---|---|
| `/start` | регистрация пользователя |
| `/set_api_token` | OpenRouter API key |
| `/set_ai_model` | выбор модели (picker / вручную) |
| `/set_master_prompt` | системный промпт |
| `/show_settings` | текущие настройки (ключ маскируется) |

Права `canParse` / `canSave` выдаются админу из `ADMIN_ID` при старте (остальным — вручную в БД).

## Env

См. `.env.example` — единственный перечень переменных.
