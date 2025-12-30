const db = require('./database');

// Функция для удаления эмодзи из названия команды
const removeEmoji = (text) => {
  if (!text || typeof text !== 'string') return text;
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{FF00}-\u{FFEF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
  return text.replace(emojiRegex, '').trim();
};

// Определение мест команд в турнире
// Возвращает объект с индексами команд и их местами { 0: 1, 1: 2, 2: 3, ... }
const getTeamPlaces = (teamStats, teamsCount) => {
  if (!teamStats || teamsCount === 0) return {};

  // Создаем массив команд с их статистикой и индексом
  const teamsWithStats = [];
  for (let i = 0; i < teamsCount; i++) {
    const teamKey = `team${i + 1}`;
    const stats = teamStats[teamKey];
    if (!stats) continue;

    const wins = stats.wins || 0;
    const goalsScored = stats.goalsScored || 0;
    const goalsConceded = stats.goalsConceded || 0;
    const goalDiff = goalsScored - goalsConceded;

    teamsWithStats.push({
      index: i,
      wins,
      goalDiff,
      goalsScored,
    });
  }

  // Сортируем команды: сначала по победам, потом по разнице мячей, потом по забитым мячам
  teamsWithStats.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsScored - a.goalsScored;
  });

  // Создаем объект с местами
  const places = {};
  teamsWithStats.forEach((team, position) => {
    places[team.index] = position + 1; // position 0 = место 1, position 1 = место 2, и т.д.
  });

  return places;
};

// Сохранение команд в базу данных
async function saveTeamsToDatabase(teams, teamNames, teamStats, tournamentDate) {
  try {
    // Проверка на валидность входных данных
    if (!Array.isArray(teams) || teams.length === 0) {
      return;
    }

    if (!tournamentDate || !(tournamentDate instanceof Date)) {
      console.error('Ошибка: некорректная дата турнира');
      return;
    }

    // Определяем места команд в турнире
    const teamPlaces = getTeamPlaces(teamStats, teams.length);
    const POINTS_FOR_FIRST = 3; // Очки за 1 место
    const POINTS_FOR_SECOND = 2; // Очки за 2 место
    const POINTS_FOR_THIRD = 1; // Очки за 3 место

    // Обрабатываем каждую команду
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      if (!Array.isArray(team) || team.length === 0) {
        continue;
      }

      // Получаем название команды
      const teamName = teamNames[i]
        ? removeEmoji(teamNames[i]).trim()
        : `Команда ${i + 1}`;

      if (!teamName || teamName.length === 0) {
        continue;
      }

      // Пропускаем команды с дефолтными названиями (Команда 1, Команда 2, и т.д.)
      const defaultNamePattern = /^Команда \d+$/;
      if (defaultNamePattern.test(teamName)) {
        continue;
      }

      // Получаем статистику команды
      const teamKey = `team${i + 1}`;
      const stats = teamStats[teamKey] || {};
      const wins = stats.wins || 0;
      const draws = stats.draws || 0;
      const losses = stats.losses || 0;
      const goalsScored = stats.goalsScored || 0;
      const goalsConceded = stats.goalsConceded || 0;

      // Проверяем, существует ли команда в БД
      const existingTeamsResult = await db.query(
        'SELECT id, tournament_count, points, wins, draws, losses, goals_scored, goals_conceded, trophies FROM teams WHERE name = ?',
        [teamName],
      );

      // mysql2 возвращает [rows, fields], извлекаем rows
      const existingTeams = Array.isArray(existingTeamsResult) && existingTeamsResult.length > 0
        ? existingTeamsResult[0]
        : [];

      let teamId;
      let pointsToAdd = 0;

      // Определяем очки для этой команды в зависимости от места
      const place = teamPlaces[i];
      if (place === 1) {
        pointsToAdd = POINTS_FOR_FIRST;
      } else if (place === 2) {
        pointsToAdd = POINTS_FOR_SECOND;
      } else if (place === 3) {
        pointsToAdd = POINTS_FOR_THIRD;
      }

      if (existingTeams && existingTeams.length > 0) {
        // Команда существует - обновляем
        teamId = existingTeams[0].id;
        const currentTournamentCount = existingTeams[0].tournament_count || 0;
        const currentPoints = existingTeams[0].points || 0;
        const currentWins = existingTeams[0].wins || 0;
        const currentDraws = existingTeams[0].draws || 0;
        const currentLosses = existingTeams[0].losses || 0;
        const currentGoalsScored = existingTeams[0].goals_scored || 0;
        const currentGoalsConceded = existingTeams[0].goals_conceded || 0;
        const currentTrophies = existingTeams[0].trophies || 0;

        // Если команда заняла 1 место, увеличиваем количество трофеев
        const trophiesToAdd = place === 1 ? 1 : 0;

        await db.query(
          `UPDATE teams SET 
            tournament_count = ?, 
            points = ?, 
            wins = ?, 
            draws = ?, 
            losses = ?, 
            goals_scored = ?, 
            goals_conceded = ?,
            trophies = ?
          WHERE id = ?`,
          [
            currentTournamentCount + 1,
            currentPoints + pointsToAdd,
            currentWins + wins,
            currentDraws + draws,
            currentLosses + losses,
            currentGoalsScored + goalsScored,
            currentGoalsConceded + goalsConceded,
            currentTrophies + trophiesToAdd,
            teamId,
          ],
        );
      } else {
        // Команда не существует - создаем новую
        // Если команда заняла 1 место, устанавливаем trophies = 1, иначе 0
        const initialTrophies = place === 1 ? 1 : 0;
        const insertResult = await db.query(
          'INSERT INTO teams (name, tournament_count, points, wins, draws, losses, goals_scored, goals_conceded, trophies) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)',
          [teamName, pointsToAdd, wins, draws, losses, goalsScored, goalsConceded, initialTrophies],
        );

        // mysql2 возвращает [result, fields], извлекаем result
        const result = Array.isArray(insertResult) && insertResult.length > 0
          ? insertResult[0]
          : insertResult;

        teamId = result && result.insertId ? result.insertId : null;

        if (!teamId) {
          console.error(`Не удалось получить ID для команды "${teamName}"`);
          continue;
        }
      }

      // Сохраняем состав команды в team_players
      // Сначала получаем список игроков, которые уже есть в ЛЮБОЙ команде
      const playerIds = team
        .filter((player) => player && player.id)
        .map((player) => player.id);

      let existingPlayersInAnyTeam = [];
      if (playerIds.length > 0) {
        const existingPlayersResult = await db.query(
          'SELECT player_id, team_id, tournament_count FROM team_players WHERE player_id IN (?)',
          [playerIds],
        );
        existingPlayersInAnyTeam = Array.isArray(existingPlayersResult) && existingPlayersResult.length > 0
          ? existingPlayersResult[0].map((row) => ({
            player_id: row.player_id,
            team_id: row.team_id,
            tournament_count: row.tournament_count || 0,
          }))
          : [];
      }

      const playersToUpdate = [];
      const playersToInsert = [];

      team.forEach((player) => {
        if (!player || !player.id) return;

        const existingPlayer = existingPlayersInAnyTeam.find((ep) => ep.player_id === player.id);

        if (existingPlayer) {
          // Игрок уже есть в какой-то команде
          if (existingPlayer.team_id === teamId) {
            // Игрок уже в ЭТОЙ команде - обновляем tournament_count
            playersToUpdate.push({
              player_id: player.id,
              new_tournament_count: existingPlayer.tournament_count + 1,
            });
          }
          // Если игрок в ДРУГОЙ команде - пропускаем (не добавляем в новую команду)
          // Команду можно изменить только вручную в базе данных
        } else {
          // Игрок не играет ни за какую команду - добавляем в текущую команду
          const playerName = player.name ? removeEmoji(player.name).trim() || 'Unknown' : 'Unknown';
          const playerUsername = player.username ? removeEmoji(player.username).trim() || null : null;
          playersToInsert.push([teamId, player.id, teamName, playerName, playerUsername, 1]);
        }
      });

      // Обновляем существующих игроков
      for (const playerToUpdate of playersToUpdate) {
        await db.query(
          'UPDATE team_players SET tournament_count = ? WHERE team_id = ? AND player_id = ?',
          [playerToUpdate.new_tournament_count, teamId, playerToUpdate.player_id],
        );
      }

      // Добавляем новых игроков
      if (playersToInsert.length > 0) {
        await db.query(
          'INSERT INTO team_players (team_id, player_id, team_name, name, username, tournament_count) VALUES ?',
          [playersToInsert],
        );
      }
    }
  } catch (error) {
    console.error('Ошибка при сохранении команд в базу данных:', error);
    throw error;
  }
}

module.exports = saveTeamsToDatabase;
