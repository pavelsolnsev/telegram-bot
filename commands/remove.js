const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { sendPlayerList } = require('../utils/sendPlayerList');
const { sendPrivateMessage } = require('../message/sendPrivateMessage'); // Добавляем импорт sendPrivateMessage

module.exports = (bot, GlobalState) => {
  bot.hears(/^r(\d+)$/i, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в команде r');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в команде r');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
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

    // Проверяем, является ли отправитель администратором
    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply('⚠️ Матч не начат!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (isTeamsDivided) {
      const message = await ctx.reply('Игра уже идет!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (ctx.chat.id > 0) {
      const message = await ctx.reply('Напиши в группу!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Проверка на валидность ctx.message.text
    if (!ctx.message || !ctx.message.text || typeof ctx.message.text !== 'string') {
      console.error('Ошибка: некорректный ctx.message.text в команде r');
      return;
    }

    const matchResult = ctx.message.text.match(/^r(\d+)$/i);
    if (!matchResult || matchResult.length < 2) {
      console.error('Ошибка: некорректный формат команды r');
      return;
    }

    // Получаем номер игрока из текста команды
    const playerNumber = Number(matchResult[1]);

    // Проверяем, что номер игрока корректен
    if (playerNumber <= 0 || playerNumber > players.length) {
      const message = await ctx.reply('⚠️ Неверный номер игрока!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Находим игрока по его номеру
    const playerIndex = playerNumber - 1;
    const playerName = players[playerIndex];
    const displayName = playerName.username ? `${playerName.name} (${playerName.username})` : playerName.name;
    // Удаляем игрока из списка
    players.splice(playerIndex, 1);

    // Если в очереди есть игроки, добавляем первого в список игроков
    if (queue.length > 0) {
      const newPlayer = queue.shift(); // Извлекаем первого игрока из очереди
      players.push(newPlayer); // Добавляем его в основной состав
      try {
        await sendPrivateMessage(bot, newPlayer.id, '🎉 Вы в основном составе!'); // Отправляем уведомление
      } catch (error) {
        // Ошибка уже обработана в sendPrivateMessage, просто продолжаем
        console.log(`Не удалось отправить уведомление игроку ${newPlayer.id}`);
      }
    }

    // Обновляем список игроков и очередь в GlobalState
    GlobalState.setPlayers(players);
    GlobalState.setQueue(queue);

    // Отправляем уведомление о том, что игрок был удалён
    const message = await ctx.reply(`✅ Игрок ${displayName} удалён из списка!`);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);

    // Обновляем список игроков
    await sendPlayerList(ctx);
  });
};
