const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");

module.exports = (bot, GlobalState) => {
  // Обработчик команды "p<номер игрока>" (помечает игрока как оплатившего)
  bot.hears(/^p(\d+)$/i, async (ctx) => { 
    const players = GlobalState.getPlayers();
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const playerNumber = Number(ctx.message.text.match(/^p(\d+)$/i)[1]);

    if (playerNumber <= 0 || playerNumber > players.length) {
      const message = await ctx.reply("⚠️ Неверный номер игрока!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const playerIndex = playerNumber - 1;
    const player = players[playerIndex];

    if (!player.paid) {
      player.paid = true;
      await sendPlayerList(ctx);
      const message = await ctx.reply(`✅ ${player.name} оплатил участие.`);
      deleteMessageAfterDelay(ctx, message.message_id);
    } else {
      const message = await ctx.reply(`⚠️ ${player.name} уже отмечен как оплативший!`);
      deleteMessageAfterDelay(ctx, message.message_id);
    }
  });

  // Обработчик команды "u<номер игрока>" (снимает отметку об оплате с игрока)
  bot.hears(/^u(\d+)$/i, async (ctx) => { 
    const players = GlobalState.getPlayers();
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();

    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) return;

    const playerNumber = Number(ctx.message.text.match(/^u(\d+)$/i)[1]);

    if (playerNumber <= 0 || playerNumber > players.length) {
      const message = await ctx.reply("⚠️ Неверный номер игрока!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const playerIndex = playerNumber - 1;
    const player = players[playerIndex];

    if (player.paid) {
      player.paid = false;
      await sendPlayerList(ctx);
      const message = await ctx.reply(`❌ ${player.name} больше не отмечен как оплативший.`);
      deleteMessageAfterDelay(ctx, message.message_id);
    } else {
      const message = await ctx.reply(`⚠️ ${player.name} и так не отмечен как оплативший!`);
      deleteMessageAfterDelay(ctx, message.message_id);
    }
  });
};