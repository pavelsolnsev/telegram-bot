const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { sendPlayerList } = require('../utils/sendPlayerList');
const { sendPrivateMessage } = require('../message/sendPrivateMessage');

module.exports = (bot, GlobalState) => {
  bot.hears(/^l(\d+)$/i, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в команде l');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в команде l');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    let players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }

    // Проверка на валидность players
    if (!Array.isArray(players)) {
      console.error('Ошибка: players не является массивом');
      return;
    }

    // Проверка на валидность queue
    if (!Array.isArray(queue)) {
      console.error('Ошибка: queue не является массивом');
      return;
    }

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

    // Проверка на валидность ctx.message.text
    if (!ctx.message || !ctx.message.text || typeof ctx.message.text !== 'string') {
      console.error('Ошибка: некорректный ctx.message.text в команде l');
      return;
    }

    const matchResult = ctx.message.text.match(/^l(\d+)$/i);
    if (!matchResult || matchResult.length < 2) {
      console.error('Ошибка: некорректный формат команды l');
      return;
    }

    const newLimit = Number(matchResult[1]);
    if (newLimit <= 0 || isNaN(newLimit)) {
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
      for (const player of playersToMove) {
        try {
          await sendPrivateMessage(bot, player.id, '⚠️ Вы перемещены в очередь!');
        } catch (error) {
          // Ошибка уже обработана в sendPrivateMessage, просто продолжаем
          console.log(`Не удалось отправить уведомление игроку ${player.id}`);
        }
      }
    } else if (newLimit > MAX_PLAYERS) {
      // Если новый лимит больше текущего
      const availableSlots = newLimit - players.length; // Рассчитываем количество доступных мест
      const playersToAdd = queue.splice(0, availableSlots); // Извлекаем нужное количество игроков из очереди
      players.push(...playersToAdd); // Добавляем их в основной список игроков

      // Отправляем уведомления игрокам, перемещённым в основной состав
      for (const player of playersToAdd) {
        try {
          await sendPrivateMessage(bot, player.id, '🎉 Вы в основном составе!');
        } catch (error) {
          // Ошибка уже обработана в sendPrivateMessage, просто продолжаем
          console.log(`Не удалось отправить уведомление игроку ${player.id}`);
        }
      }
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
