
const { Markup } = require("telegraf");

const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");

module.exports = (bot, GlobalState) => {
  // Обработка команды для начала игры
  bot.hears(/^play (\d+) (\d+)$/, async (ctx) => {
    const teamIndex1 = parseInt(ctx.match[1], 10) - 1;
    const teamIndex2 = parseInt(ctx.match[2], 10) - 1;
    const teams = GlobalState.getTeams();
  
    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      const message = await ctx.reply("⛔Команды не найдены!");
			return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    const team1 = teams[teamIndex1].map(player => ({ ...player, goals: 0 }));
    const team2 = teams[teamIndex2].map(player => ({ ...player, goals: 0 }));
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2);
  
    const sentMessage = await ctx.reply(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(team1, teamIndex1),
        ...createTeamButtons(team2, teamIndex2),
      ]).reply_markup,
    });
  
    // Сохраняем ID сообщения с играющими командами
    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
  
    // Сохраняем текущие играющие команды
    GlobalState.setPlayingTeams({
      team1,
      team2,
      teamIndex1,
      teamIndex2,
    });
  });
};