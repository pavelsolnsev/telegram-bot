const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');

module.exports = (bot, GlobalState) => {
  bot.hears(/^список$/i, async (ctx) => {
    const isMatchStarted = GlobalState.getStart();
    const listMessageId = GlobalState.getListMessageId();
    const GROUP_ID = GlobalState.getGroupId(); // Получаем ID группы
    await ctx.deleteMessage().catch(() => {});

    // Проверяем, что команда отправлена в личку (chat.id > 0 для личных чатов)
    if (ctx.chat.id < 0) {
      const msg = await ctx.reply('Напиши мне в ЛС.');
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply('⚠️ Список игроков ещё не создан.');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // if (isTeamsDivided) {
    //   const message = await ctx.reply("Сейчас идет игра!");
    //   return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    // }

    if (!listMessageId || !GROUP_ID) {
      const message = await ctx.reply('⚠️ Список игроков недоступен.');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    try {
      // Пересылаем сообщение из группы в личный чат пользователя
      const sentMessage = await ctx.telegram.forwardMessage(
        ctx.chat.id, // ID личного чата пользователя
        GROUP_ID,    // ID группы, откуда берем сообщение
        listMessageId, // ID сообщения со списком
      );

      // Удаляем пересланное сообщение через 60 секунд
      deleteMessageAfterDelay(ctx, sentMessage.message_id, 120000);
    } catch (error) {
      console.error('Ошибка при пересылке списка:', error);
      const message = await ctx.reply(
        '⚠️ Не удалось получить список игроков из группы.',
      );
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};
