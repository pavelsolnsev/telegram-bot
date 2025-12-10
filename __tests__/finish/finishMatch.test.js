jest.mock('../../utils/telegramUtils', () => ({
  safeTelegramCall: jest.fn(),
}));

jest.mock('../../utils/deleteMessageAfterDelay', () => ({
  deleteMessageAfterDelay: jest.fn(),
}));

jest.mock('../../message/buildPlayingTeamsMessage', () => ({
  buildPlayingTeamsMessage: jest.fn(() => 'message'),
}));

const { executeKskCommand } = require('../../commands/finish/finishMatch');
const { safeTelegramCall } = require('../../utils/telegramUtils');

const createGlobalState = () => {
  const state = {
    adminId: [123],
    start: true,
    playingTeams: {
      team1: [{ id: 1, name: 'A', goals: 1, assists: 2, saves: 3 }],
      team2: [{ id: 2, name: 'B', goals: 0, assists: 1, saves: 1 }],
      teamIndex1: 0,
      teamIndex2: 1,
    },
    teams: [
      [{ id: 1, name: 'A', goals: 0, assists: 5, saves: 4 }],
      [{ id: 2, name: 'B', goals: 0, assists: 1, saves: 1 }],
      [{ id: 3, name: 'C', goals: 0, assists: 2, saves: 2 }],
    ],
    teamsBase: [],
    teamStats: {},
    matchResults: [],
    matchHistory: {},
    lastMatchIndex: {},
    consecutiveGames: {},
    teamCount: 3,
    matchHistoryStack: [],
    playingTeamsMessage: null,
  };

  state.teamsBase = state.teams.map((team) => team.map((p) => ({ ...p })));

  return {
    getAdminId: () => state.adminId,
    getStart: () => state.start,
    getPlayingTeams: () => state.playingTeams,
    setPlayingTeams: (value) => { state.playingTeams = value; },
    pushMatchHistory: (value) => state.matchHistoryStack.push(value),
    getTeams: () => state.teams,
    setTeams: (value) => { state.teams = value; },
    getTeamStats: () => state.teamStats,
    setTeamStats: (value) => { state.teamStats = value; },
    getTeamsBase: () => state.teamsBase,
    getMatchResults: () => state.matchResults,
    addMatchResult: (result) => state.matchResults.push(result),
    getMatchHistoryStackLength: () => state.matchHistoryStack.length,
    getMatchHistory: () => state.matchHistory,
    setMatchHistory: (value) => { state.matchHistory = value; },
    getLastMatchIndex: () => state.lastMatchIndex,
    setLastMatchIndex: (value) => { state.lastMatchIndex = value; },
    getConsecutiveGames: () => state.consecutiveGames,
    setConsecutiveGames: (value) => { state.consecutiveGames = value; },
    getTeamCount: () => state.teamCount,
    setTeamCount: (value) => { state.teamCount = value; },
    getLastTeamsMessageId: () => null,
    getIsTableAllowed: () => true,
    setIsMatchFinished: () => {},
    setLastTeamsMessageId: () => {},
    setPlayingTeamsMessageId: (chatId, messageId) => {
      state.playingTeamsMessage = { chatId, messageId };
    },
    getPlayingTeamsMessageId: () => state.playingTeamsMessage,
    setMatchMessageByNumber: () => {},
  };
};

describe('executeKskCommand', () => {
  const checkAdminRights = jest.fn().mockResolvedValue(true);
  const checkMatchStarted = jest.fn().mockResolvedValue(true);
  const ctx = {
    chat: { id: 123 },
    callbackQuery: { message: { chat: { id: 123 }, message_id: 1 } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    safeTelegramCall.mockResolvedValue({ message_id: 1, chat: { id: 123 } });
  });

  test('сбрасывает ассисты и сейвы при переходе к следующему матчу (ksk)', async () => {
    const GlobalState = createGlobalState();

    await executeKskCommand(ctx, GlobalState, checkAdminRights, checkMatchStarted);

    const nextPlayingTeams = GlobalState.getPlayingTeams();
    const players = [...nextPlayingTeams.team1, ...nextPlayingTeams.team2];

    players.forEach((player) => {
      expect(player.goals).toBe(0);
      expect(player.assists).toBe(0);
      expect(player.saves).toBe(0);
    });
  });
});

