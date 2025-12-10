const buildTeamsMessage = (
  teamsBase,
  title = 'Составы команд',
  teamStats = {},
  updatedTeams = teamsBase,
  mvpPlayer = null,
  showRatings = true,
  leaders = null,
) => {
  const teamColors = ['🔴', '🔵', '🟢', '🟡'];

  // Таблица статистики на основе teamsBase
  const teamsWithStats = teamsBase.map((team, index) => {
    const teamKey = `team${index + 1}`;
    const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0, goalsScored: 0, goalsConceded: 0 };
    const points = stats.wins * 3 + stats.draws * 1;
    return { team, stats, points, originalIndex: index };
  });

  teamsWithStats.sort((a, b) => b.points - a.points || (b.stats.goalsScored - b.stats.goalsConceded) - (a.stats.goalsScored - a.stats.goalsConceded));

  let message = `🏆 <b>${title}</b>\n\n<pre>`;
  message += 'М  Ком|И|В|Н|П|ЗМ|ПМ|РМ|О\n';
  message += '--+---+--+-+-+-+-+--+-+-+\n';

  teamsWithStats.forEach((teamData, position) => {
    const { stats, points, originalIndex } = teamData;
    const teamColor = teamColors[originalIndex] || '⚽';
    const place = (position + 1).toString().padStart(2, ' ');
    const teamName = `${teamColor}`.padEnd(3, ' ');
    const goalDifference = stats.goalsScored - stats.goalsConceded;

    message += `${place} ${teamName}|${stats.games}|${stats.wins}|${stats.draws}|${stats.losses}|${stats.goalsScored.toString().padStart(2, ' ')}|${stats.goalsConceded.toString().padStart(2, ' ')}|${goalDifference.toString().padStart(2, ' ')}|${points}\n`;
  });

  message += '</pre>\n';

  // Добавляем MVP игрока, если он есть
  if (mvpPlayer) {
    const mvpName = mvpPlayer.username ? mvpPlayer.username : mvpPlayer.name || `${mvpPlayer.first_name} ${mvpPlayer.last_name || ''}`.trim();
    message += `<b>🏅 MVP: ${mvpName}</b> <b></b>\n\n`;
  }

  // Добавляем лидеров турнира, если переданы
  if (leaders) {
    const formatLeader = (player) => player?.username || player?.name || `${player?.first_name || ''} ${player?.last_name || ''}`.trim();
    const lines = [];

    if (leaders.scorer?.goals > 0 && leaders.scorer?.player) {
      lines.push(`<b>Голы:\n${formatLeader(leaders.scorer.player)}: ⚽${leaders.scorer.goals}</b>`);
    }

    if (leaders.assistant?.assists > 0 && leaders.assistant?.player) {
      lines.push(`<b>Пасы:\n${formatLeader(leaders.assistant.player)}: 🅰️${leaders.assistant.assists}</b>`);
    }

    if (leaders.goalkeeper?.saves > 0 && leaders.goalkeeper?.player) {
      lines.push(`<b>Сейвы:\n${formatLeader(leaders.goalkeeper.player)}: 🧤${leaders.goalkeeper.saves}</b>`);
    }

    if (lines.length > 0) {
      message += `<b>Лидеры турнира по статистике:</b>\n${lines.join('\n')}\n\n`;
    }
  }

  // Функция для форматирования имени игрока
  const formatPlayerName = (name, maxLength) => {
    // Удаляем эмодзи и специальные символы
    // eslint-disable-next-line no-misleading-character-class
    const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
    const cleanName = name.replace(emojiRegex, '').trim();
    const chars = Array.from(cleanName);
    if (chars.length <= maxLength) {
      return cleanName.padEnd(maxLength, ' ');
    }
    return chars.slice(0, Math.max(2, maxLength - 2)).join('') + '..';
  };

  // Функция для форматирования строки игрока
  const formatPlayerLine = (index, name, rating, goals, assists, saves) => {
    const goalsMark = goals && goals > 0 ? ` ⚽${goals}` : '';
    const assistsMark = assists && assists > 0
      ? (goalsMark ? `🅰️${assists}` : ` 🅰️${assists}`)
      : '';
    const savesMark = saves && saves > 0
      ? (goalsMark || assistsMark ? `🧤${saves}` : ` 🧤${saves}`)
      : '';
    const paddedIndex = (index + 1).toString().padStart(2, ' ') + '.';

    // Если есть голы/ассисты или рейтинг и иконка, сокращаем имя чуть сильнее, чтобы избежать переноса
    const hasStats = Boolean(goalsMark || assistsMark || savesMark);
    const maxNameLength = hasStats ? 10 : 11;
    const paddedName = formatPlayerName(name, maxNameLength);
    const formattedRating = parseFloat(rating).toString();

    if (!showRatings) {
      const ratingPrefix = rating > 0 ? '+' : '';
      return `<code>${paddedIndex}${paddedName}</code> <b><i>${ratingPrefix}${formattedRating}</i></b>${goalsMark}${assistsMark}${savesMark}`;
    }

    let ratingIcon;
    if (rating < 10) ratingIcon = '⭐';
    else if (rating < 30) ratingIcon = '💫';
    else if (rating < 60) ratingIcon = '✨';
    else if (rating < 100) ratingIcon = '🌠';
    else if (rating < 150) ratingIcon = '💎';
    else ratingIcon = '🏆';
    return `<code>${paddedIndex}${paddedName} ${ratingIcon}${formattedRating}${goalsMark}${assistsMark}${savesMark}</code>`;
  };

  message += '<b>Составы:</b>\n';
  updatedTeams.forEach((updatedTeam, index) => {
    const teamColor = teamColors[index] || '⚽';
    message += `\n${teamColor} <b>Команда ${index + 1}:</b>\n`;

    updatedTeam.forEach((player, i) => {
      const displayName = player.username ? player.username : player.name;
      const rating = player.rating || 0;
      message += `${formatPlayerLine(i, displayName, rating, player.goals, player.assists, player.saves)}\n`;
    });
  });

  return message;
};

module.exports = { buildTeamsMessage };
