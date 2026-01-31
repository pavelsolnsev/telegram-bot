/**
 * Вес сейвов при подсчёте меток (чуть ниже гола и ассиста).
 * goals и assists считаются 1.0, saves — 0.85.
 */
const SAVES_WEIGHT = 0.75;

/**
 * Выбирает MVP (лучшего игрока) среди списка игроков.
 *
 * Логика определения MVP:
 * 1. Сравниваются «взвешенные» метки: goals + assists + saves×0.85
 * 2. При равенстве меток - приоритет отдаётся голам
 * 3. При равенстве голов - приоритет отдаётся ассистам
 * 4. При равенстве ассистов - приоритет отдаётся сейвам
 * 5. При равенстве - приоритет игроку, чья команда имеет больше очков (wins*3 + draws)
 * 6. При равенстве - приоритет команде с лучшей разницей мячей (goalsScored - goalsConceded)
 * 7. При равенстве - приоритет игроку с большим приростом рейтинга (ratingTournamentDelta)
 * 8. При равенстве - приоритет игроку с меньшим числом жёлтых карточек (дисциплина)
 * 9. При равенстве - приоритет игроку с большим числом личных побед (player.wins)
 * 10. При равенстве - приоритет игроку с более высоким рейтингом на старте турнира
 * 11. При полном равенстве - детерминированный выбор по id (меньший id выигрывает)
 *
 * @param {Array} players - массив игроков с полями goals, assists, saves, ratingTournamentDelta
 * @param {Object} [options] - опции: { allTeams, teamStats } для учёта очков и разницы мячей команды
 * @returns {Object|null} - игрок MVP или null если массив пуст
 */
const selectMvp = (players, options = {}) => {
  // Проверка на валидность players
  if (!Array.isArray(players)) {
    console.error('Ошибка: players не является массивом в selectMvp');
    return null;
  }

  if (players.length === 0) {
    return null;
  }

  const { allTeams = [], teamStats = {} } = options;

  const getTotalMarks = (player) => {
    if (!player || typeof player !== 'object') {
      return 0;
    }
    const goals = Number(player.goals) || 0;
    const assists = Number(player.assists) || 0;
    const saves = Number(player.saves) || 0;
    return goals + assists + saves * SAVES_WEIGHT;
  };

  const getTeamPointsForPlayer = (player) => {
    if (!allTeams.length || !player?.id) return 0;
    for (let i = 0; i < allTeams.length; i++) {
      if (allTeams[i]?.some((p) => p?.id === player.id)) {
        const stats = teamStats[String(i)] || { wins: 0, draws: 0 };
        return (Number(stats.wins) || 0) * 3 + (Number(stats.draws) || 0);
      }
    }
    return 0;
  };

  const getTeamGoalDiffForPlayer = (player) => {
    if (!allTeams.length || !player?.id) return 0;
    for (let i = 0; i < allTeams.length; i++) {
      if (allTeams[i]?.some((p) => p?.id === player.id)) {
        const stats = teamStats[String(i)] || { goalsScored: 0, goalsConceded: 0 };
        return (Number(stats.goalsScored) || 0) - (Number(stats.goalsConceded) || 0);
      }
    }
    return 0;
  };

  const getRatingDelta = (player) =>
    (typeof player?.ratingTournamentDelta === 'number' ? player.ratingTournamentDelta : 0);

  const getYellowCards = (player) => Number(player?.yellowCards) || 0;
  const getWins = (player) => Number(player?.wins) || 0;
  const getRatingAtStart = (player) =>
    (typeof player?.ratingAtTournamentStart === 'number' ? player.ratingAtTournamentStart : 0);

  const candidates = players.reduce((best, player) => {
    // Пропускаем некорректные объекты игроков
    if (!player || typeof player !== 'object') {
      return best;
    }
    if (!best.length) return [player];
    const topPlayer = best[0];

    const playerMarks = getTotalMarks(player);
    const topPlayerMarks = getTotalMarks(topPlayer);

    // 1. Общее количество меток
    if (playerMarks > topPlayerMarks) return [player];
    if (playerMarks < topPlayerMarks) return best;

    // При равенстве меток:

    // 2. Приоритет голам
    const playerGoals = player.goals || 0;
    const topPlayerGoals = topPlayer.goals || 0;
    if (playerGoals > topPlayerGoals) return [player];
    if (playerGoals < topPlayerGoals) return best;

    // 3. Приоритет ассистам
    const playerAssists = player.assists || 0;
    const topPlayerAssists = topPlayer.assists || 0;
    if (playerAssists > topPlayerAssists) return [player];
    if (playerAssists < topPlayerAssists) return best;

    // 4. Приоритет сейвам
    const playerSaves = player.saves || 0;
    const topPlayerSaves = topPlayer.saves || 0;
    if (playerSaves > topPlayerSaves) return [player];
    if (playerSaves < topPlayerSaves) return best;

    // 5. Приоритет очкам команды (wins*3 + draws)
    if (allTeams.length > 0 && Object.keys(teamStats).length > 0) {
      const playerTeamPoints = getTeamPointsForPlayer(player);
      const topTeamPoints = getTeamPointsForPlayer(topPlayer);
      if (playerTeamPoints > topTeamPoints) return [player];
      if (playerTeamPoints < topTeamPoints) return best;

      // 6. При равных очках - разница мячей команды (goalsScored - goalsConceded)
      const playerGoalDiff = getTeamGoalDiffForPlayer(player);
      const topGoalDiff = getTeamGoalDiffForPlayer(topPlayer);
      if (playerGoalDiff > topGoalDiff) return [player];
      if (playerGoalDiff < topGoalDiff) return best;
    }

    // 7. Приоритет приросту рейтинга (ratingTournamentDelta)
    const playerDelta = getRatingDelta(player);
    const topDelta = getRatingDelta(topPlayer);
    if (playerDelta > topDelta) return [player];
    if (playerDelta < topDelta) return best;

    // 8. Меньше жёлтых карточек - приоритет дисциплинированному
    const playerYC = getYellowCards(player);
    const topYC = getYellowCards(topPlayer);
    if (playerYC < topYC) return [player];
    if (playerYC > topYC) return best;

    // 9. Больше личных побед (player.wins)
    const playerWins = getWins(player);
    const topWins = getWins(topPlayer);
    if (playerWins > topWins) return [player];
    if (playerWins < topWins) return best;

    // 10. Выше рейтинг на старте турнира (более опытный игрок)
    const playerRatingStart = getRatingAtStart(player);
    const topRatingStart = getRatingAtStart(topPlayer);
    if (playerRatingStart > topRatingStart) return [player];
    if (playerRatingStart < topRatingStart) return best;

    // 11. Детерминированный выбор по id (меньший id выигрывает)
    if ((player.id ?? Infinity) < (topPlayer.id ?? Infinity)) return [player];
    if ((player.id ?? Infinity) > (topPlayer.id ?? Infinity)) return best;

    return [...best, player];
  }, []);

  // Все критерии равны - детерминированный выбор по наименьшему id
  return candidates.length === 1
    ? candidates[0]
    : candidates.reduce((a, b) => ((a?.id ?? Infinity) <= (b?.id ?? Infinity) ? a : b));
};

module.exports = { selectMvp };
