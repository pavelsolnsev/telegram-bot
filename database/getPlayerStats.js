const db = require('../database/database');

async function getPlayerStats(players, retries = 3) {
  // Проверка на валидность входных данных
  if (!Array.isArray(players)) {
    console.error('Ошибка: players должен быть массивом:', typeof players);
    return [];
  }

  for (let i = 0; i < retries; i++) {
    try {
      // Безопасное извлечение ID игроков
      const playerIds = players
        .filter(p => p && typeof p === 'object' && p.id)
        .map((p) => p.id);

      if (playerIds.length === 0) {
        console.warn('Нет валидных ID игроков для запроса статистики');
        return players;
      }

      const [rows] = await db.query(
        'SELECT id, gamesPlayed, wins, draws, losses, rating FROM players WHERE id IN (?)',
        [playerIds],
      );

      // Проверка на валидность результата запроса
      const safeRows = Array.isArray(rows) ? rows : [];
      const statsMap = new Map(
        safeRows
          .filter(row => row && typeof row === 'object' && row.id)
          .map((row) => [
            row.id,
            {
              gamesPlayed: row.gamesPlayed || 0,
              wins: row.wins || 0,
              draws: row.draws || 0,
              losses: row.losses || 0,
              rating: row.rating || 0,
            },
          ]),
      );

      return players.map((player) => {
        if (!player || typeof player !== 'object') {
          return player; // Возвращаем как есть, если некорректный объект
        }
        return {
          ...player,
          gamesPlayed: statsMap.get(player.id)?.gamesPlayed || player.gamesPlayed || 0,
          wins: statsMap.get(player.id)?.wins || player.wins || 0,
          draws: statsMap.get(player.id)?.draws || player.draws || 0,
          losses: statsMap.get(player.id)?.losses || player.losses || 0,
          rating: statsMap.get(player.id)?.rating || player.rating || 0,
        };
      });
    } catch (error) {
      console.error(`Попытка ${i + 1} получения статистики игроков не удалась:`, error);
      if (error.code === 'ER_CON_COUNT_ERROR') {
        console.warn('Слишком много подключений, увеличиваем время ожидания...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Увеличиваем задержку для повторной попытки
      }
      if (i === retries - 1) {
        console.error('Все попытки исчерпаны, возвращаем исходных игроков.');
        return players;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

module.exports = getPlayerStats;
