const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { reshuffleArray } = require("../utils/reshuffleArray");
const { divideIntoTeams } = require("../utils/divideIntoTeams");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { sendTeamsMessage } = require("../message/sendTeamsMessage");

module.exports = (bot, GlobalState) => {  
  // Обработка команд для создания команд
  bot.hears(/^team (2|3|4)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const msg = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const numTeams = parseInt(ctx.match[1], 10);
    let players = [...GlobalState.getPlayers()];

    if (players.length < numTeams) {
      return ctx.reply("⚠️ Недостаточно игроков для создания команд!");
    }

    players = reshuffleArray(players);
    const teams = divideIntoTeams(players, numTeams);
    const teamsMessage = buildTeamsMessage(teams, "Составы команд");

    GlobalState.setTeams(teams);
    GlobalState.setLastTeamCount(numTeams);
    await sendTeamsMessage(ctx, teamsMessage);
  });

};
