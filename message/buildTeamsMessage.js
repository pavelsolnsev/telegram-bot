const buildTeamsMessage = (teams, title = "Составы команд", teamStats = {}) => {
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];
  let message = `🏆 <b>${title}:</b>\n\n<pre>`;

  // Заголовок таблицы
  message += "Команда        | W  | D  | L  | G  | Игроки\n";
  message += "--------------+----+----+----+----+-------\n";

  // Заполнение таблицы
  teams.forEach((team, index) => {
    const teamKey = `team${index + 1}`;
    const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0 };
    const teamColor = teamColors[index] || "⚽";
    const teamName = `${teamColor} Команда ${index + 1}`.padEnd(14, " ");

    const wins = stats.wins.toString().padStart(2, " ");
    const draws = stats.draws.toString().padStart(2, " ");
    const losses = stats.losses.toString().padStart(2, " ");
    const games = stats.games.toString().padStart(2, " ");
    const playerCount = team.length.toString().padStart(5, " ");

    message += `${teamName}| ${wins} | ${draws} | ${losses} | ${games} | ${playerCount}\n`;
  });

  message += "</pre>\n";

  // Добавляем составы команд после таблицы
  message += "<b>Составы:</b>\n";
  teams.forEach((team, index) => {
    const teamColor = teamColors[index] || "⚽";
    message += `\n${teamColor} <b>Команда ${index + 1}:</b>\n`;
    team.forEach((player, i) => {
      const goalsText = player.goals && player.goals > 0 ? `, G:${player.goals}` : "";
      message += `${i + 1}. ${player.name} (⭐${player.rating || 0}${goalsText})\n`;
    });
  });

  return message;
};

module.exports = { buildTeamsMessage };