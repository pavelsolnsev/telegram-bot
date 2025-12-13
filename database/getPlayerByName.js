const db = require('./database');
const crypto = require('crypto');

// Функция для удаления эмодзи и декоративных Unicode-символов из строки
const removeEmoji = (text) => {
  if (!text || typeof text !== 'string') return text;
  // Удаляем:
  // - Эмодзи (1F000-1FFFF, 2600-27BF, FE00-FEFF, 1F600-1F64F, 1F680-1F6FF, 1F900-1F9FF)
  // - Математические алфавитные символы (1D400-1D7FF) - декоративные буквы
  // - Полноширинные символы (FF00-FFEF)
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{FF00}-\u{FFEF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
  return text.replace(emojiRegex, '').trim();
};

/**
 * Генерирует стабильный ID на основе имени игрока
 * Использует хеш для создания ID в диапазоне 200000-299999
 */
function generatePlayerIdFromName(name) {
  const hash = crypto.createHash('md5').update(name.trim().toLowerCase()).digest('hex');
  // Преобразуем первые 8 символов хеша в число и берем модуль для диапазона 200000-299999
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  return 200000 + (hashNumber % 100000);
}

/**
 * Ищет игрока по имени в базе данных или создает новый ID
 * Имя сохраняется в поле username
 * @param {string} playerName - Имя игрока
 * @returns {Promise<{id: number, name: string, username: string|null, found: boolean}>}
 */
async function getPlayerByName(playerName, retries = 3) {
  const normalizedName = playerName.trim();

  for (let i = 0; i < retries; i++) {
    try {
      // Сначала пытаемся найти игрока по username или name (нечувствительно к регистру и пробелам)
      const [rows] = await db.query(
        'SELECT id, name, username FROM players WHERE LOWER(TRIM(COALESCE(username, name))) = ? LIMIT 1',
        [normalizedName.toLowerCase()],
      );

      if (rows.length > 0) {
        // Игрок найден, возвращаем его данные
        // Если username пустой, но name совпадает - используем name как username
        // Очищаем эмодзи из данных, полученных из базы данных
        const rawName = rows[0].name || '';
        const rawUsername = rows[0].username || '';
        const cleanName = removeEmoji(rawName) || removeEmoji(rawUsername) || normalizedName;
        const cleanUsername = removeEmoji(rawUsername) || (rawName ? removeEmoji(rawName) : null);

        return {
          id: rows[0].id,
          name: cleanName,
          username: cleanUsername,
          found: true,
        };
      }

      // Игрок не найден, генерируем стабильный ID на основе имени
      const generatedId = generatePlayerIdFromName(normalizedName);

      // Проверяем, не занят ли этот ID другим игроком
      const [idCheck] = await db.query(
        'SELECT id, name, username FROM players WHERE id = ? LIMIT 1',
        [generatedId],
      );

      if (idCheck.length > 0) {
        // ID занят другим игроком, проверяем, это тот же игрок?
        const existingUsername = idCheck[0].username || idCheck[0].name;
        if (existingUsername.toLowerCase().trim() === normalizedName.toLowerCase()) {
          return {
            id: idCheck[0].id,
            name: idCheck[0].name || normalizedName,
            username: normalizedName,
            found: true,
          };
        }
        // ID занят другим игроком - это коллизия
        // Проверяем еще раз поиск по username или name (на случай, если имя немного отличается)
        const [nameCheckAgain] = await db.query(
          'SELECT id, name, username FROM players WHERE LOWER(TRIM(COALESCE(username, name))) = ? LIMIT 1',
          [normalizedName.toLowerCase()],
        );

        if (nameCheckAgain.length > 0) {
          // Нашли игрока с похожим именем (разница только в регистре/пробелах)
          const foundUsername = nameCheckAgain[0].username || nameCheckAgain[0].name;
          return {
            id: nameCheckAgain[0].id,
            name: nameCheckAgain[0].name || foundUsername,
            username: foundUsername,
            found: true,
          };
        }

        // Коллизия ID: сгенерированный ID занят другим игроком
        // Генерируем альтернативный ID в другом диапазоне
        const existingPlayerName = idCheck[0].username || idCheck[0].name;
        console.warn(`Коллизия ID для игрока "${normalizedName}": ID ${generatedId} занят игроком "${existingPlayerName}". Используем альтернативный ID.`);
        const alternativeId = 300000 + (parseInt(crypto.createHash('sha256').update(normalizedName).digest('hex').substring(0, 8), 16) % 100000);

        // Проверяем, не занят ли альтернативный ID
        const [altIdCheck] = await db.query(
          'SELECT id FROM players WHERE id = ? LIMIT 1',
          [alternativeId],
        );

        if (altIdCheck.length > 0) {
          // Альтернативный ID тоже занят, используем простое смещение
          const finalId = alternativeId + 1;
          return {
            id: finalId,
            name: normalizedName,
            username: normalizedName,
            found: false,
          };
        }

        return {
          id: alternativeId,
          name: normalizedName,
          username: normalizedName,
          found: false,
        };
      }

      // ID свободен, используем его
      return {
        id: generatedId,
        name: normalizedName,
        username: normalizedName,
        found: false,
      };
    } catch (error) {
      console.error(`Попытка ${i + 1} поиска игрока по имени не удалась:`, error);
      if (error.code === 'ER_CON_COUNT_ERROR') {
        console.warn('Слишком много подключений, увеличиваем время ожидания...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (i === retries - 1) {
        console.error('Все попытки исчерпаны, генерируем ID без проверки БД.');
        // В случае ошибки все равно генерируем стабильный ID
        return {
          id: generatePlayerIdFromName(normalizedName),
          name: normalizedName,
          username: normalizedName,
          found: false,
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

module.exports = getPlayerByName;

