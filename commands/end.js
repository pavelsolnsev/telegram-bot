
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Импорт функции для удаления сообщений с задержкой

module.exports = (bot, GlobalState) => {
  bot.hears(/^e!$/i, async (ctx) => {
    // Удаляем сообщение с командой
		const listMessageId = GlobalState.getListMessageId();
		const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
		const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора

    await ctx.deleteMessage().catch(() => {});

   if (!isMatchStarted) return; // Если матч не начался, выходим из функции
		
		if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
			const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
			return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
		}

    // Удаляем сообщение со списком игроков, если оно существует
    if (listMessageId) {
      await ctx.telegram
        .deleteMessage(ctx.chat.id, listMessageId)
        .catch(() => {});
      GlobalState.setListMessageId(null);
    }

    // Сбрасываем все игровые данные
    GlobalState.setPlayers([]); // Очистка списка игроков
    GlobalState.setQueue([]); // Очистка очереди
    GlobalState.setCollectionDate(null); // Удаление даты сбора
    GlobalState.setLocation("Локация пока не определена"); // Сброс локации
    GlobalState.setMaxPlayers(14); // Возвращаем стандартное значение максимальных игроков
    GlobalState.setStart(false); // Завершаем матч
    GlobalState.setNotificationSent(false); // Сбрасываем флаг отправки уведомлений

    // Отправляем подтверждающее сообщение
    const message = await ctx.reply(
      "✅ Сбор успешно завершён!"
    );
    deleteMessageAfterDelay(ctx, message.message_id);
  });
};
