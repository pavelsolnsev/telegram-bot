const {
  checkAdminRights,
  checkMatchStarted,
  getMatchResult,
  updateTeamStats,
  updatePlayerStats,
} = require('../../utils/matchHelpers');
const { GlobalState } = require('../../store');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');

jest.mock('../../utils/telegramUtils');
jest.mock('../../utils/deleteMessageAfterDelay');

describe('matchHelpers', () => {
  let mockCtx;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCtx = {
      from: { id: 123 },
      chat: { id: 456 },
      deleteMessage: jest.fn().mockResolvedValue(true),
    };
  });

  describe('checkAdminRights', () => {
    test('должен вернуть true для администратора', async () => {
      GlobalState.getAdminId = jest.fn().mockReturnValue([123, 456]);
      safeTelegramCall.mockResolvedValue({ message_id: 1 });

      const result = await checkAdminRights(mockCtx, [123, 456]);

      expect(result).toBe(true);
      expect(mockCtx.deleteMessage).toHaveBeenCalled();
    });

    test('должен вернуть false для не-администратора', async () => {
      GlobalState.getAdminId = jest.fn().mockReturnValue([123, 456]);
      safeTelegramCall.mockResolvedValue({ message_id: 1 });

      const result = await checkAdminRights(mockCtx, [789]);

      expect(result).toBe(false);
      expect(safeTelegramCall).toHaveBeenCalledWith(mockCtx, 'sendMessage', [
        456,
        '⛔ У вас нет прав для этой команды.',
      ]);
      expect(deleteMessageAfterDelay).toHaveBeenCalled();
    });

    test('должен обработать ошибку при удалении сообщения', async () => {
      GlobalState.getAdminId = jest.fn().mockReturnValue([123]);
      mockCtx.deleteMessage.mockRejectedValue(new Error('Error'));
      safeTelegramCall.mockResolvedValue({ message_id: 1 });

      const result = await checkAdminRights(mockCtx, [123]);

      expect(result).toBe(true);
    });
  });

  describe('checkMatchStarted', () => {
    test('должен вернуть true если матч начат', async () => {
      safeTelegramCall.mockResolvedValue({ message_id: 1 });

      const result = await checkMatchStarted(mockCtx, true);

      expect(result).toBe(true);
      expect(safeTelegramCall).not.toHaveBeenCalled();
    });

    test('должен вернуть false если матч не начат', async () => {
      safeTelegramCall.mockResolvedValue({ message_id: 1 });

      const result = await checkMatchStarted(mockCtx, false);

      expect(result).toBe(false);
      expect(safeTelegramCall).toHaveBeenCalledWith(mockCtx, 'sendMessage', [
        456,
        '⚠️ Матч не начат!',
      ]);
      expect(deleteMessageAfterDelay).toHaveBeenCalled();
    });
  });

  describe('getMatchResult', () => {
    test("должен вернуть 'team1' если первая команда выиграла", () => {
      const team1 = [{ goals: 3 }, { goals: 1 }];
      const team2 = [{ goals: 1 }, { goals: 0 }];

      const result = getMatchResult(team1, team2);

      expect(result).toBe('team1');
    });

    test("должен вернуть 'team2' если вторая команда выиграла", () => {
      const team1 = [{ goals: 1 }, { goals: 0 }];
      const team2 = [{ goals: 3 }, { goals: 1 }];

      const result = getMatchResult(team1, team2);

      expect(result).toBe('team2');
    });

    test("должен вернуть 'draw' при ничьей", () => {
      const team1 = [{ goals: 2 }, { goals: 1 }];
      const team2 = [{ goals: 1 }, { goals: 2 }];

      const result = getMatchResult(team1, team2);

      expect(result).toBe('draw');
    });

    test('должен обработать игроков без голов', () => {
      const team1 = [{ goals: 1 }];
      const team2 = [{ goals: undefined }, { goals: null }];

      const result = getMatchResult(team1, team2);

      expect(result).toBe('team1');
    });
  });

  describe('updateTeamStats', () => {
    test('должен создать новую статистику для команды', () => {
      const teamStats = {};
      updateTeamStats(teamStats, 'team1', true, false, 3, 1);

      expect(teamStats.team1).toEqual({
        wins: 1,
        losses: 0,
        draws: 0,
        games: 1,
        consecutiveWins: 1,
        goalsScored: 3,
        goalsConceded: 1,
      });
    });

    test('должен обновить существующую статистику', () => {
      const teamStats = {
        team1: {
          wins: 2,
          losses: 1,
          draws: 0,
          games: 3,
          consecutiveWins: 1,
          goalsScored: 5,
          goalsConceded: 3,
        },
      };

      updateTeamStats(teamStats, 'team1', true, false, 2, 0);

      expect(teamStats.team1.wins).toBe(3);
      expect(teamStats.team1.games).toBe(4);
      expect(teamStats.team1.consecutiveWins).toBe(2);
      expect(teamStats.team1.goalsScored).toBe(7);
      expect(teamStats.team1.goalsConceded).toBe(3);
    });

    test('должен обработать ничью', () => {
      const teamStats = {};
      updateTeamStats(teamStats, 'team1', false, true, 2, 2);

      expect(teamStats.team1.draws).toBe(1);
      expect(teamStats.team1.wins).toBe(0);
      expect(teamStats.team1.losses).toBe(0);
      expect(teamStats.team1.consecutiveWins).toBe(0);
    });

    test('должен обработать поражение', () => {
      const teamStats = {
        team1: {
          wins: 2,
          losses: 0,
          draws: 0,
          games: 2,
          consecutiveWins: 2,
          goalsScored: 4,
          goalsConceded: 1,
        },
      };

      updateTeamStats(teamStats, 'team1', false, false, 1, 3);

      expect(teamStats.team1.losses).toBe(1);
      expect(teamStats.team1.consecutiveWins).toBe(0);
      expect(teamStats.team1.goalsScored).toBe(5);
      expect(teamStats.team1.goalsConceded).toBe(4);
    });
  });

  describe('updatePlayerStats', () => {
    test('должен обновить статистику игрока при победе', () => {
      const team = [
        { id: 1, name: 'Player1', goals: 2, assists: 1, saves: 1 },
        { id: 2, name: 'Player2', goals: 0, assists: 0, saves: 0 },
      ];
      const originalTeam = [
        { id: 1, rating: 100, gamesPlayed: 5, wins: 3, draws: 1, losses: 1, goals: 5, assists: 1, saves: 0 },
        { id: 2, rating: 80, gamesPlayed: 5, wins: 2, draws: 1, losses: 2, goals: 2, assists: 0, saves: 0 },
      ];
      const allTeamsBase = [
        [
          { id: 1, rating: 100 },
          { id: 2, rating: 80 },
        ],
      ];

      const result = updatePlayerStats(
        team,
        originalTeam,
        true,
        false,
        false,
        allTeamsBase,
        0,
        2,
        0,
      );

      expect(result[0].gamesPlayed).toBe(6);
      expect(result[0].wins).toBe(4);
      expect(result[0].goals).toBe(7);
      expect(result[0].assists).toBe(2);
      expect(result[0].saves).toBe(1);
      expect(result[0].rating).toBeGreaterThan(100);
      expect(result[1].gamesPlayed).toBe(6);
      expect(result[1].wins).toBe(3);
    });

    test('должен обновить статистику игрока при ничьей', () => {
      const team = [{ id: 1, name: 'Player1', goals: 1, assists: 0, saves: 2 }];
      const originalTeam = [{ id: 1, rating: 100, gamesPlayed: 5, wins: 3, draws: 1, losses: 1, goals: 5, assists: 0, saves: 0 }];
      const allTeamsBase = [[{ id: 1, rating: 100 }]];

      const result = updatePlayerStats(
        team,
        originalTeam,
        false,
        true,
        false,
        allTeamsBase,
        0,
        1,
        1,
      );

      expect(result[0].draws).toBe(2);
      expect(result[0].saves).toBe(2);
      expect(result[0].rating).toBeGreaterThan(100);
    });

    test('должен обновить статистику игрока при поражении', () => {
      const team = [{ id: 1, name: 'Player1', goals: 0 }];
      const originalTeam = [{ id: 1, rating: 100, gamesPlayed: 5, wins: 3, draws: 1, losses: 1, goals: 5 }];
      const allTeamsBase = [[{ id: 1, rating: 100 }]];

      const result = updatePlayerStats(
        team,
        originalTeam,
        false,
        false,
        true,
        allTeamsBase,
        0,
        0,
        3,
      );

      expect(result[0].losses).toBe(2);
      expect(result[0].rating).toBeLessThan(100);
    });

    test('должен обработать shutout win', () => {
      const team = [{ id: 1, name: 'Player1', goals: 1 }];
      const originalTeam = [{ id: 1, rating: 100, gamesPlayed: 5, wins: 3, draws: 1, losses: 1, goals: 5 }];
      const allTeamsBase = [[{ id: 1, rating: 100 }]];

      const result = updatePlayerStats(
        team,
        originalTeam,
        true,
        false,
        false,
        allTeamsBase,
        0,
        3,
        0,
      );

      // Shutout win дает больше рейтинга
      // baseRating=100, mod=0.5, goalDelta=1*0.3*0.5=0.15, winDelta=3*0.5=1.5
      // delta=1.65, newRating=round1(100+1.65)=101.7
      expect(result[0].rating).toBeGreaterThan(101);
      expect(result[0].rating).toBeLessThanOrEqual(102);
    });

    test('должен ограничить рейтинг максимумом 200', () => {
      const team = [{ id: 1, name: 'Player1', goals: 10 }];
      const originalTeam = [{ id: 1, rating: 199, gamesPlayed: 5, wins: 3, draws: 1, losses: 1, goals: 5 }];
      const allTeamsBase = [[{ id: 1, rating: 199 }]];

      const result = updatePlayerStats(
        team,
        originalTeam,
        true,
        false,
        false,
        allTeamsBase,
        0,
        10,
        0,
      );

      expect(result[0].rating).toBeLessThanOrEqual(200);
    });

    test('должен отслеживать серию побед', () => {
      const team = [{ id: 1, name: 'Player1', goals: 1 }];
      const originalTeam = [{
        id: 1,
        rating: 100,
        gamesPlayed: 2,
        wins: 2,
        draws: 0,
        losses: 0,
        goals: 2,
        consecutiveWins: 2,
        maxConsecutiveWins: 2,
      }];
      const allTeamsBase = [[{ id: 1, rating: 100 }]];

      const result = updatePlayerStats(
        team,
        originalTeam,
        true,
        false,
        false,
        allTeamsBase,
        0,
        2,
        0,
      );

      expect(result[0].consecutiveWins).toBe(3);
      expect(result[0].maxConsecutiveWins).toBe(3);
    });

    test('должен сбрасывать серию побед при поражении', () => {
      const team = [{ id: 1, name: 'Player1', goals: 0 }];
      const originalTeam = [{
        id: 1,
        rating: 100,
        gamesPlayed: 2,
        wins: 2,
        draws: 0,
        losses: 0,
        goals: 2,
        consecutiveWins: 2,
        maxConsecutiveWins: 2,
      }];
      const allTeamsBase = [[{ id: 1, rating: 100 }]];

      const result = updatePlayerStats(
        team,
        originalTeam,
        false,
        false,
        true,
        allTeamsBase,
        0,
        0,
        2,
      );

      expect(result[0].consecutiveWins).toBe(0);
      expect(result[0].maxConsecutiveWins).toBe(2); // Максимум сохраняется
    });

    test('должен отслеживать серию непобедимости (победы + ничьи)', () => {
      const team = [{ id: 1, name: 'Player1', goals: 1 }];
      const originalTeam = [{
        id: 1,
        rating: 100,
        gamesPlayed: 2,
        wins: 1,
        draws: 1,
        losses: 0,
        goals: 2,
        consecutiveUnbeaten: 2,
        maxConsecutiveUnbeaten: 2,
      }];
      const allTeamsBase = [[{ id: 1, rating: 100 }]];

      const result = updatePlayerStats(
        team,
        originalTeam,
        true,
        false,
        false,
        allTeamsBase,
        0,
        2,
        0,
      );

      expect(result[0].consecutiveUnbeaten).toBe(3);
      expect(result[0].maxConsecutiveUnbeaten).toBe(3);
    });

    test('должен продолжать серию непобедимости при ничьей', () => {
      const team = [{ id: 1, name: 'Player1', goals: 1 }];
      const originalTeam = [{
        id: 1,
        rating: 100,
        gamesPlayed: 2,
        wins: 2,
        draws: 0,
        losses: 0,
        goals: 2,
        consecutiveWins: 2,
        consecutiveUnbeaten: 2,
        maxConsecutiveUnbeaten: 2,
      }];
      const allTeamsBase = [[{ id: 1, rating: 100 }]];

      const result = updatePlayerStats(
        team,
        originalTeam,
        false,
        true,
        false,
        allTeamsBase,
        0,
        1,
        1,
      );

      expect(result[0].consecutiveWins).toBe(0); // Серия побед сброшена
      expect(result[0].consecutiveUnbeaten).toBe(3); // Серия непобедимости продолжается
      expect(result[0].maxConsecutiveUnbeaten).toBe(3);
    });
  });
});

