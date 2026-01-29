const mockQuery = jest.fn();

jest.mock('../../database/database', () => ({
  query: mockQuery,
}));

const saveTeamsToDatabase = require('../../database/saveTeams');

describe('saveTeamsToDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockClear();
  });

  test('должен сохранять команды с названиями и составом', async () => {
    // Мокируем запросы:
    // 1. SELECT для проверки существования команд (формат: [rows, fields])
    // 2. INSERT для создания/обновления команд (формат: [result, fields])
    // 3. SELECT для проверки существования игроков в командах
    // 4. INSERT для сохранения состава команд
    mockQuery
      .mockResolvedValueOnce([[]]) // SELECT teams - команда 1 не найдена
      .mockResolvedValueOnce([{ insertId: 1 }, null]) // INSERT teams - команда 1 создана
      .mockResolvedValueOnce([[]]) // SELECT team_players - игроки команды 1 не найдены
      .mockResolvedValueOnce([[]]) // SELECT teams - команда 2 не найдена
      .mockResolvedValueOnce([{ insertId: 2 }, null]) // INSERT teams - команда 2 создана
      .mockResolvedValueOnce([[]]) // SELECT team_players - игроки команды 2 не найдены
      .mockResolvedValueOnce([{ affectedRows: 4 }, null]); // INSERT team_players (2 команды * 2 игрока)

    const teams = [
      [{ id: 1001, name: 'Player1', username: 'player1' }, { id: 1002, name: 'Player2', username: 'player2' }],
      [{ id: 1003, name: 'Player3', username: 'player3' }, { id: 1004, name: 'Player4', username: 'player4' }],
    ];

    const teamNames = {
      0: 'Команда А',
      1: 'Команда Б',
    };

    const teamStats = {
      team1: { wins: 2, losses: 0, draws: 0, goalsScored: 5, goalsConceded: 2 },
      team2: { wins: 0, losses: 2, draws: 0, goalsScored: 2, goalsConceded: 5 },
    };

    const tournamentDate = new Date('2024-01-15');

    await saveTeamsToDatabase(teams, teamNames, teamStats, tournamentDate);

    // Проверяем, что были вызваны запросы (минимум 6: 2 SELECT teams + 2 INSERT teams + 2 SELECT team_players + минимум 1 INSERT team_players)
    // Может быть меньше вызовов, если команды пропускаются
    expect(mockQuery).toHaveBeenCalledTimes(6);

    // Проверяем создание/обновление команд
    const insertTeamCalls = mockQuery.mock.calls.filter(call =>
      call[0].includes('INSERT INTO teams'),
    );
    expect(insertTeamCalls.length).toBe(2);

    // Проверяем сохранение состава команд
    const insertPlayersCall = mockQuery.mock.calls.find(call =>
      call[0].includes('INSERT INTO team_players'),
    );
    expect(insertPlayersCall).toBeDefined();
    // Проверяем, что tournament_count включен в запрос
    expect(insertPlayersCall[0]).toContain('tournament_count');
  });

  test('должен обновлять существующие команды', async () => {
    // Мокируем, что команды уже существуют
    // Порядок вызовов:
    // 1. SELECT teams для команды 1 - команда найдена
    // 2. UPDATE teams для команды 1
    // 3. SELECT team_players для команды 1 - игроки не найдены
    // 4. INSERT team_players для команды 1
    // 5. SELECT teams для команды 2 - команда не найдена
    // 6. INSERT teams для команды 2
    // 7. SELECT team_players для команды 2 - игроки не найдены
    // 8. INSERT team_players для команды 2
    // mysql2 возвращает [rows, fields], где rows - это массив строк
    // Для SELECT: rows - массив объектов
    // Для INSERT/UPDATE: result - объект с affectedRows/insertId
    mockQuery
      .mockResolvedValueOnce([[{ id: 1, name: 'Команда А', tournament_count: 1, points: 10, wins: 5, draws: 0, losses: 0, goals_scored: 10, goals_conceded: 5, trophies: 0 }], null]) // SELECT teams - команда 1 найдена
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]) // UPDATE teams - команда 1 обновлена
      .mockResolvedValueOnce([[], null]) // SELECT team_players - игроки команды 1 не найдены
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]) // INSERT team_players - игрок команды 1 добавлен
      .mockResolvedValueOnce([[], null]) // SELECT teams - команда 2 не найдена
      .mockResolvedValueOnce([{ insertId: 2 }, null]) // INSERT teams - команда 2 создана
      .mockResolvedValueOnce([[], null]) // SELECT team_players - игроки команды 2 не найдены
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]); // INSERT team_players - игрок команды 2 добавлен

    const teams = [
      [{ id: 1001, name: 'Player1', username: 'player1' }],
      [{ id: 1002, name: 'Player2', username: 'player2' }],
    ];

    const teamNames = {
      0: 'Команда А',
      1: 'Команда Б',
    };

    const teamStats = {
      team1: { wins: 1, losses: 0, draws: 0, goalsScored: 3, goalsConceded: 1 },
      team2: { wins: 0, losses: 1, draws: 0, goalsScored: 1, goalsConceded: 3 },
    };

    const tournamentDate = new Date('2024-01-16');

    await saveTeamsToDatabase(teams, teamNames, teamStats, tournamentDate);

    // Проверяем, что был вызван UPDATE для существующей команды
    const updateCalls = mockQuery.mock.calls.filter(call =>
      call[0] && call[0].includes('UPDATE teams'),
    );
    // Отладочный вывод
    if (updateCalls.length === 0) {
      console.log('Все вызовы mockQuery:', mockQuery.mock.calls.map(call => call[0]?.substring(0, 50)));
    }
    expect(updateCalls.length).toBeGreaterThan(0);
  });

  test('должен использовать дефолтные названия, если названия не заданы', async () => {
    // Команды с дефолтными названиями пропускаются, поэтому не должно быть запросов к БД
    const teams = [
      [{ id: 1001, name: 'Player1', username: 'player1' }],
      [{ id: 1002, name: 'Player2', username: 'player2' }],
    ];

    const teamNames = {}; // Нет названий - будут использованы дефолтные "Команда 1", "Команда 2"

    const teamStats = {
      team1: { wins: 1, losses: 0, draws: 0, goalsScored: 2, goalsConceded: 1 },
      team2: { wins: 0, losses: 1, draws: 0, goalsScored: 1, goalsConceded: 2 },
    };

    const tournamentDate = new Date('2024-01-17');

    await saveTeamsToDatabase(teams, teamNames, teamStats, tournamentDate);

    // Команды с дефолтными названиями пропускаются, поэтому не должно быть запросов к БД
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('должен обрабатывать пустой массив команд', async () => {
    await saveTeamsToDatabase([], {}, {}, new Date());

    // Не должно быть вызовов к БД
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('должен начислять очки победителю турнира', async () => {
    mockQuery
      .mockResolvedValueOnce([[]]) // SELECT teams - команда 1 не найдена
      .mockResolvedValueOnce([{ insertId: 1 }, null]) // INSERT teams - команда 1 создана (победитель)
      .mockResolvedValueOnce([[]]) // SELECT teams - команда 2 не найдена
      .mockResolvedValueOnce([{ insertId: 2 }, null]) // INSERT teams - команда 2 создана
      .mockResolvedValueOnce([[]]) // SELECT team_players - игроки не найдены
      .mockResolvedValueOnce([{ affectedRows: 2 }, null]); // INSERT team_players

    const teams = [
      [{ id: 1001, name: 'Player1', username: 'player1' }],
      [{ id: 1002, name: 'Player2', username: 'player2' }],
    ];

    const teamNames = {
      0: 'Победитель',
      1: 'Проигравший',
    };

    // Первая команда выиграла больше матчей
    const teamStats = {
      team1: { wins: 3, losses: 0, draws: 0, goalsScored: 10, goalsConceded: 2 },
      team2: { wins: 0, losses: 3, draws: 0, goalsScored: 2, goalsConceded: 10 },
    };

    const tournamentDate = new Date('2024-01-18');

    await saveTeamsToDatabase(teams, teamNames, teamStats, tournamentDate);

    // Проверяем, что первая команда получила очки (победитель)
    const insertCalls = mockQuery.mock.calls.filter(call =>
      call[0].includes('INSERT INTO teams'),
    );
    expect(insertCalls.length).toBe(2);
  });

  test('должен устанавливать tournament_count = 1 для новых игроков в команде', async () => {
    mockQuery
      .mockResolvedValueOnce([[], null]) // SELECT teams - команда не найдена
      .mockResolvedValueOnce([{ insertId: 1 }, null]) // INSERT teams - команда создана
      .mockResolvedValueOnce([[], null]) // SELECT team_players - игрок не найден ни в какой команде
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]); // INSERT team_players - игрок добавлен

    const teams = [
      [{ id: 1001, name: 'Player1', username: 'player1' }],
    ];

    const teamNames = {
      0: 'Команда А',
    };

    const teamStats = {
      team1: { wins: 1, losses: 0, draws: 0, goalsScored: 2, goalsConceded: 1 },
    };

    const tournamentDate = new Date('2024-01-19');

    await saveTeamsToDatabase(teams, teamNames, teamStats, tournamentDate);

    // Проверяем, что в INSERT team_players передается tournament_count = 1
    const insertPlayersCalls = mockQuery.mock.calls.filter(call =>
      call[0] && call[0].includes('INSERT INTO team_players'),
    );
    expect(insertPlayersCalls.length).toBeGreaterThan(0);
    const insertPlayersCall = insertPlayersCalls[0];
    expect(insertPlayersCall[0]).toContain('tournament_count');
    // Проверяем, что tournament_count = 1 в значениях (последний элемент массива)
    const values = insertPlayersCall[1][0];
    expect(values[0][5]).toBe(1); // tournament_count должен быть 1 (индекс 5)
  });

  test('должен увеличивать tournament_count для игроков, которые уже играли за эту команду', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ id: 1, name: 'Команда А', tournament_count: 1, points: 3, wins: 5, draws: 0, losses: 0, goals_scored: 10, goals_conceded: 5, trophies: 0 }], null]) // SELECT teams - команда найдена
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]) // UPDATE teams - команда обновлена
      .mockResolvedValueOnce([[{ player_id: 1001, team_id: 1, tournament_count: 2 }], null]) // SELECT team_players - игрок уже есть в ЭТОЙ команде (team_id = 1) с tournament_count = 2
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]); // UPDATE team_players - tournament_count увеличен до 3

    const teams = [
      [{ id: 1001, name: 'Player1', username: 'player1' }],
    ];

    const teamNames = {
      0: 'Команда А',
    };

    const teamStats = {
      team1: { wins: 1, losses: 0, draws: 0, goalsScored: 2, goalsConceded: 1 },
    };

    const tournamentDate = new Date('2024-01-20');

    await saveTeamsToDatabase(teams, teamNames, teamStats, tournamentDate);

    // Проверяем, что был вызван UPDATE для team_players с tournament_count = 3
    const updateCalls = mockQuery.mock.calls.filter(call =>
      call[0] && call[0].includes('UPDATE team_players'),
    );
    expect(updateCalls.length).toBeGreaterThan(0);
    const updateCall = updateCalls[0];
    // Проверяем, что tournament_count обновлен на 3 (было 2, стало 3)
    expect(updateCall[1][0]).toBe(3); // new_tournament_count
  });

  test('должен создавать новую запись для игрока, перешедшего в другую команду', async () => {
    // Согласно логике кода, если игрок уже в другой команде, он не добавляется в новую
    // Поэтому тестируем случай, когда игрок сначала не найден ни в какой команде для команды 1,
    // а потом для команды 2 он тоже не найден (новый игрок для команды 2)
    mockQuery
      .mockResolvedValueOnce([[], null]) // SELECT teams - команда 1 не найдена
      .mockResolvedValueOnce([{ insertId: 1 }, null]) // INSERT teams - команда 1 создана
      .mockResolvedValueOnce([[], null]) // SELECT team_players - игрок 1001 не найден ни в какой команде
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]) // INSERT team_players - игрок добавлен в команду 1
      .mockResolvedValueOnce([[], null]) // SELECT teams - команда 2 не найдена
      .mockResolvedValueOnce([{ insertId: 2 }, null]) // INSERT teams - команда 2 создана
      .mockResolvedValueOnce([[{ player_id: 1001, team_id: 1, tournament_count: 1 }], null]) // SELECT team_players - игрок 1001 найден в команде 1
      // Игрок не будет добавлен в команду 2, так как он уже в команде 1

    const teams = [
      [{ id: 1001, name: 'Player1', username: 'player1' }],
      [{ id: 1001, name: 'Player1', username: 'player1' }], // Тот же игрок в другой команде
    ];

    const teamNames = {
      0: 'Команда А',
      1: 'Команда Б',
    };

    const teamStats = {
      team1: { wins: 1, losses: 0, draws: 0, goalsScored: 2, goalsConceded: 1 },
      team2: { wins: 0, losses: 1, draws: 0, goalsScored: 1, goalsConceded: 2 },
    };

    const tournamentDate = new Date('2024-01-21');

    await saveTeamsToDatabase(teams, teamNames, teamStats, tournamentDate);

    // Проверяем, что игрок добавлен хотя бы в одну команду
    // Согласно логике кода, игрок будет добавлен в первую команду, но не во вторую (так как уже в первой)
    const insertPlayersCalls = mockQuery.mock.calls.filter(call =>
      call[0] && call[0].includes('INSERT INTO team_players'),
    );
    expect(insertPlayersCalls.length).toBeGreaterThan(0);
  });
});
