const saveTeamsToDatabase = require('../../database/saveTeams');
const db = require('../../database/database');
const { GlobalState } = require('../../store');

jest.mock('../../database/database');
jest.mock('../../store', () => ({
  GlobalState: {
    getLocation: jest.fn(),
    getTournamentPoints: jest.fn(() => ({ 1: 3, 2: 2, 3: 1 })),
  },
}));

describe('saveTeamsToDatabase with tournament points', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTeams = [
    [{ id: 1, name: 'Player1' }],
    [{ id: 2, name: 'Player2' }],
  ];
  const mockTeamNames = { 0: 'Team A', 1: 'Team B' };
  const mockTeamStats = {
    team1: { wins: 1, draws: 0, losses: 0, goalsScored: 2, goalsConceded: 1 },
    team2: { wins: 0, draws: 0, losses: 1, goalsScored: 1, goalsConceded: 2 },
  };
  const mockTournamentDate = new Date();

  test('должен использовать очки, заработанные в турнире', async () => {
    GlobalState.getLocation.mockReturnValueOnce('kz'); // Не турнир
    // Mock для существующей команды (обновление) - команда имеет 5 очков
    db.query.mockResolvedValueOnce([[
      { id: 1, name: 'Team A', tournament_count: 0, points: 5, wins: 0, draws: 0, losses: 0, goals_scored: 0, goals_conceded: 0, trophies: 0 },
    ]]);
    // Mock для игроков Team A (пустой результат)
    db.query.mockResolvedValueOnce([[]]);
    // Mock для несуществующей команды (создание)
    db.query.mockResolvedValueOnce([[]]);
    // Mock для игроков Team B (пустой результат)
    db.query.mockResolvedValueOnce([[]]);
    db.query.mockResolvedValueOnce([{ insertId: 2 }]);

    await saveTeamsToDatabase(mockTeams, mockTeamNames, mockTeamStats, mockTournamentDate);

    // Проверяем, что очки были добавлены для победившей команды (Team A) - её текущие 5 + 3 очка за победу в турнире
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE teams SET'),
      expect.arrayContaining([
        1, // tournament_count
        8, // points (5 + 3 очка за победу в турнире)
        1, // wins
        0, // draws
        0, // losses
        2, // goals_scored
        1, // goals_conceded
        1, // trophies (1 место)
        1, // teamId
      ]),
    );

    // Проверяем, что для новой команды (Team B) добавлено 0 очков
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO teams'),
      expect.arrayContaining([
        'Team B', // teamName
        0, // points (0 для новой команды)
        0, // wins
        0, // draws
        1, // losses
        1, // goalsScored
        2, // goalsConceded
        0, // trophies (2 место)
      ]),
    );
  });

  test('должен использовать очки, заработанные в турнире, даже для турниров', async () => {
    const tournamentPoints = { 1: 10, 2: 5, 3: 2 }; // Этот параметр больше не используется
    GlobalState.getLocation.mockReturnValueOnce('tr'); // Турнир
    GlobalState.getTournamentPoints.mockReturnValueOnce(tournamentPoints);

    // Mock для существующей команды (обновление) - команда имеет 8 очков
    db.query.mockResolvedValueOnce([[
      { id: 1, name: 'Team A', tournament_count: 0, points: 8, wins: 0, draws: 0, losses: 0, goals_scored: 0, goals_conceded: 0, trophies: 0 },
    ]]);
    // Mock для игроков Team A (пустой результат)
    db.query.mockResolvedValueOnce([[]]);
    // Mock для несуществующей команды (создание)
    db.query.mockResolvedValueOnce([[]]);
    // Mock для игроков Team B (пустой результат)
    db.query.mockResolvedValueOnce([[]]);
    db.query.mockResolvedValueOnce([{ insertId: 2 }]);

    await saveTeamsToDatabase(mockTeams, mockTeamNames, mockTeamStats, mockTournamentDate, tournamentPoints);

    // Проверяем, что очки были добавлены для победившей команды (Team A) - её текущие 8 + 3 очка за победу в турнире
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE teams SET'),
      expect.arrayContaining([
        1, // tournament_count
        11, // points (8 + 3 очка за победу в турнире)
        1, // wins
        0, // draws
        0, // losses
        2, // goalsScored
        1, // goalsConceded
        1, // trophies (1 место)
        1, // teamId
      ]),
    );

    // Проверяем, что для новой команды (Team B) добавлено 0 очков
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO teams'),
      expect.arrayContaining([
        'Team B', // teamName
        0, // points (0 для новой команды)
        0, // wins
        0, // draws
        1, // losses
        1, // goalsScored
        2, // goalsConceded
        0, // trophies (2 место)
      ]),
    );
  });
});
