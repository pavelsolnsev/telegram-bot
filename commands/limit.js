const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { sendPlayerList } = require('../utils/sendPlayerList');
const { sendPrivateMessage } = require('../message/sendPrivateMessage');

module.exports = (bot, GlobalState) => {
  bot.hears(/^l(\d+)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    let players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();
    await ctx.deleteMessage().catch(() => {});

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply('⚠️ Матч не начат!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (isTeamsDivided) {
      const message = await ctx.reply('Лимит закрыт');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (ctx.chat.id > 0) {
      const message = await ctx.reply('Напиши в группу!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const newLimit = Number(ctx.message.text.match(/^l(\d+)$/i)[1]);
    if (newLimit <= 0) {
      const message = await ctx.reply(
        '⚠️ Лимит должен быть положительным числом!',
      );
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (newLimit < MAX_PLAYERS) {
      // Если новый лимит меньше текущего
      const playersToMove = players.slice(newLimit); // Игроки, которые перемещаются в очередь
      queue.unshift(...playersToMove); // Добавляем этих игроков в начало очереди
      players = players.slice(0, newLimit); // Оставляем только нужное количество игроков в списке

      // Отправляем уведомления игрокам, перемещённым в очередь
      playersToMove.forEach((player) => {
        sendPrivateMessage(bot, player.id, '⚠️ Вы перемещены в очередь!');
      });
    } else if (newLimit > MAX_PLAYERS) {
      // Если новый лимит больше текущего
      const availableSlots = newLimit - players.length; // Рассчитываем количество доступных мест
      const playersToAdd = queue.splice(0, availableSlots); // Извлекаем нужное количество игроков из очереди
      players.push(...playersToAdd); // Добавляем их в основной список игроков

      // Отправляем уведомления игрокам, перемещённым в основной состав
      playersToAdd.forEach((player) => {
        sendPrivateMessage(bot, player.id, '🎉 Вы в основном составе!');
      });
    }

    GlobalState.setMaxPlayers(newLimit);
    GlobalState.setPlayers(players);
    GlobalState.setQueue(queue);

    const message = await ctx.reply(
      `✅ Лимит игроков установлен на ${newLimit}.`,
    );
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
    await sendPlayerList(ctx);
  });
};
