const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Импорт функции удаления сообщений с задержкой
const { sendPlayerList } = require("../utils/sendPlayerList"); // Импорт функции отправки списка игроков

module.exports = (bot, GlobalState) => {
  // Обработчик команды "p <номер игрока>" (помечает игрока как оплатившего)
  bot.hears(/^p \d+$/i, async (ctx) => { 
    const players = GlobalState.getPlayers(); // Получаем список игроков
    const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
    const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
    await ctx.deleteMessage().catch(() => {}); // Удаляем сообщение пользователя (если возможно)

    if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
      const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    } // Если матч не начался, ничего не делаем

    const playerNumber = Number(ctx.message.text.trim().slice(2).trim()); // Получаем номер игрока из команды

    if (playerNumber <= 0 || playerNumber > players.length) { // Проверяем корректность номера
      const message = await ctx.reply("⚠️ Неверный номер игрока!"); // Если номер некорректный, отправляем предупреждение
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    const playerIndex = playerNumber - 1; // Преобразуем номер в индекс массива
    const player = players[playerIndex]; // Получаем игрока по индексу

    if (!player.paid) { // Если игрок еще не оплатил
      player.paid = true; // Помечаем его как оплатившего
      await sendPlayerList(ctx); // Обновляем список игроков

      // const message = await ctx.reply(`✅ ${player.name} оплатил участие.`);
      // deleteMessageAfterDelay(ctx, message.message_id);
    }
  });

  // Обработчик команды "u <номер игрока>" (снимает отметку об оплате с игрока)
  bot.hears(/^u \d+$/i, async (ctx) => { 
    const players = GlobalState.getPlayers(); // Получаем список игроков
    const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
    const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч

    await ctx.deleteMessage().catch(() => {}); // Удаляем сообщение пользователя (если возможно)

    if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
      const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    if (!isMatchStarted) return; // Если матч не начался, ничего не делаем

    const playerNumber = Number(ctx.message.text.trim().slice(2).trim()); // Получаем номер игрока из команды

    if (playerNumber <= 0 || playerNumber > players.length) { // Проверяем корректность номера
      const message = await ctx.reply("⚠️ Неверный номер игрока!"); // Если номер некорректный, отправляем предупреждение
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    const playerIndex = playerNumber - 1; // Преобразуем номер в индекс массива
    const player = players[playerIndex]; // Получаем игрока по индексу

    if (player.paid) { // Если игрок был отмечен как оплативший
      player.paid = false; // Снимаем отметку об оплате
      await sendPlayerList(ctx); // Обновляем список игроков

      // const message = await ctx.reply(`❌ ${player.name} больше не отмечен как оплативший.`);
      // deleteMessageAfterDelay(ctx, message.message_id);
    }
  });
};
