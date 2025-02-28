const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Импорт функции удаления сообщений с задержкой

module.exports = (bot, GlobalState) => {
  bot.hears(/^list$/i, async (ctx) => {
    const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
    let listMessageId = GlobalState.getListMessageId();
    const isTeamsDivided = GlobalState.getDivided();
    await ctx.deleteMessage().catch(() => {});

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Список игроков ещё не создан.");
      return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
    }

    if (isTeamsDivided) {
      const message = await ctx.reply("Сейчас идет игра!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    try {
      // Прокручиваем чат до закрепленного сообщения
      const sentMessage = await ctx.telegram.forwardMessage(
        ctx.chat.id,
        ctx.chat.id,
        listMessageId
      );

      // Удаляем сообщение со списком через 5 секунд
      deleteMessageAfterDelay(ctx, sentMessage.message_id, 10000);
    } catch (error) {
      console.error("Ошибка при прокрутке к закрепленному сообщению:", error);
      const message = await ctx.reply(
        "⚠️ Не удалось найти закрепленное сообщение."
      );
      deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
    }
  });
};
