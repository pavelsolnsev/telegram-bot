const buildTeamsMessage = (teamsBase, title = "Составы команд", teamStats = {}, updatedTeams = teamsBase) => {
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];
  
  // Таблица статистики на основе teamsBase
  const teamsWithStats = teamsBase.map((team, index) => {
    const teamKey = `team${index + 1}`;
    const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0, goalsScored: 0, goalsConceded: 0 };
    const points = stats.wins * 3 + stats.draws * 1;
    return { team, stats, points, originalIndex: index };
  });

  teamsWithStats.sort((a, b) => b.points - a.points || (b.stats.goalsScored - b.stats.goalsConceded) - (a.stats.goalsScored - a.stats.goalsConceded));

  let message = `🏆 <b>${title}:</b>\n\n<pre>`;
  message += "М  Команда|И|В|Н|П|ЗМ|ПМ|РМ|О\n";
  message += "--+-------+--+-+-+-+-+--+-+-+\n";

  teamsWithStats.forEach((teamData, position) => {
    const { stats, points, originalIndex } = teamData;
    const teamColor = teamColors[originalIndex] || "⚽";
    const place = (position + 1).toString().padStart(2, " ");
    const teamName = `${teamColor}`.padEnd(7, " ");
    const goalDifference = (stats.goalsScored - stats.goalsConceded);

    message += `${place} ${teamName}|${stats.games}|${stats.wins}|${stats.draws}|${stats.losses}|${stats.goalsScored.toString().padStart(2, " ")}|${stats.goalsConceded.toString().padStart(2, " ")}|${goalDifference.toString().padStart(2, " ")}|${points}\n`;
  });

  message += "</pre>\n";

  message += "<b>Составы:</b>\n";
  updatedTeams.forEach((updatedTeam, index) => {
    const baseTeam = teamsBase[index] || []; // Берем соответствующую команду из teamsBase
    const teamColor = teamColors[index] || "⚽";
    message += `\n${teamColor} <b>Команда ${index + 1}:</b>\n`;
    
    updatedTeam.forEach((player, i) => {
      // Находим игрока в baseTeam по id для статичного рейтинга
      const basePlayer = baseTeam.find(bp => bp.id === player.id) || player;
      const staticRating = basePlayer.rating || 0; // Статичный рейтинг из teamsBase
      const goalsText = player.goals && player.goals > 0 ? ` ⚽${player.goals}` : "";
      
      // Используем username, если он есть, иначе берем только firstname из name, убираем @ из username
      const displayName = player.username ? player.username.replace(/^@/, "") : player.name.split(" ")[0];
      
      message += `${i + 1}. ${displayName} (⭐${staticRating}) ${goalsText}\n`;
    });
  });

  return message;
};

module.exports = { buildTeamsMessage };