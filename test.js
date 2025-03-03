const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList"); // Импорт функции для отправки списка игроков

module.exports = (bot, GlobalState) => {
  bot.hears(/^s \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/i, async (ctx) => { // Обработчик команды "s ДД.ММ.ГГГГ ЧЧ:ММ"
    const ADMIN_ID = GlobalState.getAdminId();
    const isTeamsDivided = GlobalState.getDivided();

    await ctx.deleteMessage().catch(() => {}); // Удаляем сообщение пользователя (если возможно)

    if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
      const message = await ctx.reply("⛔ Нет прав!"); // Отправляем сообщение о запрете
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    if (isTeamsDivided) {
      const message = await ctx.reply("Игра уже идет!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Извлекаем дату и время из текста команды
    const [, datePart, timePart] = ctx.message.text.match(/(\d{2}\.\d{2}\.\d{4}) (\d{2}:\d{2})/);
    const [day, month, year] = datePart.split(".").map(Number); // Разбираем дату (день, месяц, год)
    const [hours, minutes] = timePart.split(":").map(Number); // Разбираем время (часы, минуты)

    // Создаем объект даты и времени
    const collectionDate = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(collectionDate)) { // Проверяем, корректна ли дата
      const message = await ctx.reply("⚠️ Неверный формат даты!"); // Если нет, отправляем предупреждение
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    // Устанавливаем новую дату сбора в глобальное состояние
    GlobalState.setCollectionDate(collectionDate);
    GlobalState.setPlayers([]); // Очищаем список игроков
    GlobalState.setQueue([]); // Очищаем очередь
    GlobalState.setStart(true); // Запускаем матч
    GlobalState.setNotificationSent(false); // Сбрасываем статус отправки уведомлений

    // Отправляем обновленный список игроков
    await sendPlayerList(ctx);

    // Получаем ID отправленного сообщения со списком
    const listMessageId = GlobalState.getListMessageId();
    if (listMessageId) { // Если сообщение существует, закрепляем его
      try {
        await ctx.telegram.pinChatMessage(ctx.chat.id, listMessageId); // Закрепляем сообщение в чате
      } catch (error) {
        console.error("Ошибка закрепления:", error); // Логируем ошибку в консоль
      }
    }
  });
};
