const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");

module.exports = (bot, GlobalState) => {
  bot.hears(/^g (\d+) (\d+)$/, async (ctx) => {
    const args = ctx.message.text.split(" ");
    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      return ctx.reply("⛔ Нет активного матча!");
    }

    let team;
    if (teamIndex === playingTeams.teamIndex1) {
      team = playingTeams.team1;
    } else if (teamIndex === playingTeams.teamIndex2) {
      team = playingTeams.team2;
    } else {
      return ctx.reply("⛔ Команда не найдена!");
    }

    if (!team[playerIndex]) {
      return ctx.reply("⛔ Игрок не найден!");
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await ctx.reply(`⚽ Гол добавлен для ${team[playerIndex].name}! Теперь у него ${team[playerIndex].goals} гол(ов) в этом матче.`);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
  bot.hears(/^ug (\d+) (\d+)$/, async (ctx) => {
    const args = ctx.message.text.split(" ");
    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;

    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      return ctx.reply("⛔ Нет активного матча!");
    }

    let team;
    if (teamIndex === playingTeams.teamIndex1) {
      team = playingTeams.team1;
    } else if (teamIndex === playingTeams.teamIndex2) {
      team = playingTeams.team2;
    } else {
      return ctx.reply("⛔ Команда не найдена!");
    }

    if (!team[playerIndex]) {
      return ctx.reply("⛔ Игрок не найден!");
    }

    if (team[playerIndex].goals && team[playerIndex].goals > 0) {
      team[playerIndex].goals -= 1;
    } else {
      return ctx.reply(`⚠️ У ${team[playerIndex].name} уже 0 голов.`);
    }

    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await ctx.reply(`⚽ Гол удален у ${team[playerIndex].name}. Теперь у него ${team[playerIndex].goals} гол(ов).`);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
};
