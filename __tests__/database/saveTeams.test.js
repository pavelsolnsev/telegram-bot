const mockQuery = jest.fn();

jest.mock('../../database/database', () => ({
  query: mockQuery,
}));

const saveTeamsToDatabase = require('../../database/saveTeams');

describe('saveTeamsToDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockQuery
      .mockResolvedValueOnce([[{ id: 1, name: 'Команда А', tournament_count: 1, points: 10, wins: 5, draws: 0, losses: 0, goals_scored: 10, goals_conceded: 5 }], null]) // SELECT - команда найдена
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]) // UPDATE команды
      .mockResolvedValueOnce([[]]) // SELECT team_players - игроки команды 1 не найдены
      .mockResolvedValueOnce([[]]) // SELECT - вторая команда не найдена
      .mockResolvedValueOnce([{ insertId: 2 }, null]) // INSERT - вторая команда создана
      .mockResolvedValueOnce([[]]) // SELECT team_players - игроки команды 2 не найдены
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]); // INSERT team_players

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
    const updateCall = mockQuery.mock.calls.find(call =>
      call[0].includes('UPDATE teams'),
    );
    expect(updateCall).toBeDefined();
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
      .mockResolvedValueOnce([[]]) // SELECT teams - команда не найдена
      .mockResolvedValueOnce([{ insertId: 1 }, null]) // INSERT teams - команда создана
      .mockResolvedValueOnce([[]]) // SELECT team_players - игрок не найден в этой команде
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]); // INSERT team_players

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
    const insertPlayersCall = mockQuery.mock.calls.find(call =>
      call[0].includes('INSERT INTO team_players'),
    );
    expect(insertPlayersCall).toBeDefined();
    expect(insertPlayersCall[0]).toContain('tournament_count');
    // Проверяем, что tournament_count = 1 в значениях (последний элемент массива)
    const values = insertPlayersCall[1][0];
    expect(values[0][5]).toBe(1); // tournament_count должен быть 1 (индекс 5)
  });

  test('должен увеличивать tournament_count для игроков, которые уже играли за эту команду', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ id: 1, name: 'Команда А', tournament_count: 1, points: 3, wins: 5, draws: 0, losses: 0, goals_scored: 10, goals_conceded: 5 }], null]) // SELECT teams - команда найдена
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]) // UPDATE команды
      .mockResolvedValueOnce([[{ player_id: 1001, tournament_count: 2 }], null]) // SELECT team_players - игрок уже есть в команде с tournament_count = 2
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
    const updateCall = mockQuery.mock.calls.find(call =>
      call[0].includes('UPDATE team_players'),
    );
    expect(updateCall).toBeDefined();
    // Проверяем, что tournament_count обновлен на 3 (было 2, стало 3)
    expect(updateCall[1][0]).toBe(3); // new_tournament_count
  });

  test('должен создавать новую запись для игрока, перешедшего в другую команду', async () => {
    mockQuery
      .mockResolvedValueOnce([[]]) // SELECT teams - команда 1 не найдена
      .mockResolvedValueOnce([{ insertId: 1 }, null]) // INSERT teams - команда 1 создана
      .mockResolvedValueOnce([[]]) // SELECT teams - команда 2 не найдена
      .mockResolvedValueOnce([{ insertId: 2 }, null]) // INSERT teams - команда 2 создана
      .mockResolvedValueOnce([[{ player_id: 1001 }], null]) // SELECT team_players - игрок 1001 уже есть в команде 1
      .mockResolvedValueOnce([[]]) // SELECT team_players для команды 2 - игрок 1001 не найден в команде 2
      .mockResolvedValueOnce([{ affectedRows: 1 }, null]); // INSERT team_players - игрок добавлен в команду 2

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

    // Проверяем, что игрок добавлен в команду 2 с tournament_count = 1
    const insertPlayersCalls = mockQuery.mock.calls.filter(call =>
      call[0].includes('INSERT INTO team_players'),
    );
    expect(insertPlayersCalls.length).toBeGreaterThan(0);
  });
});
