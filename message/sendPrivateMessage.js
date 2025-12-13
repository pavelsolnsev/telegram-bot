const sendPrivateMessage = async (bot, userId, message, options = { parse_mode: 'HTML' }) => {
  if (typeof userId === 'number' && userId >= 100000 && userId < 200000) {
    console.log(`Сообщение не отправлено тестовому игроку с ID ${userId}`);
    return null;
  }

  try {
    const sent = await bot.telegram.sendMessage(userId, message, options);
    return sent;
  } catch (error) {
    const errorCode = error.response?.error_code;
    const errorDescription = error.response?.description || '';

    // Обрабатываем известные случаи, когда не нужно пробрасывать ошибку
    if (errorCode === 403 || errorDescription.includes('bot was blocked')) {
      console.log(`Пользователь ${userId} заблокировал бота`);
      return null;
    }
    if (errorCode === 400 && (errorDescription.includes('chat not found') || errorDescription.includes('have no access'))) {
      console.log(`Чат с ID ${userId} не найден или нет доступа`);
      return null;
    }

    // Для других ошибок логируем и возвращаем null вместо проброса ошибки
    // Это предотвратит падение бота при проблемах с отправкой сообщений
    console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, error.message || error);
    return null;
  }
};

module.exports = { sendPrivateMessage };
