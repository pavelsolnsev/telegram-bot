const db = require('../database/database');

async function getPlayerStats(players, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const playerIds = players.map((p) => p.id);
      const [rows] = await db.query(
        'SELECT id, gamesPlayed, wins, draws, losses, rating FROM players WHERE id IN (?)',
        [playerIds],
      );

      const statsMap = new Map(
        rows.map((row) => [
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

      return players.map((player) => ({
        ...player,
        gamesPlayed: statsMap.get(player.id)?.gamesPlayed || player.gamesPlayed || 0,
        wins: statsMap.get(player.id)?.wins || player.wins || 0,
        draws: statsMap.get(player.id)?.draws || player.draws || 0,
        losses: statsMap.get(player.id)?.losses || player.losses || 0,
        rating: statsMap.get(player.id)?.rating || player.rating || 0,
      }));
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
