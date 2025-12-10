const db = require('./database');

async function savePlayersToDatabase(players) {
  try {
    const values = players.map(player => {
      const {
        id: rawId,
        name: rawName,
        username: rawUsername,
        goals: rawGoals,
        assists: rawAssists,
        saves: rawSaves,
        gamesPlayed: rawGamesPlayed,
        wins: rawWins,
        draws: rawDraws,
        losses: rawLosses,
        rating: rawRating,
        mvp: rawMvp,
      } = player;

      if (!rawId) {
        console.error(`Ошибка: Игрок без id: ${JSON.stringify(player)}`);
        return null;
      }

      const id = rawId;
      const name = rawName ?? 'Unknown';
      const username = rawUsername ?? '@unknown';
      const goals = Number(rawGoals) || 0;
      const assists = Number(rawAssists) || 0;
      const saves = Number(rawSaves) || 0;
      const gamesPlayed = Number(rawGamesPlayed) || 0;
      const wins = Number(rawWins) || 0;
      const draws = Number(rawDraws) || 0;
      const losses = Number(rawLosses) || 0;
      const ratingChange = Number(rawRating) || 0;
      const mvp = Number(rawMvp) || 0;

      return [id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, ratingChange, mvp];
    }).filter(Boolean); // Убираем null значения

    if (values.length === 0) {
      console.log('Нет валидных игроков для сохранения.');
      return;
    }

    // Получаем текущие рейтинги для всех игроков одним запросом
    const playerIds = values.map(v => v[0]);
    const [currentRatings] = await db.query(
      'SELECT id, rating FROM players WHERE id IN (?)',
      [playerIds],
    );
    const ratingMap = new Map(currentRatings.map(row => [row.id, Number(row.rating) || 0]));

    // Подготавливаем данные для вставки с учетом текущего рейтинга
    const insertValues = values.map(([id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, ratingChange, mvp]) => {
      const currentRating = ratingMap.get(id) || 0;
      const newRating = Math.max(currentRating + ratingChange, 0);
      return [id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, newRating, mvp];
    });

    const query = `
      INSERT INTO players (id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, rating, mvp)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        username = VALUES(username),
        goals = goals + VALUES(goals),
        assists = assists + VALUES(assists),
        saves = saves + VALUES(saves),
        gamesPlayed = gamesPlayed + VALUES(gamesPlayed),
        wins = wins + VALUES(wins),
        draws = draws + VALUES(draws),
        losses = losses + VALUES(losses),
        rating = VALUES(rating),
        mvp = mvp + VALUES(mvp);
    `;

    await db.query(query, [insertValues]);
    console.log('Данные игроков успешно сохранены в базу данных!');
  } catch (error) {
    console.error('Ошибка при сохранении данных в базу данных:', error);
    throw error;
  }
}

module.exports = savePlayersToDatabase;
