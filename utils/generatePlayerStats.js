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
  const shutoutWinDelta = typeof player.ratingShutoutWinDelta === 'number' ? player.ratingShutoutWinDelta : 0;
  const yellowCardsDelta = typeof player.ratingYellowCardsDelta === 'number' ? player.ratingYellowCardsDelta : 0;
  const totalRatingDelta = typeof player.ratingTournamentDelta === 'number'
    ? player.ratingTournamentDelta
    : goalsDelta
      + assistsDelta
      + savesDelta
      + cleanSheetsDelta
      + winsDelta
      + drawsDelta
      + lossesDelta
      + shutoutWinDelta
      + yellowCardsDelta;

  const formatDelta = (value) => {
    const num = Number(value) || 0;
    const rounded = Math.round(num * 10) / 10;
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}`;
  };

  let message = '<b>📊 Ваша статистика турнира</b>\n\n';

  // Команда и позиция
  const teamName = getTeamName(teamIndex);
  const positionEmoji = teamPosition === 1 ? '🥇' : teamPosition === 2 ? '🥈' : teamPosition === 3 ? '🥉' : '📍';
  message += `${color} <b>${teamName}</b> ${positionEmoji} <b>${teamPosition} место</b>\n`;
  message += `Очки команды: <b>${points}</b>\n\n`;

  // Статистика игрока
  message += '<b>Ваши показатели:</b>\n';
  if (goals > 0) {
    message += `⚽️ Голы: ${goals}\n`;
  }
  if (assists > 0) {
    message += `🎯 Ассисты: ${assists}\n`;
  }
  if (saves > 0) {
    message += `🧤 Сейвы: ${saves}\n`;
  }
  if ((player.yellowCards || 0) > 0) {
    message += `🟨 Жёлтые карточки: ${player.yellowCards || 0}\n`;
  }
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
  if (winsDelta !== 0) {
    message += `🏆 Победы: ${formatDelta(winsDelta)}\n`;
  }
  if (drawsDelta !== 0) {
    message += `🤝 Ничьи: ${formatDelta(drawsDelta)}\n`;
  }
  if (lossesDelta !== 0) {
    message += `📉 Штрафы за поражения: ${formatDelta(lossesDelta)}\n`;
  }
  if (shutoutWinDelta !== 0) {
    message += `🧹 Сухие победы (3+ гола): ${formatDelta(shutoutWinDelta)}\n`;
  }
  if (cleanSheetsDelta !== 0) {
    message += `🧱 "Сухие" матчи (сейвы + команда не пропустила): ${formatDelta(cleanSheetsDelta)}\n`;
  }
  if (yellowCardsDelta !== 0) {
    message += `🟨 Штраф за желтые карточки: ${formatDelta(yellowCardsDelta)}\n`;
  }
  // Бонусы за MVP
  if (isTournamentMvp) {
    message += `🏆 Бонус за MVP турнира: ${formatDelta(1.0)}\n`;
  } else if (isTeamMvp) {
    message += `⭐ Бонус за MVP команды: ${formatDelta(0.5)}\n`;
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

  // Находим команду с наибольшим количеством забитых голов
  const allTeamGoalsScored = Object.values(teamStats).map(teamStat => teamStat.goalsScored || 0);
  const maxGoalsScored = Math.max(...allTeamGoalsScored, 0);
  const isBestAttack = stats.goalsScored === maxGoalsScored && maxGoalsScored > 0;

  // Серии побед и непобедимости
  const maxConsecutiveWins = player.maxConsecutiveWins || 0;
  const maxConsecutiveUnbeaten = player.maxConsecutiveUnbeaten || 0;

  // Достижения команды
  const teamAchievements = [];
  // Позиция команды
  if (teamPosition === 1) {
    teamAchievements.push('🏅 Золото');
  } else if (teamPosition === 2) {
    teamAchievements.push('🥈 Серебро');
  } else if (teamPosition === 3) {
    teamAchievements.push('🎖️ Бронза');
  }
  // Надежная защита
  if (isBestDefense) {
    teamAchievements.push('🛡️ Команда пропустила меньше всего голов');
  }
  // Лучшая атака
  if (isBestAttack) {
    teamAchievements.push('⚽ Команда забила больше всех голов');
  }
  // Серии побед
  if (maxConsecutiveWins >= 3) {
    teamAchievements.push(`🔥 Серия побед (${maxConsecutiveWins} подряд)`);
  }
  // Непобедимость
  if (maxConsecutiveUnbeaten >= 3) {
    teamAchievements.push(`💪 Непобедимые (${maxConsecutiveUnbeaten} матчей без поражений)`);
  }
  // Все матчи выиграны
  if (wins === gamesPlayed && gamesPlayed > 0) {
    teamAchievements.push('🥇 Все матчи выиграны');
  }

  // Личные достижения
  const personalAchievements = [];
  if (isTournamentMvp) {
    personalAchievements.push('🏆 MVP турнира');
  }
  if (isTeamMvp) {
    personalAchievements.push(`⭐ MVP команды ${color}`);
  }

  // Восходящая звезда (прирост рейтинга)
  if (totalRatingDelta >= 10) {
    const formattedDelta = formatDelta(totalRatingDelta);
    personalAchievements.push(`📈 Восходящая звезда прироста рейтинга (${formattedDelta})`);
  }

  // Лучшие игроки турнира
  if (isTopScorer) {
    personalAchievements.push(`👑 Лучший бомбардир турнира (${goals} голов)`);
  }
  if (isTopAssister) {
    personalAchievements.push(`🎯 Лучший ассистент турнира (${assists} передач)`);
  }
  if (isTopGoalkeeper) {
    personalAchievements.push(`🧤 Лучший вратарь турнира (${saves} сейвов)`);
  }

  // Комбинации
  const isUniversal = goals > 0 && assists > 0 && saves > 0;
  if (isUniversal) {
    personalAchievements.push('⚽️🎯🧤 Универсал - все показатели выше 0');
  }
  if (goals >= 2 && assists >= 2) {
    personalAchievements.push('⚽🎯 Двойная угроза - 2+ гола и 2+ передач');
  }
  if (saves >= 2 && goals >= 2) {
    personalAchievements.push('🧤⚽ Вратарь-бомбардир - 2+ сейва и 2+ гола');
  }

  // Базовые достижения (не показываем, если есть соответствующие "Лучший ... турнира")
  if (goals > 2 && !isTopScorer) {
    personalAchievements.push(`⚽️ Бомбардир - более 2 голов (${goals} голов)`);
  }
  if (assists > 2 && !isTopAssister) {
    personalAchievements.push(`🎯 Ассистент - более 2 передач (${assists} передач)`);
  }
  if (saves > 2 && !isTopGoalkeeper) {
    personalAchievements.push(`🧤 Вратарь - более 2 сейвов (${saves} сейвов)`);
  }

  // Выводим достижения команды
  if (teamAchievements.length > 0) {
    message += '<b>Достижения команды:</b>\n';
    teamAchievements.forEach(achievement => {
      message += `${achievement}\n`;
    });
    message += '\n';
  }

  // Выводим личные достижения
  if (personalAchievements.length > 0) {
    message += '<b>Личные достижения:</b>\n';
    personalAchievements.forEach(achievement => {
      message += `${achievement}\n`;
    });
  }

  return message;
};

module.exports = { generatePlayerStats };

