const sendPrivateMessage = async (bot, userId, message, options = { parse_mode: 'HTML' }) => {
  if (typeof userId === 'number' && userId >= 100000 && userId < 200000) {
    console.log(`Сообщение не отправлено тестовому игроку с ID ${userId}`);
    return null;
  }

  try {
    const sent = await bot.telegram.sendMessage(userId, message, options);
    return sent;
  } catch (error) {
    if (error.response?.error_code === 403) {
      console.log(`Пользователь ${userId} заблокировал бота`);
    } else if (error.response?.error_code === 400 && error.response.description.includes('chat not found')) {
      console.log(`Чат с ID ${userId} не найден`);
    } else {
      console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, error);
    }
    throw error;
  }
};

module.exports = { sendPrivateMessage };
