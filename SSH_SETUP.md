# Пошаговая инструкция по настройке SSH ключа

## Проблема: "unable to authenticate"

Эта ошибка означает, что SSH ключ не настроен правильно. Следуйте инструкции ниже.

## Шаг 1: Создание SSH ключа (если его нет)

На вашей локальной машине (Windows):

```powershell
# В PowerShell или Git Bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
```

- Нажмите Enter для сохранения в стандартное место
- Можно оставить пароль пустым (просто Enter дважды)

## Шаг 2: Получение приватного ключа

```powershell
# В PowerShell
Get-Content ~/.ssh/id_ed25519

# Или в Git Bash
cat ~/.ssh/id_ed25519
```

**ВАЖНО:** Скопируйте ВСЁ содержимое, включая:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- весь текст ключа
- `-----END OPENSSH PRIVATE KEY-----`

## Шаг 3: Добавление приватного ключа в GitHub Secrets

1. Перейдите в GitHub → Settings → Secrets and variables → Actions
2. Найдите или создайте секрет `VPS_SSH_KEY`
3. Вставьте ВСЁ содержимое приватного ключа (из шага 2)
4. Сохраните

## Шаг 4: Получение публичного ключа

```powershell
# В PowerShell
Get-Content ~/.ssh/id_ed25519.pub

# Или в Git Bash
cat ~/.ssh/id_ed25519.pub
```

Скопируйте содержимое (одна строка, начинается с `ssh-ed25519`)

## Шаг 5: Добавление публичного ключа на VPS сервер

1. Подключитесь к VPS:
   ```bash
   ssh root@217.114.12.13
   ```

2. Создайте директорию .ssh (если её нет):
   ```bash
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   ```

3. Добавьте публичный ключ:
   ```bash
   # Вставьте ваш публичный ключ (из шага 4) вместо "ваш_публичный_ключ"
   echo "ваш_публичный_ключ_здесь" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

   **Пример:**
   ```bash
   echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPJH9RvZHQEzC9hw9iZURs7A6L619ilVKtHsyXbJS08v github-actions-deploy" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

4. Проверьте, что ключ добавлен:
   ```bash
   cat ~/.ssh/authorized_keys
   ```

## Шаг 6: Проверка подключения

На вашей локальной машине проверьте подключение:

```bash
ssh root@217.114.12.13
```

Если подключение работает без пароля, значит ключ настроен правильно.

## Шаг 7: Проверка формата ключа в GitHub

Убедитесь, что в секрете `VPS_SSH_KEY` ключ выглядит так:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
... (много строк) ...
-----END OPENSSH PRIVATE KEY-----
```

**НЕ должно быть:**
- Лишних пробелов в начале
- Пустых строк в начале или конце
- Текста до `-----BEGIN` или после `-----END`

## Шаг 8: Повторный запуск workflow

После исправления:
1. Сделайте небольшое изменение в коде
2. Закоммитьте и запушьте:
   ```bash
   git add .
   git commit -m "fix ssh key"
   git push origin master
   ```
3. Проверьте GitHub Actions

## Альтернативный вариант: Использование пароля (не рекомендуется)

Если SSH ключи не работают, можно использовать пароль (менее безопасно):

В `.github/workflows/deploy.yml` замените:
```yaml
key: ${{ secrets.VPS_SSH_KEY }}
```

на:
```yaml
password: ${{ secrets.VPS_PASSWORD }}
```

И добавьте секрет `VPS_PASSWORD` с паролем от root пользователя.

