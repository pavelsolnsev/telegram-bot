const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
module.exports = (bot, GlobalState) => {
  bot.hears(/^p \d+$/i, async (ctx) => {
    const players = GlobalState.getPlayers()
    const ADMIN_ID = GlobalState.getAdminId();
    let isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});
    if (!isMatchStarted) return;
    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
    const playerNumber = Number(ctx.message.text.trim().slice(2).trim());
    if (playerNumber <= 0 || playerNumber > players.length) {
      const message = await ctx.reply("⚠️ Неверный номер игрока!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
    const playerIndex = playerNumber - 1;
    const player = players[playerIndex];
    if (!player.paid) {
      player.paid = true;
      await sendPlayerList(ctx);
    }
  });

  bot.hears(/^u \d+$/i, async (ctx) => {
    const players = GlobalState.getPlayers()
    const ADMIN_ID = GlobalState.getAdminId();
    let isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});
    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
    if (!isMatchStarted) return;
    const playerNumber = Number(ctx.message.text.trim().slice(2).trim());
    if (playerNumber <= 0 || playerNumber > players.length) {
      const message = await ctx.reply("⚠️ Неверный номер игрока!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
    const playerIndex = playerNumber - 1;
    const player = players[playerIndex];
    if (player.paid) {
      player.paid = false; 
      await sendPlayerList(ctx);
    }
  });
};