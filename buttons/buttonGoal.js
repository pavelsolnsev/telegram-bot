const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage"); // Импорт функции для отправки списка игроков
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
module.exports = (bot, GlobalState) => {
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const playingTeams = GlobalState.getPlayingTeams();
  
    if (!playingTeams) {
      return ctx.answerCbQuery("⛔ Нет активного матча!");
    }
  
    let player;
    if (teamIndex === playingTeams.teamIndex1) {
      player = playingTeams.team1[playerIndex];
      player.goals = (player.goals || 0) + 1;
    } else if (teamIndex === playingTeams.teamIndex2) {
      player = playingTeams.team2[playerIndex];
      player.goals = (player.goals || 0) + 1;
    } else {
      return ctx.answerCbQuery("Игрок не найден!");
    }
  
    GlobalState.setPlayingTeams(playingTeams);
  
    await updatePlayingTeamsMessage(ctx);
  
    const message = await ctx.reply(`Гол добавлен для ${player.name}! Теперь у него ${player.goals} гол(ов).`);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
  
};
