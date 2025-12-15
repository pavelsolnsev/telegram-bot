jest.mock('../../utils/telegramUtils', () => ({
  safeTelegramCall: jest.fn(),
}));

jest.mock('../../utils/deleteMessageAfterDelay', () => ({
  deleteMessageAfterDelay: jest.fn(),
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

const initReady = require('../../commands/ready');
const { safeTelegramCall } = require('../../utils/telegramUtils');

const createGlobalState = (overrides = {}) => {
  const state = {
    isTableAllowed: false,
    adminId: [123],
    groupId: -100,
    ...overrides,
  };

  return {
    getAdminId: () => state.adminId,
    getIsTableAllowed: () => state.isTableAllowed,
    setIsTableAllowed: (value) => { state.isTableAllowed = value; },
    getGroupId: () => state.groupId,
    getLastTeamsMessageId: () => null,
    getPlayingTeams: () => null,
  };
};

const createBotMock = () => ({
  hears: jest.fn(),
  action: jest.fn(),
});

describe('ready command / кнопка announce_teams - подтверждение объявления составов', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('кнопка announce_teams показывает сообщение-подтверждение с кнопками', async () => {
    const bot = createBotMock();
    const GlobalState = createGlobalState();

    initReady(bot, GlobalState);

    const announceHandlerCall = bot.action.mock.calls.find(
      ([action]) => action === 'announce_teams',
    );
    expect(announceHandlerCall).toBeDefined();

    const announceHandler = announceHandlerCall[1];

    const ctx = {
      from: { id: 123 },
      chat: { id: -100, type: 'group' },
      callbackQuery: {
        message: {
          chat: { id: -100 },
          message_id: 10,
        },
      },
    };

    safeTelegramCall.mockResolvedValue({
      message_id: 10,
      chat: { id: -100 },
    });

    await announceHandler(ctx);

    // На callback приходит просьба подтвердить действие
    const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
    expect(safeAnswerCallback).toHaveBeenCalledWith(ctx, 'Подтвердите отправку уведомления');

    // Отправляется сообщение с текстом-подтверждением и кнопками "подтвердить/отклонить"
    const sendCall = safeTelegramCall.mock.calls.find(
      ([, method]) => method === 'sendMessage',
    );
    expect(sendCall).toBeDefined();
    const args = sendCall[2];
    const text = args[1];
    const options = args[2];

    expect(text).toContain('сменить названия команд');
    expect(options).toHaveProperty('reply_markup');
    const allButtons = options.reply_markup.inline_keyboard.flat();
    const callbacks = allButtons.map((b) => b.callback_data);
    expect(callbacks).toContain('announce_teams_confirm');
    expect(callbacks).toContain('announce_teams_cancel');
  });

  test('кнопка announce_teams_confirm после подтверждения объявляет составы (вызывает announceTeams)', async () => {
    const bot = createBotMock();
    const GlobalState = createGlobalState();

    initReady(bot, GlobalState);

    const confirmHandlerCall = bot.action.mock.calls.find(
      ([action]) => action === 'announce_teams_confirm',
    );
    expect(confirmHandlerCall).toBeDefined();

    const confirmHandler = confirmHandlerCall[1];

    const ctx = {
      from: { id: 123 },
      chat: { id: 1, type: 'private' },
      callbackQuery: {
        message: {
          chat: { id: 1 },
          message_id: 20,
        },
      },
      telegram: {
        sendMessage: jest.fn().mockResolvedValue({ message_id: 30 }),
      },
    };

    safeTelegramCall.mockResolvedValue({});

    await confirmHandler(ctx);

    const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');

    // Отвечаем в callback, что начали объявление составов
    expect(safeAnswerCallback).toHaveBeenCalledWith(ctx, '✅ Объявляю составы...');

    // Сообщение-подтверждение удаляется
    expect(safeTelegramCall).toHaveBeenCalledWith(ctx, 'deleteMessage', [1, 20]);

    // Функция объявления составов должна установить флаг isTableAllowed
    expect(GlobalState.getIsTableAllowed()).toBe(true);

    // И отправить сообщение в группу (используется groupId из GlobalState)
    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith(
      -100,
      expect.any(String),
      expect.any(Object),
    );
  });
});
