const db = require('./database');

// Функция для удаления эмодзи и декоративных Unicode-символов из строки
const removeEmoji = (text) => {
  if (!text || typeof text !== 'string') return text;
  // Удаляем:
  // - Эмодзи (1F000-1FFFF, 2600-27BF, FE00-FEFF, 1F600-1F64F, 1F680-1F6FF, 1F900-1F9FF)
  // - Математические алфавитные символы (1D400-1D7FF) - декоративные буквы
  // - Полноширинные символы (FF00-FFEF)
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{FF00}-\u{FFEF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
  return text.replace(emojiRegex, '').trim();
};

async function savePlayersToDatabase(players) {
  try {
    // Проверка на валидность входных данных
    if (!Array.isArray(players)) {
      console.error('Ошибка: players должен быть массивом:', typeof players);
      return;
    }

    const values = players.map(player => {
      // Проверка на валидность объекта игрока
      if (!player || typeof player !== 'object') {
        console.error('Ошибка: некорректный объект игрока:', player);
        return null;
      }

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
        yellowCards: rawYellowCards,
      } = player;

      if (!rawId) {
        console.error(`Ошибка: Игрок без id: ${JSON.stringify(player)}`);
        return null;
      }

      const id = rawId;
      // Очищаем эмодзи из имени и username перед сохранением
      const name = rawName ? removeEmoji(rawName) || 'Unknown' : 'Unknown';
      const username = rawUsername ? removeEmoji(rawUsername) || '@unknown' : '@unknown';
      const goals = Number(rawGoals) || 0;
      const assists = Number(rawAssists) || 0;
      const saves = Number(rawSaves) || 0;
      const gamesPlayed = Number(rawGamesPlayed) || 0;
      const wins = Number(rawWins) || 0;
      const draws = Number(rawDraws) || 0;
      const losses = Number(rawLosses) || 0;
      const ratingChange = Number(rawRating) || 0;
      const mvp = Number(rawMvp) || 0;
      const yellowCards = Number(rawYellowCards) || 0;

      return [id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, ratingChange, mvp, yellowCards];
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
    // Проверка на валидность результата запроса
    const safeRatings = Array.isArray(currentRatings) ? currentRatings : [];
    const ratingMap = new Map(safeRatings.map(row => {
      if (!row || typeof row !== 'object') return null;
      return [row.id, Number(row.rating) || 0];
    }).filter(Boolean));

    // Подготавливаем данные для вставки с учетом текущего рейтинга
    const insertValues = values.map(([id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, ratingChange, mvp, yellowCards]) => {
      const currentRating = ratingMap.get(id) || 0;
      const newRating = Math.max(currentRating + ratingChange, 0);
      return [id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, newRating, mvp, yellowCards];
    });

    const query = `
      INSERT INTO players (id, name, username, goals, assists, saves, gamesPlayed, wins, draws, losses, rating, mvp, yellow_cards)
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
        mvp = mvp + VALUES(mvp),
        yellow_cards = yellow_cards + VALUES(yellow_cards);
    `;

    await db.query(query, [insertValues]);
    console.log('Данные игроков успешно сохранены в базу данных!');
  } catch (error) {
    console.error('Ошибка при сохранении данных в базу данных:', error);
    throw error;
  }
}

module.exports = savePlayersToDatabase;
