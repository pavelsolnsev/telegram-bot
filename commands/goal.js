
const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage"); // Импорт функции для отправки списка игроков
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
module.exports = (bot, GlobalState) => {
  bot.hears(/^g (\d+) (\d+)$/, async (ctx) => {
    const args = ctx.message.text.split(" ");
    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    const teams = GlobalState.getTeams();

    if (!teams[teamIndex] || !teams[teamIndex][playerIndex]) {
      const message = await ctx.reply("Игрок не найден!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const player = teams[teamIndex][playerIndex];
    player.goals = (player.goals || 0) + 1;
    GlobalState.setTeams(teams);

    // Обновляем данные в playingTeams
    const playingTeams = GlobalState.getPlayingTeams();
    if (playingTeams) {
      if (teamIndex === playingTeams.teamIndex1) {
        playingTeams.team1[playerIndex].goals = player.goals;
      } else if (teamIndex === playingTeams.teamIndex2) {
        playingTeams.team2[playerIndex].goals = player.goals;
      }
      GlobalState.setPlayingTeams(playingTeams);
    }

    await updatePlayingTeamsMessage(ctx);
    const message = await ctx.reply(`Гол добавлен для ${player.name}. Теперь у него ${player.goals} гол(ов).`);
		return deleteMessageAfterDelay(ctx, message.message_id);
  });
};