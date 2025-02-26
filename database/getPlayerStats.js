const db = require("../database/database");

async function getPlayerStats(players) {
  try {
    const connection = await db.getConnection();
    const playerIds = players.map((p) => p.id);
    const [rows] = await connection.query(
      "SELECT id, gamesPlayed, wins, draws, losses, rating FROM players WHERE id IN (?)",
      [playerIds]
    );
    connection.release();

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
      ])
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
    console.error("Ошибка при получении статистики игроков из базы:", error);
    return players; // Возвращаем исходный массив в случае ошибки
  }
}

module.exports = getPlayerStats;