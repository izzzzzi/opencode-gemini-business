<div align="center">

# 🔄 opencode-gemini-business

**Мульти-аккаунтный пул Gemini Business с интеллектуальной ротацией для OpenCode**

[![npm version](https://img.shields.io/npm/v/opencode-gemini-business.svg?style=flat&colorA=18181B&colorB=28CF8D)](https://www.npmjs.com/package/opencode-gemini-business)
[![npm downloads](https://img.shields.io/npm/dm/opencode-gemini-business.svg?style=flat&colorA=18181B&colorB=28CF8D)](https://www.npmjs.com/package/opencode-gemini-business)
[![GitHub release](https://img.shields.io/github/v/release/izzzzzi/opencode-gemini-business?style=flat&colorA=18181B&colorB=28CF8D)](https://github.com/izzzzzi/opencode-gemini-business/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat&colorA=18181B&colorB=28CF8D)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&colorA=18181B&colorB=3178C6)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-ESM-green?style=flat&colorA=18181B&colorB=339933)](https://nodejs.org/)

**🇷🇺 Русский** | [🇬🇧 English](README.md)

<br />

*Auth-плагин для [OpenCode](https://github.com/anomalyco/opencode) — пул из нескольких аккаунтов Gemini Business с автоматической ротацией, фейловером и балансировкой нагрузки.*

</div>

---

## 📖 Обзор

**opencode-gemini-business** — плагин для OpenCode, который обеспечивает ротацию между несколькими аккаунтами **Gemini Business API** (`business.gemini.google`), предоставляя автоматическое переключение при ошибках и балансировку нагрузки.

> **Важно**: Плагин использует **Gemini Business / Enterprise API**, НЕ Google AI Studio.

---

## ✨ Возможности

| Возможность | Описание |
|-------------|----------|
| 🔄 **Ротация аккаунтов** | Автоматическое переключение между несколькими аккаунтами Gemini Business |
| 🛡️ **Автоматический фейловер** | Повторные запросы с другим аккаунтом при ошибках |
| 🔐 **JWT-аутентификация** | Встроенное получение XSRF-токена и подписание JWT (HS256) |
| 📡 **Поддержка стриминга** | Полная поддержка SSE, JSON-lines и fallback-парсинга |
| ⚙️ **Гибкие стратегии** | Round-robin, least-used или случайный выбор |
| 🔑 **Автонастройка auth** | `add-account` автоматически создаёт auth-запись OpenCode |

---

## 🤖 Поддерживаемые модели

| Модель | Internal API ID | Для чего |
|--------|:---------------:|----------|
| `gemini-2.5-flash` | `gemini-2.5-flash` | Повседневные задачи, быстрые ответы |
| `gemini-2.5-pro` | `gemini-2.5-pro` | Сложные рассуждения |
| `gemini-3-flash` | `gemini-3-flash-preview` | Новое поколение, быстрая |
| `gemini-3-pro` | `gemini-3-pro-preview` | Новое поколение, рассуждения |

---

## 🚀 Быстрый старт

### Шаг 1: Настроить OpenCode

Добавьте в `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gemini-business@latest"],
  "provider": {
    "gemini-business": {
      "name": "Gemini Business",
      "options": {
        "baseURL": "https://business.gemini.google/v1",
        "apiKey": "unused"
      },
      "models": {
        "gemini-2.5-flash": { "name": "Gemini 2.5 Flash" },
        "gemini-2.5-pro": { "name": "Gemini 2.5 Pro" },
        "gemini-3-flash": { "name": "Gemini 3 Flash" },
        "gemini-3-pro": { "name": "Gemini 3 Pro" }
      }
    }
  }
}
```

### Шаг 2: Добавить аккаунт Gemini Business

Установите CLI-инструмент:

```bash
npm install -g opencode-gemini-business
```

Добавьте аккаунт:

```bash
opencode-gemini-business add-account \
  "Мой аккаунт" \
  "e1f353e7-0291-44cf-9085-e0b6efd20e41" \
  "CSE.AXUaAj_MKeqeFLr_..." \
  "COS.AfQtEyCcW1aLwKb3..." \
  "1370433092"
```

Аргументы:

| # | Аргумент | Описание |
|:-:|----------|----------|
| 1 | Имя аккаунта | Отображаемое имя аккаунта |
| 2 | `team_id` | UUID из URL `/cid/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/` |
| 3 | `__Secure-C_SES` | Значение cookie (начинается с `CSE.`) |
| 4 | `__Host-C_OSES` | Значение cookie (начинается с `COS.`) |
| 5 | `csesidx` | Число из URL `?csesidx=...` |

Или через переменные окружения:

```bash
export GEMINI_ACCOUNT_NAME="Мой аккаунт"
export GEMINI_TEAM_ID="e1f353e7-0291-44cf-9085-e0b6efd20e41"
export GEMINI_SECURE_C_SES="CSE.AXUaAj_MKeqeFLr_..."
export GEMINI_HOST_C_OSES="COS.AfQtEyCcW1aLwKb3..."
export GEMINI_CSESIDX="1370433092"

opencode-gemini-business add-account
```

> **Примечание:** `add-account` автоматически создаёт auth-запись в `~/.local/share/opencode/auth.json`, поэтому запускать `opencode auth login` не нужно.

### Шаг 3: Использовать

```bash
# Flash (быстрая)
opencode run --model=gemini-business/gemini-2.5-flash "Исправь баг"

# Pro (лучшее качество)
opencode run --model=gemini-business/gemini-2.5-pro "Спроектируй архитектуру"

# Модели нового поколения
opencode run --model=gemini-business/gemini-3-flash "Быстрая задача"
opencode run --model=gemini-business/gemini-3-pro "Сложное рассуждение"
```

Установить модель по умолчанию в `opencode.json`:

```json
{
  "model": "gemini-business/gemini-2.5-flash"
}
```

---

## 🔍 Извлечение учётных данных

### Где найти каждое значение

Войдите в [business.gemini.google](https://business.gemini.google) и посмотрите URL:

```
https://business.gemini.google/home/cid/e1f353e7-0291-44cf-9085-e0b6efd20e41/r/session/123?csesidx=1370433092
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                  ^^^^^^^^^^
                                        team_id (UUID после /cid/)                            csesidx
```

### Cookies

**Способ 1: Расширение браузера (рекомендуется)**

1. Установите [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. Откройте `business.gemini.google` и экспортируйте cookies
3. Найдите `__Secure-C_SES` (начинается с `CSE.`) и `__Host-C_OSES` (начинается с `COS.`)

**Способ 2: DevTools**

1. Откройте DevTools (F12) → **Application** → **Cookies** → `https://business.gemini.google`
2. Скопируйте значения `__Secure-C_SES` и `__Host-C_OSES`

---

## 🔧 Управление аккаунтами

```bash
# Список аккаунтов
opencode-gemini-business list-accounts

# Тест подключения
opencode-gemini-business test-account <account_id>

# Удалить аккаунт
opencode-gemini-business remove-account <account_id>

# Помощь
opencode-gemini-business help
```

---

## ⚙️ Стратегии ротации

| Стратегия | Поведение |
|-----------|-----------|
| `round-robin` (по умолчанию) | Циклический обход аккаунтов по порядку |
| `least-used` | Выбор наименее недавно использованного |
| `random` | Случайный выбор |

Настраивается в `~/.config/opencode/gemini-business-accounts.json` (создаётся автоматически при первом `add-account`).

---

## 🛠️ Как это работает

1. Плагин регистрируется как auth-провайдер `gemini-business` в OpenCode
2. При запросе `loader()` возвращает кастомную функцию `fetch()`
3. Кастомный `fetch()` перехватывает запрос от `@ai-sdk/openai-compatible`
4. Вместо вызова `baseURL/chat/completions` он:
   - Выбирает аккаунт по стратегии ротации
   - Получает XSRF-токен и создаёт JWT (HS256)
   - Создаёт сессию через `widgetCreateSession`
   - Отправляет запрос на `widgetStreamAssist`
   - Конвертирует ответ в OpenAI-совместимый формат
5. Поддерживает стриминг (SSE) и обычные ответы

---

## ❓ FAQ

<details>
<summary><b>В: Где найти team_id?</b></summary>

Посмотрите URL в браузере: `https://business.gemini.google/home/cid/e1f353e7-0291-44cf-9085-e0b6efd20e41/...`

UUID после `/cid/` — это ваш `team_id`.
</details>

<details>
<summary><b>В: Нужно ли запускать `opencode auth login`?</b></summary>

Нет. Команда `add-account` автоматически создаёт auth-запись в `~/.local/share/opencode/auth.json`. Если по какой-то причине запись не создалась, запустите `opencode auth login`, выберите **gemini-business** и введите любой ключ (например `unused`).
</details>

<details>
<summary><b>В: Ошибки истечения сессии?</b></summary>

Плагин автоматически обновляет сессии (кешируются на 50 минут). Если ошибки не проходят — cookies могли истечь, извлеките их заново из браузера.
</details>

<details>
<summary><b>В: Чем отличается от Google AI Studio?</b></summary>

Плагин использует **Gemini Business API** (`business.gemini.google`) — корпоративные аккаунты с высокими лимитами. НЕ Google AI Studio (`aistudio.google.com`).
</details>

---

## 🔒 Безопасность

- Учётные данные хранятся локально в `~/.config/opencode/gemini-business-accounts.json`
- Не коммитьте credentials в git
- Регулярно обновляйте cookies
- Плагин не отправляет данные третьим сторонам

---

## 📄 Лицензия

[MIT](LICENSE) © opencode-gemini-business contributors
