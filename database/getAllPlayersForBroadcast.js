const db = require('./database');

/**
 * Все игроки из БД с реальными Telegram id (исключаем синтетические id 100000–199999).
 * @returns {Promise<Array<{ id: number, name: string, username: string | null }>>}
 */
async function getAllPlayersForBroadcast() {
  const [rows] = await db.query(
    'SELECT id, name, username FROM players WHERE id < 100000 OR id >= 200000 ORDER BY id',
  );
  return Array.isArray(rows) ? rows : [];
}

module.exports = getAllPlayersForBroadcast;
