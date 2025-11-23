# Настройка Git репозитория на VPS

## Проблема: "fatal: not a git repository"

Эта ошибка означает, что в директории `/root/msk` нет git репозитория.

## Решение: Настройка Git на VPS

### Вариант 1: Инициализация существующей директории (если файлы уже есть)

1. Подключитесь к VPS:
   ```bash
   ssh root@217.114.12.13
   ```

2. Перейдите в директорию проекта:
   ```bash
   cd /root/msk
   ```

3. Инициализируйте git репозиторий:
   ```bash
   git init
   ```

4. Добавьте remote (замените на ваш GitHub репозиторий):
   ```bash
   git remote add origin https://github.com/ваш-username/telegram-bot.git
   # Или если используете SSH:
   # git remote add origin git@github.com:ваш-username/telegram-bot.git
   ```

5. Добавьте все файлы и сделайте первый коммит:
   ```bash
   git add .
   git commit -m "Initial commit from VPS"
   ```

6. Свяжите с master веткой:
   ```bash
   git branch -M master
   git pull origin master --allow-unrelated-histories
   ```

### Вариант 2: Клонирование репозитория (если директория пустая или можно пересоздать)

1. Подключитесь к VPS:
   ```bash
   ssh root@217.114.12.13
   ```

2. Если директория `/root/msk` пустая или можно её пересоздать:
   ```bash
   # Переименуйте старую директорию (если нужно сохранить файлы)
   mv /root/msk /root/msk_backup
   
   # Клонируйте репозиторий
   git clone https://github.com/ваш-username/telegram-bot.git /root/msk
   # Или если используете SSH:
   # git clone git@github.com:ваш-username/telegram-bot.git /root/msk
   ```

3. Если нужно восстановить файлы из backup:
   ```bash
   cp -r /root/msk_backup/* /root/msk/
   cd /root/msk
   git add .
   git commit -m "Restore files from backup"
   ```

### Вариант 3: Использование автоматической инициализации (рекомендуется)

Я обновил workflow файл, чтобы он автоматически инициализировал git репозиторий, если его нет.

**Добавьте в GitHub Secrets:**
- `GIT_REPO_URL` - URL вашего GitHub репозитория (например: `https://github.com/ваш-username/telegram-bot.git`)

## Проверка настройки

После настройки проверьте:

```bash
cd /root/msk
git remote -v
```

Должен показать ваш GitHub репозиторий.

## Если используете приватный репозиторий

Для приватных репозиториев нужно настроить доступ:

1. Создайте SSH ключ на VPS (или используйте существующий)
2. Добавьте публичный ключ в GitHub → Settings → SSH and GPG keys
3. Используйте SSH URL: `git@github.com:ваш-username/telegram-bot.git`

Или используйте Personal Access Token для HTTPS.

