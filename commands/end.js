const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const savePlayersToDatabase = require("../database/savePlayers");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");

module.exports = (bot, GlobalState) => {
  // Регистрируем обработчик pinned_message для удаления системных сообщений о закреплении
  bot.on("pinned_message", async (ctx) => {
    try {
      // Удаляем системное сообщение о закреплении
      await ctx.deleteMessage().catch((error) => {
        console.error("Ошибка удаления системного сообщения о закреплении:", error);
      });
    } catch (error) {
      console.error("Общая ошибка в обработчике pinned_message:", error);
    }
  });

  bot.hears(/^e!$/i, async (ctx) => {
    const listMessageId = GlobalState.getListMessageId();
    const listMessageChatId = GlobalState.getListMessageChatId();
    const isMatchStarted = GlobalState.getStart();
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const playingTeams = GlobalState.getPlayingTeams();
    const ADMIN_ID = GlobalState.getAdminId();
  
    await ctx.deleteMessage().catch(() => {});
  
    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    if (playingTeams && !isMatchFinished) {
      const message = await ctx.reply("⛔ Матч еще не завершен! Используйте команду fn для завершения матча.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    // Удаляем сообщение со списком игроков из группы
    if (listMessageId && listMessageChatId) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await ctx.telegram.deleteMessage(listMessageChatId, listMessageId).catch((error) => {
          console.error("Ошибка удаления сообщения из группы:", error);
        });
        GlobalState.setListMessageId(null);
        GlobalState.setListMessageChatId(null);
      } catch (error) {
        console.error("Общая ошибка при удалении сообщения:", error);
      }
    }
  
    const allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const teamsBase = GlobalState.getTeamsBase();
    const allPlayers = allTeams.flat();
  
    await savePlayersToDatabase(allPlayers);
    GlobalState.appendToPlayersHistory(allPlayers);
  
    if (listMessageChatId && allTeams.length > 0) {
      const teamsMessage = buildTeamsMessage(teamsBase, "Итоги матча", teamStats, allTeams);
      try {
        const sentMessage = await ctx.telegram.sendMessage(listMessageChatId, teamsMessage, {
          parse_mode: "HTML",
          disable_notification: true,
        });
  
        await ctx.telegram.unpinChatMessage(listMessageChatId, sentMessage.message_id).catch((error) => {
          console.log("Сообщение не было закреплено или ошибка при откреплении:", error);
        });
      } catch (error) {
        console.error("Ошибка отправки таблицы в группу:", error);
      }
    }
  
    // Сбрасываем состояние
    GlobalState.setPlayers([]);
    GlobalState.setQueue([]);
    GlobalState.setCollectionDate(null);
    GlobalState.setMaxPlayers(20);
    GlobalState.setStart(false);
    GlobalState.setNotificationSent(false);
    GlobalState.setTeams([]);
    GlobalState.setTeamStats({});
    GlobalState.setPlayingTeams(null);
    GlobalState.setPlayingTeamsMessageId(null);
    GlobalState.setLastTeamCount(null);
    GlobalState.setLastTeamsMessageId(null);
    GlobalState.setDivided(false);
    GlobalState.setIsStatsInitialized(false);
    GlobalState.setIsMatchFinished(false); // Сбрасываем флаг завершения матча
  
    const message = await ctx.reply("✅ Сбор успешно завершён!");
    deleteMessageAfterDelay(ctx, message.message_id);
  });
};