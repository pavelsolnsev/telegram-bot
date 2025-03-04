const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2, status = 'playing') => {
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];

  const emoji = {
    playing: '⚽',
    finished: '✅'
  }[status] || '⚽';

  const title = {
    playing: "Команды на поле",
    finished: "🏁 Итог матча 🏁"
  }[status] || "Команды на поле";

  const color1 = teamColors[teamIndex1] || "⚽";
  const color2 = teamColors[teamIndex2] || "⚽";

  let message = `${emoji} <b>${title}</b>\n\n`;

  // Команда 1
  message += `${color1} <b>Команда ${teamIndex1 + 1}</b> 👥\n`;
  team1.forEach((player, index) => {
    const goals = player.goals || 0;
    message += `${index + 1}. ${player.name} ${goals > 0 ? `⚽${goals}` : ''}\n`;
  });

  // Короткий разделитель
  message += `〰️\n`;

  // Команда 2
  message += `${color2} <b>Команда ${teamIndex2 + 1}</b> 👥\n`;
  team2.forEach((player, index) => {
    const goals = player.goals || 0;
    message += `${index + 1}. ${player.name} ${goals > 0 ? `⚽${goals}` : ''}\n`;
  });

  // Итог матча, если статус finished
  if (status === 'finished') {
    const team1Goals = team1.reduce((sum, p) => sum + (p.goals || 0), 0);
    const team2Goals = team2.reduce((sum, p) => sum + (p.goals || 0), 0);

    message += `\n\n📊 <b>Счет:</b> ${color1} ${team1Goals}:${team2Goals} ${color2}\n\n`;
    message += team1Goals > team2Goals ? `🏆 ${color1} побеждает!` :
               team2Goals > team1Goals ? `🏆 ${color2} побеждает!` :
               "🤝 Ничья!";
  }

  return message;
};

module.exports = { buildPlayingTeamsMessage };