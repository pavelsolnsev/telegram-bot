const { sendPrivateMessage } = require('../../message/sendPrivateMessage');

describe('sendPrivateMessage', () => {
  let mockBot;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBot = {
      telegram: {
        sendMessage: jest.fn(),
      },
    };
  });

  describe('Успешная отправка', () => {
    test('должен отправить сообщение пользователю', async () => {
      const mockResult = { message_id: 123, chat: { id: 456 } };
      mockBot.telegram.sendMessage.mockResolvedValue(mockResult);

      const result = await sendPrivateMessage(
        mockBot,
        200001,
        'Тестовое сообщение',
      );

      expect(result).toEqual(mockResult);
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
        200001,
        'Тестовое сообщение',
        { parse_mode: 'HTML' },
      );
    });

    test('должен передать опции сообщения', async () => {
      const mockResult = { message_id: 123 };
      mockBot.telegram.sendMessage.mockResolvedValue(mockResult);
      const options = { parse_mode: 'Markdown', disable_notification: true };

      await sendPrivateMessage(mockBot, 200001, 'Сообщение', options);

      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
        200001,
        'Сообщение',
        options,
      );
    });
  });

  describe('Обработка тестовых игроков', () => {
    test('не должен отправлять сообщение тестовому игроку (ID 100000-199999)', async () => {
      const result = await sendPrivateMessage(
        mockBot,
        150000,
        'Сообщение',
      );

      expect(result).toBeNull();
      expect(mockBot.telegram.sendMessage).not.toHaveBeenCalled();
    });

    test('должен отправлять сообщение обычному игроку (ID < 100000)', async () => {
      const mockResult = { message_id: 123 };
      mockBot.telegram.sendMessage.mockResolvedValue(mockResult);

      const result = await sendPrivateMessage(mockBot, 99999, 'Сообщение');

      expect(result).toEqual(mockResult);
      expect(mockBot.telegram.sendMessage).toHaveBeenCalled();
    });

    test('должен отправлять сообщение обычному игроку (ID >= 200000)', async () => {
      const mockResult = { message_id: 123 };
      mockBot.telegram.sendMessage.mockResolvedValue(mockResult);

      const result = await sendPrivateMessage(mockBot, 200000, 'Сообщение');

      expect(result).toEqual(mockResult);
      expect(mockBot.telegram.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Обработка ошибок', () => {
    test('должен обработать ошибку 403 (пользователь заблокировал бота)', async () => {
      const error = {
        response: {
          error_code: 403,
        },
      };
      mockBot.telegram.sendMessage.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await sendPrivateMessage(mockBot, 200001, 'Сообщение');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Пользователь 200001 заблокировал бота',
      );

      consoleSpy.mockRestore();
    });

    test('должен обработать ошибку 400 (чат не найден)', async () => {
      const error = {
        response: {
          error_code: 400,
          description: 'chat not found',
        },
      };
      mockBot.telegram.sendMessage.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await sendPrivateMessage(mockBot, 200001, 'Сообщение');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Чат с ID 200001 не найден или нет доступа',
      );

      consoleSpy.mockRestore();
    });

    test('должен обработать другие ошибки', async () => {
      const error = {
        response: {
          error_code: 500,
        },
        message: 'Internal Server Error',
      };
      mockBot.telegram.sendMessage.mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await sendPrivateMessage(mockBot, 200001, 'Сообщение');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Ошибка при отправке сообщения пользователю 200001:',
        'Internal Server Error',
      );

      consoleErrorSpy.mockRestore();
    });

    test('должен вернуть null при ошибке', async () => {
      const error = new Error('Test error');
      mockBot.telegram.sendMessage.mockRejectedValue(error);

      const result = await sendPrivateMessage(mockBot, 200001, 'Сообщение');
      expect(result).toBeNull();
    });
  });
});

