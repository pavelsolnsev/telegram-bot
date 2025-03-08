const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Импорт функции для удаления сообщений с задержкой
const { sendPlayerList } = require("../utils/sendPlayerList"); // Импорт функции для отправки списка игроков
const { sendPrivateMessage } = require("../message/sendPrivateMessage");

module.exports = (bot, GlobalState) => {
  bot.hears(/^l(\d+)$/i, async (ctx) => {
    // Обработчик команд, соответствующих шаблону "l<число>"
    const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
    const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
    let players = GlobalState.getPlayers(); // Получаем список текущих игроков
    let queue = GlobalState.getQueue(); // Получаем очередь игроков
    let MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();
    await ctx.deleteMessage().catch(() => {}); // Удаляем сообщение пользователя (если возможно)

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (isTeamsDivided) {
      const message = await ctx.reply("Лимит закрыт");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const newLimit = Number(ctx.message.text.match(/^l(\d+)$/i)[1]); // Получаем число после "l"
    if (newLimit <= 0) {
      // Проверяем, что лимит положительный
      const message = await ctx.reply(
        "⚠️ Лимит должен быть положительным числом!"
      );
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (newLimit < MAX_PLAYERS) {
      // Если новый лимит меньше текущего
      const playersToMove = players.slice(newLimit); // Определяем игроков, которых нужно переместить в очередь
      queue.unshift(...playersToMove); // Добавляем этих игроков в начало очереди
      players = players.slice(0, newLimit); // Оставляем только нужное количество игроков в списке
    } else if (newLimit > MAX_PLAYERS) {
      // Если новый лимит больше текущего
      const availableSlots = newLimit - players.length; // Рассчитываем количество доступных мест
      const playersToAdd = queue.splice(0, availableSlots); // Извлекаем нужное количество игроков из очереди
      players.push(...playersToAdd); // Добавляем их в основной список игроков

      playersToAdd.forEach((player) => {
        sendPrivateMessage(bot, player.id, "🎉 Вы в основном составе!");
      }); // Отправляем личное сообщение каждому перемещенному игроку
    }

    GlobalState.setMaxPlayers(newLimit); // Устанавливаем новый лимит игроков
    GlobalState.setPlayers(players); // Сохраняем обновленный список игроков
    GlobalState.setQueue(queue); // Сохраняем обновленный список очереди

    const message = await ctx.reply(
      `✅ Лимит игроков установлен на ${newLimit}.`
    );
    deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    await sendPlayerList(ctx); // Отправляем обновленный список игроков
  });
};
