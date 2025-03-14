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

  // Функция для форматирования имени игрока (такая же как в sendPlayerList)
  const formatPlayerName = (name, maxLength = 11) => {
    const cleanName = name.replace(/^@/, "");
    return cleanName.length > maxLength ? cleanName.slice(0, maxLength - 3) + "..." : cleanName;
  };

  // Функция для форматирования строки игрока
  const formatPlayerLine = (index, name, rating, goals) => {
    const goalsMark = goals && goals > 0 ? ` ⚽${goals}` : "";
    const paddedIndex = (index + 1).toString().padStart(2, " ") + ".";
    const paddedName = formatPlayerName(name).padEnd(11, " ");
    const formattedRating = parseFloat(rating).toString();

    let ratingIcon;
    if (rating < 10) ratingIcon = "⭐";
    else if (rating < 30) ratingIcon = "💫";
    else if (rating < 60) ratingIcon = "✨";
    else if (rating < 100) ratingIcon = "🌠";
    else if (rating < 150) ratingIcon = "💎";
    else ratingIcon = "🏆";
    return `${paddedIndex}${paddedName} ${ratingIcon}${formattedRating}${goalsMark}`;
  };

  message += "<b>Составы:</b>\n";
  updatedTeams.forEach((updatedTeam, index) => {
    const baseTeam = teamsBase[index] || [];
    const teamColor = teamColors[index] || "⚽";
    message += `\n${teamColor} <b>Команда ${index + 1}:</b>\n<code>`;
    
    updatedTeam.forEach((player, i) => {
      const basePlayer = baseTeam.find(bp => bp.id === player.id) || player;
      const staticRating = basePlayer.rating || 0;
      const displayName = player.username ? player.username : player.name.split(" ")[0];
      message += `${formatPlayerLine(i, displayName, staticRating, player.goals)}\n`;
    });
    message += "</code>";
  });

  return message;
};

module.exports = { buildTeamsMessage };