const { Markup } = require("telegraf");

const createTeamButtons = (team, teamIndex) => {
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];
  const teamColor = teamColors[teamIndex] || "⚽"; // Цвет команды

  const buttons = team.map((player, index) => {
    const displayName = player.username 
      ? player.username
      : player.name;
    return Markup.button.callback(
      `${teamColor} ${index + 1}. ${displayName}`,
      `goal_${teamIndex}_${index}`
    );
  });

  // Группируем кнопки по 2 в ряд
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
};

module.exports = { createTeamButtons };