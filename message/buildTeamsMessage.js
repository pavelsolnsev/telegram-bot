const buildTeamsMessage = (teams, title = "Составы команд", teamStats = {}) => {
  // Определяем цвета для команд (до 4 команд)
  const teamColors = [
    "🔴", // Красный
    "🔵", // Синий
    "🟢", // Зелёный
    "🟡"  // Жёлтый
  ];

  let message = `🏆 <b>${title}:</b>\n\n`;
  teams.forEach((team, index) => {
    const teamKey = `team${index + 1}`;
    const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0 };
    // Используем цветной эмодзи для каждой команды или дефолтный ⚽, если команд больше 4
    const teamColor = teamColors[index] || "⚽";
    message += `${teamColor} <b>Команда ${index + 1}:</b> (W: ${stats.wins}, D: ${stats.draws}, L: ${stats.losses}, G: ${stats.games})\n`;
    team.forEach((player, i) => {
      const goalsText = player.goals && player.goals > 0 ? ` - Голы: ${player.goals}` : "";
      const ratingText = ` - ⭐${player.rating || 0}`; // Добавляем рейтинг
      message += `${i + 1}. ${player.name} ${player.username ? `(${player.username})` : ""}${goalsText}${ratingText}\n`;
    });
    message += "\n";
  });
  return message;
};

module.exports = { buildTeamsMessage };