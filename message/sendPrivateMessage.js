const sendPrivateMessage = async (bot, userId, message) => {
  // Проверяем, является ли userId тестовым (начинается с 100000 и больше, но меньше 200000)
  if (typeof userId === "number" && userId >= 100000 && userId < 200000) {
    console.log(`Сообщение не отправлено тестовому игроку с ID ${userId}`);
    return; // Пропускаем отправку для тестовых игроков
  }

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