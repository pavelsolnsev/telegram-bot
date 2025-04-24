const sendPrivateMessage = async (bot, userId, message) => {
  if (typeof userId === "number" && userId >= 100000 && userId < 200000) {
    console.log(`Сообщение не отправлено тестовому игроку с ID ${userId}`);
    return;
  }

  try {
    await bot.telegram.sendMessage(userId, message, { parse_mode: "HTML" });
  } catch (error) {
    if (error.response?.error_code === 403) {
      console.log(`Пользователь ${userId} заблокировал бота`);
    } else if (error.response?.error_code === 400 && error.response.description.includes("chat not found")) {
      console.log(`Чат с ID ${userId} не найден`);
    } else {
      console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, error);
    }
  }
};

module.exports = { sendPrivateMessage };