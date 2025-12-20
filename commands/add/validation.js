const getPlayerStats = require('../../database/getPlayerStats');

// Функция для проверки наличия эмодзи или Unicode-символов
const containsEmojiOrUnicode = (text) => {
  // Проверяем на:
  // - Эмодзи (1F000-1FFFF)
  // - Математические алфавитные символы (1D400-1D7FF) - декоративные буквы
  // - Полноширинные символы (FF00-FFEF)
  // - Различные Unicode диапазоны с декоративными символами
  // eslint-disable-next-line no-misleading-character-class
  const emojiUnicodeRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2000}-\u{2FFF}\u{3000}-\u{3FFF}\u{FF00}-\u{FFEF}\u{FE00}-\u{FEFF}]/u;
  return emojiUnicodeRegex.test(text);
};

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

// Функция для очистки имени игрока от эмодзи с проверкой результата
const cleanPlayerName = (name, username) => {
  const cleanName = name ? removeEmoji(String(name)) : '';
  const cleanUsername = username ? removeEmoji(String(username)) : '';

  // Если после очистки оба поля пустые - возвращаем null (запрет входа)
  if (!cleanName && !cleanUsername) {
    return { name: null, username: null, allowed: false };
  }

  // Используем очищенные значения или fallback
  const finalName = cleanName || cleanUsername || null;
  const finalUsername = cleanUsername || (cleanName ? null : null);

  return {
    name: finalName,
    username: finalUsername,
    allowed: true,
  };
};

// Функция для проверки и создания объекта пользователя
const validateAndCreateUser = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в validateAndCreateUser');
    return { error: '⚠️ Ошибка при обработке запроса. Попробуйте позже.' };
  }

  const GROUP_ID = GlobalState.getGroupId();
  const ADMIN_ID = GlobalState.getAdminId();

  // Проверка, состоит ли пользователь в группе
  let isMember = false;
  if (GROUP_ID && ctx.telegram) {
    try {
      const chatMember = await ctx.telegram.getChatMember(GROUP_ID, ctx.from.id);
      if (chatMember && chatMember.status) {
        isMember = ['member', 'administrator', 'creator'].includes(chatMember.status);
      }
    } catch (error) {
      console.error('Ошибка проверки членства в группе:', error);
    }
  }

  if (!isMember) {
    return { error: '⚠️ Чтобы записаться, вступите в группу!' };
  }

  // Формирование объекта user с учётом проверки username и name
  let userName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
  const userUsername = ctx.from.username ? `${ctx.from.username}` : null;

  // Пытаемся очистить эмодзи из имени пользователя
  const cleaned = cleanPlayerName(userName, userUsername);

  // Если после очистки имя стало пустым - запрещаем вход
  if (!cleaned.allowed) {
    return { error: '⚠️ Недопустимые символы в имени. После удаления эмодзи имя стало пустым. Пожалуйста, установите нормальный ник в Telegram.' };
  }

  // Используем очищенные значения
  userName = cleaned.name;
  const finalUserUsername = cleaned.username;

  const user = {
    id: ctx.from.id,
    name: userName,
    username: finalUserUsername,
    goals: 0,
    assists: 0,
    saves: 0,
    gamesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    rating: 0,
  };

  const [updatedUser] = await getPlayerStats([user]);
  const isAdmin = ADMIN_ID.includes(updatedUser.id);
  // Формируем displayName как name и username в скобках, если username существует
  const displayName = updatedUser.username ? `${updatedUser.name} (${updatedUser.username})` : updatedUser.name;

  return { user: updatedUser, isAdmin, displayName };
};

module.exports = {
  containsEmojiOrUnicode,
  removeEmoji,
  cleanPlayerName,
  validateAndCreateUser,
};
