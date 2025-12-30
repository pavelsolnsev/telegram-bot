const db = require('./database');

/**
 * Обнуляет статистику всех игроков в таблице players.
 * Оставляет id, name, username без изменений.
 */
async function resetPlayersStats() {
  const query = `
    UPDATE players
    SET
      goals = 0,
      assists = 0,
      saves = 0,
      gamesPlayed = 0,
      wins = 0,
      draws = 0,
      losses = 0,
      rating = 0,
      mvp = 0
  `;

  try {
    await db.query(query);
    console.log('Статистика всех игроков успешно обнулена.');
  } catch (error) {
    console.error('Ошибка при обнулении статистики игроков:', error);
    throw error;
  }
}

module.exports = resetPlayersStats;


