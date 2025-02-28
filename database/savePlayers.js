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
      const goals = Number(rawGoals) || 0;
      const gamesPlayed = Number(rawGamesPlayed) || 0;
      const wins = Number(rawWins) || 0;
      const draws = Number(rawDraws) || 0;
      const losses = Number(rawLosses) || 0;
      let ratingChange = Number(rawRating) || 0; // Проверяем, что ratingChange — число

      // Получаем текущий рейтинг из БД
      const [current] = await connection.query(
        "SELECT rating FROM players WHERE id = ?",
        [id]
      );
      const currentRating = current.length ? Number(current[0].rating) || 0 : 0;

      // Проверяем, чтобы новый рейтинг был неотрицательным
      const newRating = Math.max(currentRating + ratingChange, 0);

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
          rating = ?;
      `;
      
      await connection.query(query, [
        id, name, username, goals, gamesPlayed, wins, draws, losses, newRating, newRating
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
