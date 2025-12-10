/**
 * Выбирает MVP (лучшего игрока) среди списка игроков.
 *
 * Логика определения MVP:
 * 1. Сначала сравнивается общее количество меток (goals + assists + saves)
 * 2. При равенстве меток - приоритет отдаётся голам
 * 3. При равенстве голов - приоритет отдаётся ассистам
 * 4. При равенстве ассистов - приоритет отдаётся сейвам
 * 5. При полном равенстве - случайный выбор
 *
 * @param {Array} players - массив игроков с полями goals, assists, saves
 * @returns {Object|null} - игрок MVP или null если массив пуст
 */
const selectMvp = (players) => {
  if (!players || players.length === 0) {
    return null;
  }

  const getTotalMarks = (player) => {
    return (player.goals || 0) + (player.assists || 0) + (player.saves || 0);
  };

  const candidates = players.reduce((best, player) => {
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

    // 5. Полное равенство - добавляем в кандидаты
    return [...best, player];
  }, []);

  // Случайный выбор среди равных кандидатов
  return candidates[Math.floor(Math.random() * candidates.length)];
};

module.exports = { selectMvp };
