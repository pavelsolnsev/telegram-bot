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
  const matchResultsDelta = typeof player.ratingMatchResultsDelta === 'number' ? player.ratingMatchResultsDelta : 0;
  const penaltiesDelta = typeof player.ratingPenaltiesDelta === 'number' ? player.ratingPenaltiesDelta : 0;
  const totalRatingDelta = typeof player.ratingTournamentDelta === 'number'
    ? player.ratingTournamentDelta
    : goalsDelta
      + assistsDelta
      + savesDelta
      + cleanSheetsDelta
      + matchResultsDelta
      + penaltiesDelta;

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
  message += `⚽ Голы: ${formatDelta(goalsDelta)}\n`;
  message += `🎯 Ассисты: ${formatDelta(assistsDelta)}\n`;
  message += `🧤 Сейвы: ${formatDelta(savesDelta)}\n`;
  message += `🧱 "Сухие" матчи: ${formatDelta(cleanSheetsDelta)}\n`;
  message += `🏆 Результаты матчей: ${formatDelta(matchResultsDelta)}\n`;
  message += `📉 Штрафы за поражения: ${formatDelta(penaltiesDelta)}\n`;
  message += `Итого изменение рейтинга по турниру: ${formatDelta(totalRatingDelta)}\n\n`;

  // Достижения
  const achievements = [];
  if (isTournamentMvp) {
    achievements.push('🏆 MVP турнира');
  }
  if (isTeamMvp) {
    const teamName = getTeamName(teamIndex);
    achievements.push(`⭐ MVP команды ${color} ${teamName}`);
  }
  if (goals > 0) {
    achievements.push(`⚽️ Бомбардир (${goals} голов)`);
  }
  if (assists > 0) {
    achievements.push(`🎯 Ассистент (${assists} передач)`);
  }
  if (saves > 0) {
    achievements.push(`🧤 Вратарь (${saves} сейвов)`);
  }
  if (wins === gamesPlayed && gamesPlayed > 0) {
    achievements.push('🥇 Все матчи выиграны');
  }
  if (rating >= 100) {
    achievements.push('💎 Высокий рейтинг');
  } else if (rating >= 50) {
    achievements.push('✨ Хороший рейтинг');
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

