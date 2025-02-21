const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Функция удаления сообщений с задержкой
const { sendPlayerList } = require("../utils/sendPlayerList"); // Функция отправки списка игроков

module.exports = (bot, GlobalState) => {
	bot.hears(/^r \d+$/i, async (ctx) => { 
		const isMatchStarted = GlobalState.getStart(); // Проверяем, начался ли матч
    const players = GlobalState.getPlayers(); // Получаем список игроков
    const queue = GlobalState.getQueue(); // Получаем очередь игроков
    const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
    
		await ctx.deleteMessage().catch(() => {}); // Удаляем исходное сообщение

    // Если матч не начался, ничего не делаем
    if (!isMatchStarted) return;

    // Проверяем, является ли отправитель администратором
    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    // Получаем номер игрока из текста команды
    const playerNumber = Number(ctx.message.text.trim().slice(2).trim());
    
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
      players.push(queue.shift());
    }

    // Обновляем список игроков в GlobalState
    GlobalState.setPlayers(players);

    // Отправляем уведомление о том, что игрок был удалён
    const message = await ctx.reply(`✅ Игрок ${playerName} удалён из списка!`);
    deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время

    // Обновляем список игроков
    await sendPlayerList(ctx);
  });
};
