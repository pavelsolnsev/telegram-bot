const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage"); // Импорт функции для отправки списка игроков
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
module.exports = (bot, GlobalState) => {
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const teams = GlobalState.getTeams();
  
    if (!teams[teamIndex] || !teams[teamIndex][playerIndex]) {
      return ctx.answerCbQuery("Игрок не найден!");
    }
  
    const player = teams[teamIndex][playerIndex];
    player.goals = (player.goals || 0) + 1;
    GlobalState.setTeams(teams);
  
    // Обновляем playingTeams
    const playingTeams = GlobalState.getPlayingTeams();
    if (playingTeams) {
      if (teamIndex === playingTeams.teamIndex1) {
        playingTeams.team1[playerIndex].goals = player.goals;
      } else if (teamIndex === playingTeams.teamIndex2) {
        playingTeams.team2[playerIndex].goals = player.goals;
      }
      GlobalState.setPlayingTeams(playingTeams);
    }
  
    await updatePlayingTeamsMessage(ctx); // Теперь сообщение обновится

    const message = await ctx.reply(`Гол добавлен для ${player.name}! Теперь у него ${player.goals} гол(ов).`);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
};
