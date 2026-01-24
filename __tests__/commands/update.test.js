jest.mock('../../utils/deleteMessageAfterDelay', () => ({
  deleteMessageAfterDelay: jest.fn(),
}));

jest.mock('../../database/savePlayers', () => jest.fn().mockResolvedValue(undefined));
jest.mock('../../database/saveTeams', () => jest.fn().mockResolvedValue(undefined));

jest.mock('../../utils/telegramUtils', () => ({
  safeTelegramCall: jest.fn(),
}));

jest.mock('../../utils/safeAnswerCallback', () => ({
  safeAnswerCallback: jest.fn(),
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
  hears: jest.fn(),
  action: jest.fn(),
});

const createCtxMock = () => ({
  from: { id: 123 },
  chat: { id: 1, type: 'private' },
  message: { text: '/update' },
  deleteMessage: jest.fn().mockResolvedValue(undefined),
  reply: jest.fn().mockResolvedValue({ message_id: 999, chat: { id: 1 } }),
  telegram: {
    sendMessage: jest.fn().mockResolvedValue({ message_id: 1000, chat: { id: 1 } }),
    deleteMessage: jest.fn().mockResolvedValue(undefined),
  },
});

describe('команда /update — очищает состояние, но сохраняет игроков', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('требует подтверждение; после confirm остаются players и параметры сбора, а остальное (включая results/queue) сбрасывается', async () => {
    // eslint-disable-next-line global-require
    const { GlobalState } = require('../../store');
    // eslint-disable-next-line global-require
    const initUpdate = require('../../commands/update');
    // eslint-disable-next-line global-require
    const { safeTelegramCall } = require('../../utils/telegramUtils');

    // эмулируем активный сбор
    GlobalState.setStart(true);
    const cd = new Date('2026-01-24T10:00:00Z');
    GlobalState.setCollectionDate(cd);
    GlobalState.setLocation('prof');
    GlobalState.setMaxPlayers(20);

    // список игроков должен сохраниться
    const players = [{ id: 1, username: 'p1' }];
    const queue = [{ id: 2, username: 'p2' }];
    GlobalState.setPlayers(players);
    GlobalState.setQueue(queue);

    // "грязные" данные должны очиститься
    GlobalState.setTeams([[{ id: 1 }], [{ id: 2 }]]);
    GlobalState.setTeamsBase([[{ id: 1 }], [{ id: 2 }]]);
    GlobalState.setTeamStats({ team1: { wins: 1 } });
    GlobalState.setPlayingTeams({ team1: [], team2: [], teamIndex1: 0, teamIndex2: 1 });
    GlobalState.setPlayingTeamsMessageId(-100, 123);
    GlobalState.setIsTableAllowed(true);
    GlobalState.setDivided(true);
    GlobalState.setIsTeamCommandAllowed(false);
    GlobalState.setIsEndCommandAllowed(false);
    GlobalState.setReferee('Судья');
    GlobalState.setTeamName(0, 'Леон');
    GlobalState.setMatchHistory({ 0: { 1: 1 } });
    GlobalState.setConsecutiveGames({ 0: 1 });
    GlobalState.pushMatchHistory({ teams: [] });

    // результаты должны очиститься сразу
    GlobalState.addMatchResult({ teamIndex1: 0, teamIndex2: 1, score1: 1, score2: 0 });

    // list message сохраняем (чтобы вернуться к этапу "tm" без потери списка)
    GlobalState.setListMessageChatId(-100);
    GlobalState.setListMessageId(777);

    const bot = createBotMock();
    initUpdate(bot, GlobalState);

    const hearsCall = bot.hears.mock.calls.find(
      ([re]) => String(re).includes('^\\/update$'),
    );
    expect(hearsCall).toBeDefined();

    const updateHandler = hearsCall[1];
    const ctx = createCtxMock();

    safeTelegramCall.mockResolvedValue({ message_id: 10, chat: { id: 1 } });

    // 1) /update показывает подтверждение и НЕ меняет состояние
    await updateHandler(ctx);
    expect(bot.action).toHaveBeenCalled();

    // 2) нажимаем confirm
    const confirmCall = bot.action.mock.calls.find(([name]) => name === 'update_confirm');
    expect(confirmCall).toBeDefined();
    const confirmHandler = confirmCall[1];

    const callbackCtx = {
      from: { id: 123 },
      chat: { id: 1, type: 'private' },
      callbackQuery: { message: { chat: { id: 1, type: 'private' }, message_id: 10 } },
      telegram: ctx.telegram,
    };

    safeTelegramCall.mockResolvedValue({ message_id: 11, chat: { id: 1 } });
    await confirmHandler(callbackCtx);

    // players и параметры сбора сохранены
    expect(GlobalState.getPlayers()).toEqual(players);
    expect(GlobalState.getQueue()).toEqual([]);
    expect(GlobalState.getStart()).toBe(true);
    expect(GlobalState.getCollectionDate()).toEqual(cd);
    expect(GlobalState.getLocation()).toBe('prof');
    expect(GlobalState.getMaxPlayers()).toBe(20);
    expect(GlobalState.getListMessageId()).toBe(777);
    expect(GlobalState.getListMessageChatId()).toBe(-100);

    // результаты очищены
    expect(GlobalState.getMatchResults()).toEqual([]);

    // всё остальное сброшено, чтобы можно было снова делать tm
    expect(GlobalState.getTeams()).toEqual([]);
    expect(GlobalState.getTeamsBase()).toEqual([]);
    expect(GlobalState.getTeamStats()).toEqual({});
    expect(GlobalState.getPlayingTeams()).toBe(null);
    expect(GlobalState.getPlayingTeamsMessageId()).toBe(null);
    expect(GlobalState.getIsTableAllowed()).toBe(false);
    expect(GlobalState.getDivided()).toBe(false);
    expect(GlobalState.getIsTeamCommandAllowed()).toBe(true);
    expect(GlobalState.getIsEndCommandAllowed()).toBe(true);
    expect(GlobalState.getReferee()).toBe('Не назначен');
    expect(GlobalState.getTeamNames()).toEqual({});
    expect(GlobalState.getMatchHistory()).toEqual({});
    expect(GlobalState.getConsecutiveGames()).toEqual({});
    expect(GlobalState.getMatchHistoryStackLength()).toBe(0);
  });
});

