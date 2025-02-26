const db = require("./database");

async function savePlayersToDatabase(players) {
  try {
    const connection = await db.getConnection();
    
    for (const player of players) {
      const {
        id: rawId,
        name: rawName,
        username: rawUsername,
        goals: rawGoals,
        gamesPlayed: rawGamesPlayed,
        wins: rawWins,
        draws: rawDraws,
        losses: rawLosses,
        rating: rawRating
      } = player;

      if (!rawId) {
        console.error(`Ошибка: Игрок без id: ${JSON.stringify(player)}`);
        continue;
      }

      const id = rawId;
      const name = rawName ?? 'Unknown';
      const username = rawUsername ?? '@unknown';
      const goals = rawGoals ?? 0;
      const gamesPlayed = rawGamesPlayed ?? 0;
      const wins = rawWins ?? 0;
      const draws = rawDraws ?? 0;
      const losses = rawLosses ?? 0;
      const rating = rawRating ?? 0.00;

      const query = `
        INSERT INTO players (id, name, username, goals, gamesPlayed, wins, draws, losses, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          username = VALUES(username),
          goals = goals + VALUES(goals),
          gamesPlayed = gamesPlayed + VALUES(gamesPlayed),
          wins = wins + VALUES(wins),
          draws = draws + VALUES(draws),
          losses = losses + VALUES(losses),
          rating = GREATEST(rating + VALUES(rating), 0);
      `;
      
      await connection.query(query, [
        id, name, username, goals, gamesPlayed, wins, draws, losses, rating
      ]);
    }

    console.log("Данные игроков успешно сохранены в базу данных!");
    connection.release();
  } catch (error) {
    console.error("Ошибка при сохранении данных в базу данных:", error);
    throw error;
  }
}

module.exports = savePlayersToDatabase;