jest.mock('../../utils/deleteMessageAfterDelay', () => ({
  deleteMessageAfterDelay: jest.fn(),
}));

jest.mock('../../utils/safeAnswerCallback', () => ({
  safeAnswerCallback: jest.fn(),
}));

jest.mock('../../utils/manageUserMessage', () => ({
  manageTableMessage: jest.fn(),
  manageResultMessage: jest.fn(),
  getPreviousTableMessage: jest.fn(() => null),
  getPreviousResultMessage: jest.fn(() => null),
  updateTableMessageTimer: jest.fn(),
  updateResultMessageTimer: jest.fn(),
  clearUserMessages: jest.fn(),
  DELETE_DELAY: 300000,
}));

jest.mock('../../database/savePlayers', () => jest.fn().mockResolvedValue(undefined));
jest.mock('../../database/saveTeams', () => jest.fn().mockResolvedValue(undefined));

jest.mock('../../utils/selectLeaders', () => ({
  selectLeaders: jest.fn(() => []),
}));

jest.mock('../../utils/selectMvp', () => ({
  selectMvp: jest.fn(() => null),
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

const createBotHarness = () => {
  const hearsHandlers = [];
  const actionHandlers = [];
  const onHandlers = [];
  const startHandlers = [];

  const bot = {
    telegram: {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 500, chat: { id: 1 } }),
      editMessageText: jest.fn().mockResolvedValue(undefined),
      editMessageReplyMarkup: jest.fn().mockResolvedValue(undefined),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      pinChatMessage: jest.fn().mockResolvedValue(undefined),
      unpinChatMessage: jest.fn().mockResolvedValue(undefined),
    },
    hears: jest.fn((pattern, handler) => {
      hearsHandlers.push({ pattern, handler });
    }),
    action: jest.fn((pattern, handler) => {
      actionHandlers.push({ pattern, handler });
    }),
    on: jest.fn((event, handler) => {
      onHandlers.push({ event, handler });
    }),
    start: jest.fn((handler) => {
      startHandlers.push({ handler });
    }),
    __handlers: {
      hears: hearsHandlers,
      action: actionHandlers,
      on: onHandlers,
      start: startHandlers,
    },
  };

  const dispatchHears = async (text, ctx) => {
    // имитируем поведение telegraf: ctx.message.text + ctx.match для regexp
    ctx.message = { ...(ctx.message || {}), text };

    for (const { pattern, handler } of hearsHandlers) {
      if (pattern instanceof RegExp) {
        const match = text.match(pattern);
        if (match) {
          ctx.match = match;
          await handler(ctx);
          return true;
        }
      } else if (typeof pattern === 'string') {
        if (text === pattern) {
          ctx.match = [text];
          await handler(ctx);
          return true;
        }
      }
    }
    throw new Error(`Не найден обработчик hears для: "${text}"`);
  };

  const dispatchAction = async (data, ctx) => {
    ctx.callbackQuery = ctx.callbackQuery || {};
    ctx.callbackQuery.data = data;
    ctx.match = null;

    for (const { pattern, handler } of actionHandlers) {
      if (pattern instanceof RegExp) {
        const match = data.match(pattern);
        if (match) {
          ctx.match = match;
          await handler(ctx);
          return true;
        }
      } else if (typeof pattern === 'string') {
        if (data === pattern) {
          await handler(ctx);
          return true;
        }
      }
    }
    throw new Error(`Не найден обработчик action для: "${data}"`);
  };

  return { bot, dispatchHears, dispatchAction };
};

const createCtx = ({ chatId, chatType, fromId, bot }) => ({
  from: { id: fromId, username: 'tester' },
  chat: { id: chatId, type: chatType },
  message: { text: '' },
  match: null,
  callbackQuery: {
    message: {
      chat: { id: chatId },
      message_id: 100,
    },
  },
  deleteMessage: jest.fn().mockResolvedValue(undefined),
  reply: jest.fn().mockImplementation(async (text) => ({
    message_id: 101,
    chat: { id: chatId },
    text,
  })),
  telegram: bot.telegram,
});

const seedPlayers = () => ([
  { id: 11, username: 'p1', rating: 10, paid: true },
  { id: 12, username: 'p2', rating: 20, paid: true },
  { id: 13, username: 'p3', rating: 30, paid: true },
  { id: 14, username: 'p4', rating: 40, paid: true },
  { id: 15, username: 'p5', rating: 50, paid: true },
  { id: 16, username: 'p6', rating: 60, paid: true },
  { id: 17, username: 'p7', rating: 70, paid: true },
  { id: 18, username: 'p8', rating: 80, paid: true },
]);

const setPlayingMatchStats = (GlobalState, { team1Goals = 1, team2Goals = 0, yellowCards = 0 } = {}) => {
  const playing = GlobalState.getPlayingTeams();
  expect(playing).toBeTruthy();

  // Безопасно модифицируем копии (они и так в playingTeams)
  if (playing.team1 && playing.team1[0]) {
    playing.team1[0].goals = team1Goals;
    playing.team1[0].assists = Math.max(0, team1Goals - 1);
    playing.team1[0].saves = 0;
    playing.team1[0].yellowCards = yellowCards;
  }
  if (playing.team2 && playing.team2[0]) {
    playing.team2[0].goals = team2Goals;
    playing.team2[0].assists = Math.max(0, team2Goals - 1);
    playing.team2[0].saves = 0;
    playing.team2[0].yellowCards = 0;
  }
};

describe('интеграционный сценарий: 2 турнира подряд, результаты сохраняются до старта нового турнира', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('турнир 1 → e! (результаты видны) → старт турнир 2 (результаты очищены) → турнир 2 → e!', async () => {
    // fresh store + handlers
    // eslint-disable-next-line global-require
    const { GlobalState } = require('../../store');
    // eslint-disable-next-line global-require
    const savePlayersToDatabase = require('../../database/savePlayers');
    // eslint-disable-next-line global-require
    const saveTeamsToDatabase = require('../../database/saveTeams');

    const { bot, dispatchHears, dispatchAction } = createBotHarness();

    // register commands we need
    // eslint-disable-next-line global-require
    require('../../commands/startMatch')(bot, GlobalState);
    // eslint-disable-next-line global-require
    require('../../commands/team')(bot, GlobalState);
    // eslint-disable-next-line global-require
    require('../../commands/ready')(bot, GlobalState);
    // eslint-disable-next-line global-require
    require('../../commands/play')(bot, GlobalState);
    // eslint-disable-next-line global-require
    require('../../commands/finish')(bot, GlobalState);
    // eslint-disable-next-line global-require
    require('../../commands/end')(bot, GlobalState);
    // eslint-disable-next-line global-require
    require('../../commands/result')(bot, GlobalState);

    const groupCtx = createCtx({ chatId: -100, chatType: 'group', fromId: 123, bot });
    const pmCtx = createCtx({ chatId: 1, chatType: 'private', fromId: 123, bot });

    // ---------- Tournament 1 ----------
    await dispatchHears('s 24.01.2026 19:00 prof', groupCtx);
    expect(GlobalState.getStart()).toBe(true);
    expect(GlobalState.getMatchResults()).toEqual([]); // старт турнира очищает результаты

    GlobalState.setPlayers(seedPlayers());
    await dispatchHears('tm4', pmCtx);

    // меняем названия команд перед матчами
    GlobalState.setTeamName(0, 'Леон');
    GlobalState.setTeamName(1, 'Барселона');
    GlobalState.setTeamName(2, 'Спартак');
    GlobalState.setTeamName(3, 'Милан');

    // объявляем составы (чтобы pl был доступен)
    await dispatchAction('announce_teams_confirm', pmCtx);
    expect(GlobalState.getIsTableAllowed()).toBe(true);

    // матч №1: команды 1 vs 2
    await dispatchHears('pl12', pmCtx);
    setPlayingMatchStats(GlobalState, { team1Goals: 2, team2Goals: 1, yellowCards: 1 });
    await dispatchHears('fn', pmCtx);

    // матч №2: команды 3 vs 4
    await dispatchHears('pl34', pmCtx);
    setPlayingMatchStats(GlobalState, { team1Goals: 0, team2Goals: 0, yellowCards: 0 });
    await dispatchHears('fn', pmCtx);

    expect(GlobalState.getMatchResults()).toHaveLength(2);

    // результаты в личке
    pmCtx.reply.mockClear();
    await dispatchHears('результаты', pmCtx);
    const firstResultsText = pmCtx.reply.mock.calls[0][0];
    expect(firstResultsText).toContain('Итог матча №1');
    expect(firstResultsText).toContain('Итог матча №2');
    expect(firstResultsText).toContain('Леон');
    expect(firstResultsText).toContain('Барселона');

    // завершаем турнир e! (store чистится, но результаты сохраняются)
    await dispatchHears('e!', groupCtx);
    expect(GlobalState.getStart()).toBe(false);
    expect(GlobalState.getTeams()).toEqual([]);
    expect(GlobalState.getMatchResults()).toHaveLength(2);

    // должны быть сохранения в БД (моки)
    expect(savePlayersToDatabase).toHaveBeenCalledTimes(1);
    expect(saveTeamsToDatabase).toHaveBeenCalledTimes(1);

    // результаты всё ещё видны после e!
    pmCtx.reply.mockClear();
    await dispatchHears('результаты', pmCtx);
    const resultsAfterEndText = pmCtx.reply.mock.calls[0][0];
    expect(resultsAfterEndText).toContain('Итог матча №1');
    expect(resultsAfterEndText).toContain('Итог матча №2');
    // названия команд должны сохраниться в результатах даже после полной очистки стора
    expect(resultsAfterEndText).toContain('Леон');
    expect(resultsAfterEndText).toContain('Барселона');

    // ---------- Tournament 2 ----------
    await dispatchHears('s 25.01.2026 19:00 prof', groupCtx);
    expect(GlobalState.getStart()).toBe(true);
    // старт нового турнира очищает результаты прошлого
    expect(GlobalState.getMatchResults()).toEqual([]);

    GlobalState.setPlayers(seedPlayers());
    await dispatchHears('tm4', pmCtx);
    await dispatchAction('announce_teams_confirm', pmCtx);

    await dispatchHears('pl12', pmCtx);
    setPlayingMatchStats(GlobalState, { team1Goals: 1, team2Goals: 0, yellowCards: 0 });
    await dispatchHears('fn', pmCtx);

    expect(GlobalState.getMatchResults()).toHaveLength(1);

    pmCtx.reply.mockClear();
    await dispatchHears('результаты', pmCtx);
    const secondResultsText = pmCtx.reply.mock.calls[0][0];
    expect(secondResultsText).toContain('Итог матча №1');
    expect(secondResultsText).not.toContain('Итог матча №2');

    await dispatchHears('e!', groupCtx);
    expect(GlobalState.getStart()).toBe(false);
    expect(GlobalState.getMatchResults()).toHaveLength(1);

    expect(savePlayersToDatabase).toHaveBeenCalledTimes(2);
    expect(saveTeamsToDatabase).toHaveBeenCalledTimes(2);
  });
});

