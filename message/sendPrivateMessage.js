const sendPrivateMessage = async (bot, userId, message) => {
  try {
    await bot.telegram.sendMessage(userId, message, { parse_mode: "HTML" });
  } catch (error) {
    if (error.response?.error_code === 403) {
      console.log(`Пользователь ${userId} заблокировал бота`);
    } else {
      console.error("Ошибка при отправке сообщения:", error);
    }
  }
};

module.exports = { sendPrivateMessage };
