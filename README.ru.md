# 🔄 opencode-gemini-business

[🇬🇧 English](README.md) | [🇷🇺 **Русский**](README.ru.md)

> Мульти-аккаунтный пул Gemini Business с интеллектуальной ротацией для OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/opencode-gemini-business.svg)](https://www.npmjs.com/package/opencode-gemini-business)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## 📖 Обзор

**opencode-gemini-business** — это плагин для OpenCode, который обеспечивает ротацию между несколькими аккаунтами **Gemini Business API**, предоставляя автоматическое переключение при ошибках и балансировку нагрузки.

**⚠️ Важно**: Этот плагин использует **официальный Gemini Business API** (`business.gemini.google`), НЕ Google AI Studio.

## ✨ Ключевые возможности

| Функция | Описание |
|---------|----------|
| 🔄 **Мульти-аккаунт ротация** | Автоматическое переключение между аккаунтами |
| 🛡️ **Автоматический Failover** | Повтор неудачных запросов с другими аккаунтами |
| 🔐 **Управление сессиями** | Встроенное управление XSRF токенами и сессиями |
| ⚙️ **Гибкие стратегии** | Round-robin, least-used или случайная ротация |
| 📊 **Мониторинг здоровья** | Отслеживание статистики и ошибок по аккаунтам |
| 🚀 **Совместимость с OpenCode** | Бесшовная работа с системой провайдеров OpenCode |
| 💾 **Постоянная конфигурация** | Безопасное хранение в `~/.config/opencode/gemini-business-accounts.json` |

## 🤖 Поддерживаемые модели

| Модель | Контекст | Макс. вывод | Лучше всего для |
|--------|----------|-------------|-----------------|
| `gemini-2.5-pro` | 1M токенов | 32K токенов | Сложные рассуждения, длинные документы |
| `gemini-2.5-flash` | 1M токенов | 8K токенов | Быстрые ответы, простые задачи |
| `gemini-2.0-pro` | 2M токенов | 32K токенов | Массивный контекст, глубокий анализ |
| `gemini-1.5-pro` | 2M токенов | 8K токенов | Производственные нагрузки |
| `gemini-1.5-flash` | 1M токенов | 8K токенов | Экономичная разработка |

## 🔧 Установка и настройка

### 📦 Установите плагин

```bash
npm install -g opencode-gemini-business
```

Или используйте с npx:

```bash
npx opencode-gemini-business@latest
```

### ⚙️ Настройте OpenCode

Добавьте в `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gemini-business@latest"],
  "provider": {
    "gemini-business": {
      "models": {
        "gemini-2.5-pro": {
          "name": "Gemini 2.5 Pro (Business)",
          "limit": { "context": 1048576, "output": 32768 },
          "modalities": { "input": ["text"], "output": ["text"] }
        },
        "gemini-2.5-flash": {
          "name": "Gemini 2.5 Flash (Business)",
          "limit": { "context": 1048576, "output": 8192 },
          "modalities": { "input": ["text"], "output": ["text"] }
        },
        "gemini-2.0-pro": {
          "name": "Gemini 2.0 Pro (Business)",
          "limit": { "context": 2097152, "output": 32768 },
          "modalities": { "input": ["text"], "output": ["text"] }
        },
        "gemini-1.5-pro": {
          "name": "Gemini 1.5 Pro (Business)",
          "limit": { "context": 2097152, "output": 8192 },
          "modalities": { "input": ["text"], "output": ["text"] }
        },
        "gemini-1.5-flash": {
          "name": "Gemini 1.5 Flash (Business)",
          "limit": { "context": 1048576, "output": 8192 },
          "modalities": { "input": ["text"], "output": ["text"] }
        }
      }
    }
  }
}
```

**Или используйте короткие алиасы:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gemini-business@latest"],
  "provider": {
    "gemini-business": {
      "models": {
        "gemini-2.5-pro": { "name": "Gemini 2.5 Pro" },
        "gemini-2.5-flash": { "name": "Gemini 2.5 Flash" },
        "gemini-2.0-pro": { "name": "Gemini 2.0 Pro" },
        "gemini-1.5-pro": { "name": "Gemini 1.5 Pro" },
        "gemini-1.5-flash": { "name": "Gemini 1.5 Flash" }
      }
    }
  }
}
```

### 🔑 Извлечение учетных данных

#### Метод 1: Использование расширения браузера (РЕКОМЕНДУЕТСЯ) ⚡

**Используйте расширение "Get cookies.txt LOCALLY"** для экспорта cookies, включая HttpOnly:

1. **Установите расширение**:
   - [Chrome Web Store: Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - Это расширение может экспортировать **все cookies**, включая HttpOnly (которые недоступны JavaScript)

2. **Войдите** в [Gemini Business](https://business.gemini.google)

3. **Нажмите на иконку расширения** → Экспортируйте cookies для `business.gemini.google`

4. **Найдите в экспортированном файле**:
   - `__Secure-C_SES`: `CSE.xxx...`
   - `__Host-C_OSES`: `COS.xxx...`

5. **Получите csesidx из URL**:
   - Посмотрите на URL в браузере: `?csesidx=1370433092`
   - Скопируйте число после `csesidx=`

6. **Получите team_id из вкладки Network**:
   - F12 → вкладка **Network**
   - Отправьте сообщение в Gemini
   - Найдите запрос к `biz-discoveryengine.googleapis.com`
   - Кликните на запрос → **Headers** → найдите `X-Goog-Team-Id: team_xxxxx`

7. **Добавьте аккаунт** (см. ниже)

#### Метод 2: Ручное извлечение через DevTools

1. **Войдите** в [Gemini Business](https://business.gemini.google)

2. **Откройте DevTools** (F12) → вкладка **Network**

3. **Отправьте сообщение** в Gemini или обновите страницу

4. **Найдите любой запрос** к `biz-discoveryengine.googleapis.com`

5. **Скопируйте из заголовков запроса**:
   - `X-Goog-Team-Id` → это ваш `team_id`
   - Cookie: `__Secure-c_ses` → скопируйте значение
   - Cookie: `__Host-c_oses` → скопируйте значение
   - Найдите `csesidx` в теле запроса или заголовках

6. **Добавьте аккаунт**:

```bash
opencode-gemini-business add-account \
  "Основной аккаунт" \
  "team_abc123" \
  "secure_ses_cookie_value" \
  "host_oses_cookie_value" \
  "csesidx_value"
```

### 📝 Добавление аккаунта

```bash
opencode-gemini-business add-account \
  "Основной аккаунт" \
  "team_abc123" \
  "secure_ses_cookie_value" \
  "host_oses_cookie_value" \
  "csesidx_value"
```

**Или через переменные окружения**:

```bash
export GEMINI_ACCOUNT_NAME="Основной аккаунт"
export GEMINI_TEAM_ID="team_abc123"
export GEMINI_SECURE_C_SES="secure_ses_value"
export GEMINI_HOST_C_OSES="host_oses_value"
export GEMINI_CSESIDX="csesidx_value"

opencode-gemini-business add-account
```

## 🚀 Использование

### Базовое использование

```bash
# Используй Pro (лучшее качество)
opencode run "Проанализируй архитектуру проекта" --model=gemini-pro

# Используй Flash (самая быстрая)
opencode run "Исправь синтаксическую ошибку" --model=gemini-flash

# Используй 2.0 Pro (огромный контекст - 2M токенов)
opencode run "Суммируй эти 100 файлов" --model=gemini-2-pro
```

### Использование конкретных моделей

```bash
# Сложные задачи → gemini-2.5-pro
opencode run "Спроектируй микросервисную архитектуру" --model=gemini-pro

# Быстрые простые задачи → gemini-2.5-flash
opencode run "Напиши hello world" --model=gemini-flash

# Массивный контекст → gemini-2.0-pro (2M токенов)
opencode run "Проанализируй весь codebase" --model=gemini-2-pro

# Производственные нагрузки → gemini-1.5-pro
opencode run "Ревью этого PR" --model=gemini-1.5-pro

# Экономичная → gemini-1.5-flash
opencode run "Сгенерируй тесты" --model=gemini-1.5-flash
```

### Установить модель по умолчанию

```bash
# Установи предпочитаемую модель по умолчанию
export OPENCODE_MODEL=gemini-pro
opencode run "Твоя задача здесь"
```

### 🛠️ Управление аккаунтами

```bash
# Список всех аккаунтов
opencode-gemini-business list-accounts

# Тест конкретного аккаунта
opencode-gemini-business test-account <account_id>

# Удалить аккаунт
opencode-gemini-business remove-account <account_id>

# Помощь
opencode-gemini-business help
```

## 🔄 Стратегии ротации

| Стратегия | Поведение | Применение |
|-----------|-----------|------------|
| `round-robin` | Циклическое переключение по порядку | Сбалансированное использование всех аккаунтов |
| `least-used` | Выбор аккаунта с самой старой меткой last_used | Минимизация использования отдельных аккаунтов |
| `random` | Случайный вероятностный выбор | Непредсказуемое распределение нагрузки |

**Настройка стратегии** в конфиге OpenCode:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gemini-business@latest"],
  "provider": {
    "gemini-business": {
      "rotation_strategy": "least-used",  // ← Измените здесь
      "models": {
        "gemini-2.5-pro": {
          "name": "Gemini 2.5 Pro (Business)",
          "limit": { "context": 1048576, "output": 32768 },
          "modalities": { "input": ["text"], "output": ["text"] }
        }
      }
    }
  }
}
```


## ❓ Часто задаваемые вопросы

<details>
<summary><b>В: Как обработать истечение сессии?</b></summary>

Плагин автоматически обновляет сессии. Сессии кешируются на 50 минут и обновляются автоматически при необходимости. Если видите ошибки "Session has expired", плагин создаст новую сессию автоматически.

</details>

<details>
<summary><b>В: Какую модель использовать?</b></summary>

- **Сложные задачи**: `gemini-2.5-pro` или `gemini-2.0-pro` для лучших рассуждений
- **Быстрые задачи**: `gemini-2.5-flash` или `gemini-1.5-flash` для скорости
- **Большой контекст**: `gemini-2.0-pro` поддерживает до 2M токенов

</details>

<details>
<summary><b>В: Сколько аккаунтов добавлять?</b></summary>

Рекомендуется: 2-5 аккаунтов для оптимального резервирования и распределения нагрузки. Больше аккаунтов обеспечивает лучшую избыточность, но усложняет конфигурацию.

</details>

<details>
<summary><b>В: Безопасен ли скрипт извлечения credentials?</b></summary>

**ДА, 100% безопасен!** Скрипт:
- ✅ Работает ТОЛЬКО в вашем браузере (локально)
- ✅ НЕ отправляет данные на внешние серверы
- ✅ Только читает cookies с business.gemini.google
- ✅ Открытый исходный код - можете проверить

**Никогда** не запускайте скрипты из ненадежных источников. Используйте только из официального репозитория.

</details>

<details>
<summary><b>В: В чём разница от Google AI Studio?</b></summary>

Этот плагин использует **Gemini Business API** (`business.gemini.google`):
- ✅ Корпоративные/бизнес аккаунты
- ✅ Более высокие лимиты
- ✅ Бизнес-функции

**НЕ** Google AI Studio (`aistudio.google.com`):
- ❌ Бесплатный/разработческий уровень
- ❌ Более низкие лимиты
- ❌ Другие эндпоинты API

</details>

## 🔒 Лучшие практики безопасности

### Безопасность учетных данных

```
⚠️ КРИТИЧНО: Держите учетные данные в СЕКРЕТЕ!

✅ ДЕЛАЙТЕ:
- Храните credentials только в ~/.config/opencode/gemini-business-accounts.json
- Используйте переменные окружения для временного доступа
- Регулярно меняйте учетные данные
- Добавьте *.json в .gitignore

❌ НЕ ДЕЛАЙТЕ:
- Не коммитьте credentials в git репозитории
- Не передавайте credentials другим
- Не храните credentials в открытых текстовых файлах
- Не используйте credentials в публичных окружениях
```

### Безопасность скрипта извлечения cookies

```
✅ Скрипт БЕЗОПАСЕН, потому что:
- Работает 100% локально в вашем браузере
- НЕ делает внешних сетевых запросов
- НЕ передает данные на серверы
- Открытый исходный код и проверяемый

⚠️ Советы по безопасности:
- Используйте только из официального репозитория
- Проверьте код перед запуском (он короткий!)
- Никогда не вставляйте модифицированные скрипты
- Проверяйте консоль браузера на предупреждения
```

## 📄 Лицензия

Лицензия MIT - используйте плагин свободно!

## 💬 Нужна помощь?

- Проверьте [FAQ](#-часто-задаваемые-вопросы) для частых вопросов
- Тестируйте аккаунты: `opencode-gemini-business test-account <account_id>`
- Сообщайте о проблемах: [GitHub Issues](https://github.com/izzzzzi/opencode-gemini-business/issues)
