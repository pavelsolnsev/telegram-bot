const { selectMvp } = require('./selectMvp');
const { getTeamName } = require('./getTeamName');

// Генерация персональной статистики игрока
const generatePlayerStats = (player, teamIndex, teamStats, allTeams, mvpPlayer, teamColors) => {
  const teamKey = `team${teamIndex + 1}`;
  const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0, goalsScored: 0, goalsConceded: 0 };
  const color = teamColors[teamIndex] || '⚽';
  const points = stats.wins * 3 + stats.draws * 1;

  // Определяем позицию команды
  const allTeamsWithStats = allTeams.map((team, idx) => {
    const key = `team${idx + 1}`;
    const teamStatsData = teamStats[key] || { wins: 0, losses: 0, draws: 0, games: 0, goalsScored: 0, goalsConceded: 0 };
    const teamPoints = teamStatsData.wins * 3 + teamStatsData.draws * 1;
    const goalDiff = teamStatsData.goalsScored - teamStatsData.goalsConceded;
    return { index: idx + 1, points: teamPoints, goalDifference: goalDiff };
  });

  const sortedTeams = [...allTeamsWithStats].sort((a, b) =>
    b.points - a.points || b.goalDifference - a.goalDifference,
  );
  const teamPosition = sortedTeams.findIndex(t => t.index === teamIndex + 1) + 1;

  // Проверяем, был ли игрок MVP команды
  const team = allTeams[teamIndex] || [];
  const teamMvp = selectMvp(team);
  const isTeamMvp = teamMvp && teamMvp.id === player.id;

  // Проверяем, был ли игрок главным MVP турнира
  const isTournamentMvp = mvpPlayer && mvpPlayer.id === player.id;

  // Статистика игрока
  const goals = player.goals || 0;
  const assists = player.assists || 0;
  const saves = player.saves || 0;
  const rating = player.rating || 0;
  const wins = player.wins || 0;
  const draws = player.draws || 0;
  const losses = player.losses || 0;
  const gamesPlayed = player.gamesPlayed || 0;

  // Разбор изменения рейтинга по компонентам (используем значения из игрока, если они заданы)
  const goalsDelta = typeof player.ratingGoalsDelta === 'number' ? player.ratingGoalsDelta : 0;
  const assistsDelta = typeof player.ratingAssistsDelta === 'number' ? player.ratingAssistsDelta : 0;
  const savesDelta = typeof player.ratingSavesDelta === 'number' ? player.ratingSavesDelta : 0;
  const cleanSheetsDelta = typeof player.ratingCleanSheetsDelta === 'number' ? player.ratingCleanSheetsDelta : 0;
  const winsDelta = typeof player.ratingWinsDelta === 'number' ? player.ratingWinsDelta : 0;
  const drawsDelta = typeof player.ratingDrawsDelta === 'number' ? player.ratingDrawsDelta : 0;
  const lossesDelta = typeof player.ratingLossesDelta === 'number' ? player.ratingLossesDelta : 0;
  const totalRatingDelta = typeof player.ratingTournamentDelta === 'number'
    ? player.ratingTournamentDelta
    : goalsDelta
      + assistsDelta
      + savesDelta
      + cleanSheetsDelta
      + winsDelta
      + drawsDelta
      + lossesDelta;

  const formatDelta = (value) => {
    const num = Number(value) || 0;
    const rounded = Math.round(num * 10) / 10;
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}`;
  };

  let message = '<b>📊 Ваша статистика турнира</b>\n\n';

  // Команда и позиция
  const teamName = getTeamName(teamIndex);
  message += `${color} <b>${teamName}</b> - ${teamPosition} место\n`;
  message += `Очки команды: ${points} (${stats.wins}В ${stats.draws}Н ${stats.losses}П)\n\n`;

  // Статистика игрока
  message += '<b>Ваши показатели:</b>\n';
  message += `⚽️ Голы: ${goals}\n`;
  message += `🎯 Ассисты: ${assists}\n`;
  message += `🧤 Сейвы: ${saves}\n`;
  message += `⭐ Рейтинг: ${rating > 0 ? '+' : ''}${rating}\n\n`;

  // Статистика матчей
  message += '<b>Результаты:</b>\n';
  message += `Победы: ${wins}\n`;
  message += `Ничьи: ${draws}\n`;
  message += `Поражения: ${losses}\n`;
  message += `Игр сыграно: ${gamesPlayed}\n\n`;

  // Разбор рейтинга по компонентам
  message += '<b>Разбор рейтинга:</b>\n';
  if (goalsDelta !== 0) {
    message += `⚽ Голы: ${formatDelta(goalsDelta)}\n`;
  }
  if (assistsDelta !== 0) {
    message += `🎯 Ассисты: ${formatDelta(assistsDelta)}\n`;
  }
  if (savesDelta !== 0) {
    message += `🧤 Сейвы: ${formatDelta(savesDelta)}\n`;
  }
  if (cleanSheetsDelta !== 0) {
    message += `🧱 "Сухие" матчи: ${formatDelta(cleanSheetsDelta)}\n`;
  }
  if (winsDelta !== 0) {
    message += `🏆 Победы: ${formatDelta(winsDelta)}\n`;
  }
  if (drawsDelta !== 0) {
    message += `🤝 Ничьи: ${formatDelta(drawsDelta)}\n`;
  }
  if (lossesDelta !== 0) {
    message += `📉 Штрафы за поражения: ${formatDelta(lossesDelta)}\n`;
  }
  message += `Общий рейтинг: ${formatDelta(totalRatingDelta)}\n\n`;

  // Находим лучших игроков по голам, ассистам и сейвам среди всех игроков
  const allPlayers = allTeams.flat();
  const maxGoals = Math.max(...allPlayers.map(p => p.goals || 0), 0);
  const maxAssists = Math.max(...allPlayers.map(p => p.assists || 0), 0);
  const maxSaves = Math.max(...allPlayers.map(p => p.saves || 0), 0);
  const isTopScorer = goals === maxGoals && goals > 0;
  const isTopAssister = assists === maxAssists && assists > 0;
  const isTopGoalkeeper = saves === maxSaves && saves > 0;

  // Находим команду с наименьшим количеством пропущенных голов
  const allTeamGoalsConceded = Object.values(teamStats).map(teamStat => teamStat.goalsConceded || 0);
  const minGoalsConceded = Math.min(...allTeamGoalsConceded, Infinity);
  const isBestDefense = stats.goalsConceded === minGoalsConceded && minGoalsConceded !== Infinity;

  // Серии побед и непобедимости
  const maxConsecutiveWins = player.maxConsecutiveWins || 0;
  const maxConsecutiveUnbeaten = player.maxConsecutiveUnbeaten || 0;

  // Достижения
  const achievements = [];
  if (isTournamentMvp) {
    achievements.push('🏆 MVP турнира');
  }
  if (isTeamMvp) {
    achievements.push(`⭐ MVP команды ${color}`);
  }

  // Позиция команды
  if (teamPosition === 1) {
    achievements.push('🏅 Чемпион');
  } else if (teamPosition === 2) {
    achievements.push('🥈 Призер');
  } else if (teamPosition === 3) {
    achievements.push('🎖️ Бронза');
  }

  // Серии побед
  if (maxConsecutiveWins >= 3) {
    achievements.push(`🔥 Серия побед (${maxConsecutiveWins} подряд)`);
  }

  // Непобедимость
  if (maxConsecutiveUnbeaten >= 3) {
    achievements.push(`💪 Непобедимый (${maxConsecutiveUnbeaten} матчей без поражений)`);
  }

  // Надежная защита
  if (isBestDefense) {
    achievements.push('🛡️ Надежная защита');
  }

  // Восходящая звезда (прирост рейтинга)
  if (totalRatingDelta >= 10) {
    const formattedDelta = formatDelta(totalRatingDelta);
    achievements.push(`📈 Восходящая звезда (${formattedDelta})`);
  }

  // Лучшие игроки турнира
  if (isTopScorer) {
    achievements.push(`👑 Лучший бомбардир турнира (${goals} голов)`);
  }
  if (isTopAssister) {
    achievements.push(`🎯 Лучший ассистент турнира (${assists} передач)`);
  }
  if (isTopGoalkeeper) {
    achievements.push(`🧤 Лучший вратарь турнира (${saves} сейвов)`);
  }

  // Комбинации
  if (goals > 0 && assists > 0 && saves > 0) {
    achievements.push('⚽️🎯🧤 Универсал');
  }
  if (goals >= 3 && assists >= 2) {
    achievements.push('⚽🎯 Двойная угроза');
  }
  if (saves >= 2 && goals >= 2) {
    achievements.push('🧤⚽ Вратарь-бомбардир');
  }

  // Базовые достижения
  if (goals > 2) {
    achievements.push(`⚽️ Бомбардир (${goals} голов)`);
  }
  if (assists > 2) {
    achievements.push(`🎯 Ассистент (${assists} передач)`);
  }
  if (saves > 2) {
    achievements.push(`🧤 Вратарь (${saves} сейвов)`);
  }
  if (wins === gamesPlayed && gamesPlayed > 0) {
    achievements.push('🥇 Все матчи выиграны');
  }

  if (achievements.length > 0) {
    message += '<b>Достижения:</b>\n';
    achievements.forEach(achievement => {
      message += `${achievement}\n`;
    });
  }

  return message;
};

module.exports = { generatePlayerStats };

