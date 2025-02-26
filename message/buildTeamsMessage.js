const buildTeamsMessage = (teams, title = "Составы команд", teamStats = {}) => {
  let message = `🏆 <b>${title}:</b>\n\n`;
  teams.forEach((team, index) => {
    const teamKey = `team${index + 1}`;
    const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0 };
    message += `⚽ <b>Команда ${index + 1}:</b> (W: ${stats.wins}, D: ${stats.draws}, L: ${stats.losses}, Games: ${stats.games})\n`;
    team.forEach((player, i) => {
      const goalsText = player.goals && player.goals > 0 ? ` - Голы: ${player.goals}` : "";
      message += `${i + 1}. ${player.name} ${player.username ? `(@${player.username})` : ""}${goalsText}\n`;
    });
    message += "\n";
  });
  return message;
};

module.exports = { buildTeamsMessage };