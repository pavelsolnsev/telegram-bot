const { checkTimeAndNotify } = require('../../utils/checkTimeAndNotify');
const { GlobalState } = require('../../store');
const { sendPrivateMessage } = require('../../message/sendPrivateMessage');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');

// Мокаем зависимости
jest.mock('../../message/sendPrivateMessage');
jest.mock('../../utils/deleteMessageAfterDelay');

describe('checkTimeAndNotify', () => {
  let mockBot;
  const GROUP_CHAT_ID = 789;
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  beforeEach(() => {
    // Сбрасываем все моки
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Мокаем bot
    mockBot = {
      telegram: {
        getChat: jest.fn(),
        sendMessage: jest.fn(),
      },
    };

    // Мокаем sendPrivateMessage
    sendPrivateMessage.mockResolvedValue({ message_id: 1 });

    // Мокаем deleteMessageAfterDelay
    deleteMessageAfterDelay.mockImplementation(() => {});

    // Сбрасываем состояние
    GlobalState.setStart(false);
    GlobalState.setCollectionDate(null);
    GlobalState.setNotificationSent(false);
    GlobalState.setPlayers([]);
    GlobalState.setLocation(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Ранние выходы (не должно отправлять уведомление)', () => {
    test('не должен отправлять, если матч не начат', async () => {
      GlobalState.setStart(false);
      GlobalState.setCollectionDate(new Date(Date.now() + THREE_HOURS_MS));

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(sendPrivateMessage).not.toHaveBeenCalled();
    });

    test('не должен отправлять, если нет даты сбора', async () => {
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(null);

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(sendPrivateMessage).not.toHaveBeenCalled();
    });

    test('не должен отправлять, если уведомление уже отправлено', async () => {
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(new Date(Date.now() + THREE_HOURS_MS));
      GlobalState.setNotificationSent(true);

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(sendPrivateMessage).not.toHaveBeenCalled();
    });

    test('не должен отправлять, если время уже прошло', async () => {
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(new Date(Date.now() - 1000)); // Прошло 1 секунду назад

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(sendPrivateMessage).not.toHaveBeenCalled();
    });

    test('не должен отправлять, если до начала больше 3 часов', async () => {
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(
        new Date(Date.now() + THREE_HOURS_MS + 60000),
      ); // 3 часа 1 минута

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(sendPrivateMessage).not.toHaveBeenCalled();
    });
  });

  describe('Успешная отправка уведомления', () => {
    test('должен отправить уведомление, если до начала ровно 3 часа', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([
        { id: 1001, name: 'Игрок 1' },
        { id: 1002, name: 'Игрок 2' },
      ]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.getChat).toHaveBeenCalledWith(GROUP_CHAT_ID);
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(1);
      expect(sendPrivateMessage).toHaveBeenCalledTimes(2);
      expect(GlobalState.getNotificationSent()).toBe(true);
    });

    test('должен отправить уведомление, если до начала меньше 3 часов', async () => {
      const collectionDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 часа
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([{ id: 1001, name: 'Игрок 1' }]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(1);
      expect(sendPrivateMessage).toHaveBeenCalledTimes(1);
      expect(GlobalState.getNotificationSent()).toBe(true);
    });

    test('должен отправить уведомление для обычной локации (prof)', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([{ id: 1001, name: 'Игрок 1' }]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      const sentMessage = mockBot.telegram.sendMessage.mock.calls[0];
      expect(sentMessage[1]).toContain('Матч начнётся через 3 часа!');
      expect(sentMessage[1]).toContain('Профилакторий');
      expect(sentMessage[1]).toContain('Оплатить участие');
    });

    test('должен отправить уведомление для турнира (tr)', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([{ id: 1001, name: 'Игрок 1' }]);
      GlobalState.setLocation('tr');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      const sentMessage = mockBot.telegram.sendMessage.mock.calls[0];
      expect(sentMessage[1]).toContain('Турнир РФОИ');
      expect(sentMessage[1]).toContain('Начало через 3 часа!');
      expect(sentMessage[1]).toContain('Красное Знамя');
      expect(sentMessage[1]).not.toContain('Оплатить участие');
    });

    test('должен отправить личные сообщения всем игрокам', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([
        { id: 1001, name: 'Игрок 1' },
        { id: 1002, name: 'Игрок 2' },
        { id: 1003, name: 'Игрок 3' },
      ]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      expect(sendPrivateMessage).toHaveBeenCalledTimes(3);
      expect(sendPrivateMessage).toHaveBeenCalledWith(
        mockBot,
        1001,
        expect.stringContaining('Матч начнётся через 3 часа!'),
        expect.any(Object),
      );
      expect(sendPrivateMessage).toHaveBeenCalledWith(
        mockBot,
        1002,
        expect.stringContaining('Матч начнётся через 3 часа!'),
        expect.any(Object),
      );
      expect(sendPrivateMessage).toHaveBeenCalledWith(
        mockBot,
        1003,
        expect.stringContaining('Матч начнётся через 3 часа!'),
        expect.any(Object),
      );
    });

    test('должен вызвать deleteMessageAfterDelay с правильными параметрами', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      expect(deleteMessageAfterDelay).toHaveBeenCalledTimes(1);
      expect(deleteMessageAfterDelay).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram: mockBot.telegram,
          chat: { id: GROUP_CHAT_ID },
        }),
        123,
        THREE_HOURS_MS,
      );
    });

    test('должен отправить сообщение с правильными опциями', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      const sentMessage = mockBot.telegram.sendMessage.mock.calls[0];
      expect(sentMessage[2]).toEqual({
        parse_mode: 'HTML',
        link_preview_options: {
          url: 'https://vk.com/ramafootball',
          prefer_large_media: true,
        },
      });
    });
  });

  describe('Обработка ошибок', () => {
    test('должен установить флаг notificationSent при ошибке отправки в группу', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      const error = new Error('Ошибка отправки');
      mockBot.telegram.getChat.mockRejectedValue(error);

      await checkTimeAndNotify(mockBot);

      expect(GlobalState.getNotificationSent()).toBe(true);
      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(sendPrivateMessage).not.toHaveBeenCalled();
    });

    test('должен установить флаг notificationSent при ошибке sendMessage', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      const error = new Error('Ошибка отправки');
      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockRejectedValue(error);

      await checkTimeAndNotify(mockBot);

      expect(GlobalState.getNotificationSent()).toBe(true);
      expect(sendPrivateMessage).not.toHaveBeenCalled();
    });

    test('должен обработать ошибку при отправке личного сообщения и установить флаг', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([
        { id: 1001, name: 'Игрок 1' },
        { id: 1002, name: 'Игрок 2' },
      ]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      // Первое личное сообщение успешно, второе с ошибкой
      sendPrivateMessage
        .mockResolvedValueOnce({ message_id: 1 })
        .mockRejectedValueOnce(new Error('Ошибка отправки'));

      await checkTimeAndNotify(mockBot);

      // Флаг должен быть установлен, так как групповое сообщение отправлено
      expect(GlobalState.getNotificationSent()).toBe(true);
      expect(sendPrivateMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Проверка граничных случаев', () => {
    test('должен работать с пустым списком игроков', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(1);
      expect(sendPrivateMessage).not.toHaveBeenCalled();
      expect(GlobalState.getNotificationSent()).toBe(true);
    });

    test('должен работать с неизвестной локацией (использует prof по умолчанию)', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('unknown_location');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      const sentMessage = mockBot.telegram.sendMessage.mock.calls[0];
      expect(sentMessage[1]).toContain('Профилакторий');
    });

    test('должен работать, если локация не установлена (null)', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation(null);

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      const sentMessage = mockBot.telegram.sendMessage.mock.calls[0];
      expect(sentMessage[1]).toContain('Профилакторий');
    });

    test('не должен отправлять, если timeDiff равен 0', async () => {
      const collectionDate = new Date(Date.now());
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(GlobalState.getNotificationSent()).toBe(false);
    });

    test('не должен отправлять, если timeDiff чуть больше 3 часов', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS + 1);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      await checkTimeAndNotify(mockBot);

      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
      expect(GlobalState.getNotificationSent()).toBe(false);
    });
  });

  describe('Проверка содержимого сообщений', () => {
    test('должен содержать правильную дату в сообщении', async () => {
      const collectionDate = new Date(2024, 11, 25, 20, 0); // 25 декабря 2024, 20:00
      jest.setSystemTime(new Date(2024, 11, 25, 17, 0)); // 17:00

      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      const sentMessage = mockBot.telegram.sendMessage.mock.calls[0];
      expect(sentMessage[1]).toContain('25 декабря');
      expect(sentMessage[1]).toContain('20:00');
    });

    test('должен содержать все необходимые ссылки', async () => {
      const collectionDate = new Date(Date.now() + THREE_HOURS_MS);
      GlobalState.setStart(true);
      GlobalState.setCollectionDate(collectionDate);
      GlobalState.setPlayers([]);
      GlobalState.setLocation('prof');

      mockBot.telegram.getChat.mockResolvedValue({ id: GROUP_CHAT_ID });
      mockBot.telegram.sendMessage.mockResolvedValue({
        message_id: 123,
        chat: { id: GROUP_CHAT_ID },
      });

      await checkTimeAndNotify(mockBot);

      const sentMessage = mockBot.telegram.sendMessage.mock.calls[0];
      expect(sentMessage[1]).toContain('football.pavelsolntsev.ru');
      expect(sentMessage[1]).toContain('vk.com/ramafootball');
    });
  });
});

