const buildTeamsMessage = (teams, title = "Составы команд", teamStats = {}) => {
  console.log('Inside buildTeamsMessage:');
  console.log('teams:', JSON.stringify(teams, null, 2));
  console.log('teamStats:', JSON.stringify(teamStats, null, 2));
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];
  
  // Создаем массив команд с их статистикой и индексами для сортировки
  const teamsWithStats = teams.map((team, index) => {
    const teamKey = `team${index + 1}`;
    const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0, goalsScored: 0, goalsConceded: 0 };
    const points = stats.wins * 3 + stats.draws * 1;
    return { team, stats, points, originalIndex: index };
  });

  // Сортируем команды по очкам (по убыванию)
  teamsWithStats.sort((a, b) => b.points - a.points || (b.stats.goalsScored - b.stats.goalsConceded) - (a.stats.goalsScored - a.stats.goalsConceded));

  let message = `🏆 <b>${title}:</b>\n\n<pre>`;

  // Заголовок таблицы с добавлением места
  message += "М  Команда|И|В|Н|П|ЗМ|ПМ|РМ|О\n";
  message += "--+-------+--+-+-+-+-+--+-+-+\n";

  // Заполнение таблицы с местами
  teamsWithStats.forEach((teamData, position) => {
    const { stats, points, originalIndex } = teamData;
    const teamColor = teamColors[originalIndex] || "⚽";
    const place = (position + 1).toString().padStart(2, " "); // Место (1, 2, 3...)
    const teamName = `${teamColor}`.padEnd(7, " "); // Эмодзи без номера
    const goalDifference = (stats.goalsScored - stats.goalsConceded);

    message += `${place} ${teamName}|${stats.games}|${stats.wins}|${stats.draws}|${stats.losses}|${stats.goalsScored.toString().padStart(2, " ")}|${stats.goalsConceded.toString().padStart(2, " ")}|${goalDifference.toString().padStart(2, " ")}|${points}\n`;
  });

  message += "</pre>\n";

  // Добавляем составы команд (по оригинальным индексам, а не по местам)
  message += "<b>Составы:</b>\n";
  teams.forEach((team, index) => {
    const teamColor = teamColors[index] || "⚽";
    message += `\n${teamColor} <b>Команда ${index + 1}:</b>\n`;
    team.forEach((player, i) => {
      const goalsText = player.goals && player.goals > 0 ? `, Г:${player.goals}` : "";
      message += `${i + 1}. ${player.name} (⭐${player.rating || 0}${goalsText})\n`;
    });
  });

  return message;
};

module.exports = { buildTeamsMessage };