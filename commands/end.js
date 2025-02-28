const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const savePlayersToDatabase = require("../database/savePlayers");

module.exports = (bot, GlobalState) => {
  bot.hears(/^e!$/i, async (ctx) => {
    const listMessageId = GlobalState.getListMessageId();
    const isMatchStarted = GlobalState.getStart();
    const ADMIN_ID = GlobalState.getAdminId();

    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
			const message = await ctx.reply("⚠️ Матч не начат!");
			return deleteMessageAfterDelay(ctx, message.message_id);
		} // Если матч не начался, выходим из функции

    if (listMessageId) {
      await ctx.telegram.deleteMessage(ctx.chat.id, listMessageId).catch(() => {});
      GlobalState.setListMessageId(null);
    }

    const allTeams = GlobalState.getTeams();
    const allPlayers = allTeams.flat();



    await savePlayersToDatabase(allPlayers);
    GlobalState.appendToPlayersHistory(allPlayers);

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
    GlobalState.setDivided(false);

    const message = await ctx.reply("✅ Сбор успешно завершён!");
    deleteMessageAfterDelay(ctx, message.message_id);
  });
};