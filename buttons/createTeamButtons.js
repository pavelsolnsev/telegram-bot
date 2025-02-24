const { Markup } = require("telegraf");
// Функция создания кнопок для игроков команды
const createTeamButtons = (team, teamIndex) => {
  return team.map((player, index) =>
    Markup.button.callback(`${index + 1}. ${player.name}`, `goal_${teamIndex}_${index}`)
  );
};

module.exports = { createTeamButtons };