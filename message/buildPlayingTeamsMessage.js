const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2, status = 'playing') => {
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];

  const emoji = {
    playing: '⚽',    
    finished: '✅'    
  }[status] || '⚽';

  const title = {
    playing: "Команды на поле:",
    finished: "🏁 <b>Команды сыграли!</b> 🏁"
  }[status] || "Команды на поле:";

  const color1 = teamColors[teamIndex1] || "⚽";
  const color2 = teamColors[teamIndex2] || "⚽";

  let message = `${emoji} <b>${title}</b>\n\n`;
  message += `${color1} <b>Команда ${teamIndex1 + 1}:</b>\n`;
  team1.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });

  message += `\n━━━━━━━━━━━━━━━━━━\n`;

  message += `${color2} <b>Команда ${teamIndex2 + 1}:</b>\n`;
  team2.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });

  if (status === 'finished') {
    const team1Goals = team1.reduce((sum, p) => sum + (p.goals || 0), 0);
    const team2Goals = team2.reduce((sum, p) => sum + (p.goals || 0), 0);
    message += `\n\n<b>📊 Счет: ${team1Goals} - ${team2Goals}</b>`;
  }

  return message;
};

module.exports = { buildPlayingTeamsMessage };
