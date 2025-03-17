const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
const { sendPrivateMessage } = require("../message/sendPrivateMessage"); // Добавляем импорт sendPrivateMessage

module.exports = (bot, GlobalState) => {
  bot.hears(/^r(\d+)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const isTeamsDivided = GlobalState.getDivided();
    await ctx.deleteMessage().catch(() => {});

    // Проверяем, является ли отправитель администратором
    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (isTeamsDivided) {
      const message = await ctx.reply("Игра уже идет!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (ctx.chat.id > 0) {
      const message = await ctx.reply("Напиши в группу!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    // Получаем номер игрока из текста команды
    const playerNumber = Number(ctx.message.text.match(/^r(\d+)$/i)[1]);

    // Проверяем, что номер игрока корректен
    if (playerNumber <= 0 || playerNumber > players.length) {
      const message = await ctx.reply("⚠️ Неверный номер игрока!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Находим игрока по его номеру
    const playerIndex = playerNumber - 1;
    const playerName = players[playerIndex].name;

    // Удаляем игрока из списка
    players.splice(playerIndex, 1);

    // Если в очереди есть игроки, добавляем первого в список игроков
    if (queue.length > 0) {
      const newPlayer = queue.shift(); // Извлекаем первого игрока из очереди
      players.push(newPlayer); // Добавляем его в основной состав
      sendPrivateMessage(bot, newPlayer.id, "🎉 Вы в основном составе!"); // Отправляем уведомление
    }

    // Обновляем список игроков и очередь в GlobalState
    GlobalState.setPlayers(players);
    GlobalState.setQueue(queue);

    // Отправляем уведомление о том, что игрок был удалён
    const message = await ctx.reply(`✅ Игрок ${playerName} удалён из списка!`);
    deleteMessageAfterDelay(ctx, message.message_id);

    // Обновляем список игроков
    await sendPlayerList(ctx);
  });
};