jest.mock('../../utils/deleteMessageAfterDelay', () => ({
  deleteMessageAfterDelay: jest.fn(),
}));

jest.mock('../../database/savePlayers', () => jest.fn().mockResolvedValue(undefined));
jest.mock('../../database/saveTeams', () => jest.fn().mockResolvedValue(undefined));

jest.mock('../../utils/selectLeaders', () => ({
  selectLeaders: jest.fn(() => []),
}));

jest.mock('../../utils/selectMvp', () => ({
  selectMvp: jest.fn(() => null),
}));

jest.mock('../../message/sendPrivateMessage', () => ({
  sendPrivateMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('telegraf', () => ({
  Markup: {
    inlineKeyboard: jest.fn((buttons) => ({
      reply_markup: { inline_keyboard: buttons },
    })),
    button: {
      callback: jest.fn((text, callback_data) => ({ text, callback_data })),
    },
  },
}));

const createBotMock = () => ({
  on: jest.fn(),
  hears: jest.fn(),
});

const createCtxMock = () => ({
  from: { id: 123 },
  chat: { id: -100, type: 'group' },
  message: { text: 'e!' },
  deleteMessage: jest.fn().mockResolvedValue(undefined),
  reply: jest.fn().mockResolvedValue({ message_id: 999, chat: { id: -100 } }),
  telegram: {
    deleteMessage: jest.fn().mockResolvedValue(undefined),
    sendMessage: jest.fn().mockResolvedValue({ message_id: 1000, chat: { id: -100 } }),
    unpinChatMessage: jest.fn().mockResolvedValue(undefined),
  },
});

describe('команда e! — сбрасывает турнирное состояние, но сохраняет результаты', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('после e! store очищен (кроме matchResults)', async () => {
    // важно: берём свежий инстанс стора после resetModules
    // eslint-disable-next-line global-require
    const { GlobalState } = require('../../store');
    // eslint-disable-next-line global-require
    const initEnd = require('../../commands/end');

    // подготавливаем "грязное" состояние турнира
    GlobalState.setStart(true);
    GlobalState.setIsEndCommandAllowed(true);
    GlobalState.setIsTeamCommandAllowed(false);
    GlobalState.setDivided(true);
    GlobalState.setIsStatsInitialized(true);
    GlobalState.setIsMatchFinished(true);
    GlobalState.setNotificationSent(true);
    GlobalState.setIsTableAllowed(true);

    GlobalState.setPlayers([{ id: 1, username: 'p1' }]);
    GlobalState.setQueue([{ id: 2, username: 'p2' }]);
    GlobalState.setCollectionDate(new Date('2026-01-01T10:00:00Z'));
    GlobalState.setMaxPlayers(99);

    GlobalState.setLocation('prof');
    GlobalState.setTeamCount(2);
    GlobalState.setLastMatchIndex({ 0: { 1: 1 } });

    GlobalState.setTeams([[{ id: 1, username: 'p1', goals: 0, assists: 0, saves: 0, yellowCards: 0, rating: 0 }]]);
    GlobalState.setTeamsBase([[{ id: 1, username: 'p1', rating: 0 }]]);
    GlobalState.setTeamStats({ team1: { wins: 1, losses: 0, draws: 0, games: 1, consecutiveWins: 1, goalsScored: 1, goalsConceded: 0 } });
    GlobalState.setPlayingTeams({ team1: [], team2: [], teamIndex1: 0, teamIndex2: 1 });
    GlobalState.setPlayingTeamsMessageId(-100, 555);
    GlobalState.setLastTeamCount(4);
    GlobalState.setLastTeamsMessageId(-100, 556);

    GlobalState.setReferee('Кто-то');
    GlobalState.setTeamName(0, 'A');

    GlobalState.setListMessageChatId(-100);
    GlobalState.setListMessageId(777);

    GlobalState.setAllPlayersHistory([{ id: 1, goals: 1, gamesPlayed: 1, wins: 1, draws: 0, losses: 0, rating: 1 }]);
    GlobalState.pushMatchHistory({ teams: [] });
    GlobalState.setMatchMessageByNumber(1, -100, 600);

    // результаты должны сохраниться после e!
    GlobalState.addMatchResult({
      teamIndex1: 0,
      teamIndex2: 1,
      score1: 1,
      score2: 0,
      players1: [],
      players2: [],
    });
    GlobalState.setLastResultMessageId(999, 888);

    const bot = createBotMock();
    initEnd(bot, GlobalState);

    const hearsCall = bot.hears.mock.calls.find(([re]) => String(re).includes('^e!$'));
    expect(hearsCall).toBeDefined();

    const handler = hearsCall[1];
    const ctx = createCtxMock();

    await handler(ctx);

    // результаты остаются
    expect(GlobalState.getMatchResults()).toHaveLength(1);

    // турнирное состояние сброшено
    expect(GlobalState.getStart()).toBe(false);
    expect(GlobalState.getPlayers()).toEqual([]);
    expect(GlobalState.getQueue()).toEqual([]);
    expect(GlobalState.getCollectionDate()).toBe(null);
    expect(GlobalState.getMaxPlayers()).toBe(20);
    expect(GlobalState.getNotificationSent()).toBe(false);

    expect(GlobalState.getTeams()).toEqual([]);
    expect(GlobalState.getTeamsBase()).toEqual([]);
    expect(GlobalState.getTeamStats()).toEqual({});
    expect(GlobalState.getPlayingTeams()).toBe(null);
    expect(GlobalState.getPlayingTeamsMessageId()).toBe(null);
    expect(GlobalState.getLastTeamCount()).toBe(null);
    expect(GlobalState.getLastTeamsMessageId()).toBe(null);

    expect(GlobalState.getDivided()).toBe(false);
    expect(GlobalState.getIsStatsInitialized()).toBe(false);
    expect(GlobalState.getIsMatchFinished()).toBe(false);
    expect(GlobalState.getIsEndCommandAllowed()).toBe(true);
    expect(GlobalState.getIsTeamCommandAllowed()).toBe(true);
    expect(GlobalState.getIsTableAllowed()).toBe(false);

    expect(GlobalState.getReferee()).toBe('Не назначен');
    expect(GlobalState.getTeamNames()).toEqual({});

    expect(GlobalState.getLocation()).toBe(null);
    expect(GlobalState.getTeamCount()).toBe(0);
    expect(GlobalState.getMatchHistory()).toEqual({});
    expect(GlobalState.getConsecutiveGames()).toEqual({});
    expect(GlobalState.getLastMatchIndex()).toEqual({});
    expect(GlobalState.getMatchHistoryStackLength()).toBe(0);
    expect(GlobalState.getMatchMessageByNumber(1)).toBe(null);
    expect(GlobalState.getAllPlayersHistory()).toEqual([]);

    expect(GlobalState.getListMessageId()).toBe(null);
    expect(GlobalState.getListMessageChatId()).toBe(null);
    expect(GlobalState.getLastResultMessageId()).toBe(null);
  });
});

describe('команда e! (завершение турнира) - полный сброс состояния', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('после e! очищается стек откатов и служебные структуры, но результаты остаются', async () => {
    const initEnd = require('../../commands/end');
    const { GlobalState } = require('../../store');

    // Подготавливаем состояние "как будто был прошлый турнир"
    GlobalState.setStart(true);
    GlobalState.setIsEndCommandAllowed(true);

    GlobalState.setTeams([[], [], [], []]);
    GlobalState.setTeamsBase([[], [], [], []]);
    GlobalState.setTeamStats({});

    // "Хвост" прошлого турнира: результаты и стек истории для откатов
    GlobalState.addMatchResult({ teamIndex1: 0, teamIndex2: 1, score1: 1, score2: 0 });
    GlobalState.pushMatchHistory({
      teams: [[], [], [], []],
      teamStats: {},
      matchHistory: { 0: { 1: 1 }, 1: { 0: 1 } },
      lastMatchIndex: { 0: { 1: 0 }, 1: { 0: 0 } },
      consecutiveGames: { 0: 1, 1: 1, 2: 0, 3: 0 },
      playingTeams: null,
    });
    GlobalState.setIsMatchFinished(false);
    GlobalState.setMatchMessageByNumber(1, 123, 456);
    GlobalState.setLastMatchIndex({ 0: { 1: 0 } });
    GlobalState.setTeamCount(4);

    expect(GlobalState.getMatchHistoryStackLength()).toBeGreaterThan(0);
    expect(GlobalState.getMatchResults().length).toBeGreaterThan(0);
    expect(GlobalState.getMatchMessageByNumber(1)).not.toBeNull();
    expect(Object.keys(GlobalState.getLastMatchIndex()).length).toBeGreaterThan(0);

    const bot = {
      on: jest.fn(),
      hears: jest.fn(),
    };

    initEnd(bot, GlobalState);

    const hearsCall = bot.hears.mock.calls.find(
      ([pattern]) => pattern && pattern.toString() === '/^e!$/i',
    );
    expect(hearsCall).toBeDefined();

    const handler = hearsCall[1];

    const ctx = {
      from: { id: 123 },
      chat: { id: -100, type: 'group' },
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn().mockResolvedValue({ message_id: 999 }),
      telegram: {
        deleteMessage: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn().mockResolvedValue({ message_id: 1000, chat: { id: -100 } }),
        unpinChatMessage: jest.fn().mockResolvedValue(undefined),
      },
    };

    await handler(ctx);

    // Критично: должен очищаться стек откатов и связанные структуры
    expect(GlobalState.getMatchHistoryStackLength()).toBe(0);
    // результаты НЕ очищаем — они должны быть видны до старта нового турнира (команда s)
    expect(GlobalState.getMatchResults().length).toBeGreaterThan(0);
    expect(GlobalState.getMatchMessageByNumber(1)).toBeNull();
    expect(GlobalState.getLastMatchIndex()).toEqual({});
    expect(GlobalState.getIsMatchFinished()).toBe(false);
  });
});

