// Функция создания сообщения с играющими командами
const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2) => {
  let message = "🔥 Играют следующие команды:\n\n";
  message += `<b>Команда ${teamIndex1 + 1}:</b>\n`;
  team1.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });
  message += `\n<b>Команда ${teamIndex2 + 1}:</b>\n`;
  team2.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });
  return message;
};

module.exports = { buildPlayingTeamsMessage };