const { Markup } = require("telegraf");
const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { safeTelegramCall } = require("../utils/telegramUtils");

module.exports = (bot, GlobalState) => {
  bot.hears(/^pl(\d+)(\d+)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const isStatsInitialized = GlobalState.getIsStatsInitialized();
    const teamIndex1 = parseInt(ctx.match[1], 10) - 1;
    const teamIndex2 = parseInt(ctx.match[2], 10) - 1;
    const teams = GlobalState.getTeams();
  
    await ctx.deleteMessage().catch(() => {});
  
    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  
    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  
    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      const message = await ctx.reply("⛔ Команды не найдены!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  
    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }
  
    const resetGoals = (team) => team.map(player => ({
      ...player,
      goals: 0,
    }));
  
    let team1 = resetGoals(teams[teamIndex1]);
    let team2 = resetGoals(teams[teamIndex2]);
  
    if (!isStatsInitialized) {
      const clearPlayerStats = (team) => team.map(player => ({
        ...player,
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals: 0,
        rating: 0,
      }));
      const allTeams = [...GlobalState.getTeams()].map(clearPlayerStats);
      const allTeamsBase = [...GlobalState.getTeams()];
  
      GlobalState.setTeamsBase([...allTeamsBase]);
      GlobalState.setTeams(allTeams);
      GlobalState.setIsStatsInitialized(true);
    }
  
    // Удаляем кнопку "Перемешать состав" из предыдущего сообщения
    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
    if (lastTeamsMessage && lastTeamsMessage.chatId && lastTeamsMessage.messageId) {
      const teamsBase = GlobalState.getTeamsBase() || teams.map(team => [...team]);
      const teamStats = GlobalState.getTeamStats() || {};
      const updatedTeams = GlobalState.getTeams();
  
      const teamsMessageWithoutButton = buildTeamsMessage(
        teamsBase,
        "Составы команд",
        teamStats,
        updatedTeams
      );
  
      try {
        await safeTelegramCall(ctx, "editMessageText", [
          lastTeamsMessage.chatId,
          lastTeamsMessage.messageId,
          null,
          teamsMessageWithoutButton,
          { parse_mode: "HTML" }
        ]);
      } catch (error) {
        console.error("Ошибка при удалении кнопки из предыдущего сообщения:", error);
      }
    }
  
    // Формируем новое сообщение для играющих команд
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, 'playing');
  
    // Получаем кнопки для каждой команды
    const team1Buttons = createTeamButtons(team1, teamIndex1);
    const team2Buttons = createTeamButtons(team2, teamIndex2);
  
    const sentMessage = await ctx.reply(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...team1Buttons,
        [Markup.button.callback("—", "noop")],
        ...team2Buttons
      ]).reply_markup,
    });
  
    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
    GlobalState.setPlayingTeams({
      team1,
      team2,
      teamIndex1,
      teamIndex2,
    });
    GlobalState.setIsMatchFinished(false); // Матч начат, еще не завершен
  });
};