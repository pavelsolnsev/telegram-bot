const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { divideIntoTeams } = require("../utils/divideIntoTeams");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { sendTeamsMessage } = require("../message/sendTeamsMessage");

module.exports = (bot, GlobalState) => {
  bot.hears(/^tm(2|3|4)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    await ctx.deleteMessage().catch(() => {});
    // Проверка на админа остается
    if (ctx.from.id !== ADMIN_ID) {
      const msg = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const numTeams = parseInt(ctx.match[1], 10);
    let players = [...GlobalState.getPlayers()];

    if (!players || players.length === 0) {
      return ctx.reply("⚠️ Нет игроков для создания команд!");
    }

    if (players.length < numTeams) {
      return ctx.reply(`⚠️ Недостаточно игроков для ${numTeams} команд! Требуется минимум ${numTeams} игрока, а сейчас: ${players.length}.`);
    }

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    // Распределяем игроков по рейтингу
    const teams = divideIntoTeams(players, numTeams);
    const teamStats = GlobalState.getTeamStats();
    const teamsMessage = buildTeamsMessage(teams, "Составы команд (по рейтингу)", teamStats, teams);

    GlobalState.setTeams(teams);
    GlobalState.setLastTeamCount(numTeams);
    GlobalState.setDivided(true);
    await sendTeamsMessage(ctx, teamsMessage);
  });
};