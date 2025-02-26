const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const savePlayersToDatabase = require("../database/savePlayers");

module.exports = (bot, GlobalState) => {
  bot.hears(/^e!$/i, async (ctx) => {
    const listMessageId = GlobalState.getListMessageId();
    const isMatchStarted = GlobalState.getStart();
    const ADMIN_ID = GlobalState.getAdminId();

    await ctx.deleteMessage().catch(() => {});

    if (!isMatchStarted) return;
    
    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (listMessageId) {
      await ctx.telegram.deleteMessage(ctx.chat.id, listMessageId).catch(() => {});
      GlobalState.setListMessageId(null);
    }

    const allTeams = GlobalState.getTeams();
    const allPlayers = allTeams.flat();

    // Логируем для отладки
    console.log('allPlayers:', JSON.stringify(allPlayers, null, 2));

    await savePlayersToDatabase(allPlayers);
    GlobalState.appendToPlayersHistory(allPlayers);

    console.log('Updated players history:', GlobalState.getAllPlayersHistory());

    GlobalState.setPlayers([]);
    GlobalState.setQueue([]);
    GlobalState.setCollectionDate(null);
    GlobalState.setLocation("Локация пока не определена");
    GlobalState.setMaxPlayers(14);
    GlobalState.setStart(false);
    GlobalState.setNotificationSent(false);
    GlobalState.setTeams([]);
    GlobalState.setTeamStats({});
    GlobalState.setPlayingTeams(null);
    GlobalState.setPlayingTeamsMessageId(null);
    GlobalState.setLastTeamCount(null);
    GlobalState.setLastTeamsMessageId(null);

    const message = await ctx.reply("✅ Сбор успешно завершён!");
    deleteMessageAfterDelay(ctx, message.message_id);
  });
};