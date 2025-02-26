// Подключаем функцию, которая обновляет сообщение с информацией об играющих командах
const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage");

// Подключаем функцию, которая может удалить сообщение через какое-то время
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const db = require("../database/database");

module.exports = (bot, GlobalState) => {
  // Учим бота реагировать на команды вроде "goal_1_2" (где числа — это команда и игрок)
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const playingTeams = GlobalState.getPlayingTeams();
  
    if (!playingTeams) {
      return ctx.answerCbQuery("⛔ Нет активного матча!");
    }
  
    let team;
    if (teamIndex === playingTeams.teamIndex1) {
      team = playingTeams.team1;
    } else if (teamIndex === playingTeams.teamIndex2) {
      team = playingTeams.team2;
    } else {
      return ctx.answerCbQuery("⛔ Команда не найдена!");
    }
  
    if (!team[playerIndex]) {
      return ctx.answerCbQuery("⛔ Игрок не найден!");
    }
  
    team[playerIndex].goals += 1;
    GlobalState.setPlayingTeams(playingTeams);
  
    await updatePlayingTeamsMessage(ctx);
  
    const message = await ctx.reply(`⚽ Гол добавлен для ${team[playerIndex].name}! Теперь у него ${team[playerIndex].goals} гол(ов) в этом матче.`);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
  
};