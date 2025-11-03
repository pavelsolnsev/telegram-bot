const { safeTelegramCall } = require('../../utils/telegramUtils');

describe('safeTelegramCall', () => {
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      telegram: {
        sendMessage: jest.fn(),
        editMessageText: jest.fn(),
        deleteMessage: jest.fn(),
      },
    };
  });

  describe('Успешные вызовы', () => {
    test('должен успешно вызвать метод Telegram API', async () => {
      const mockResult = { message_id: 123, chat: { id: 456 } };
      mockCtx.telegram.sendMessage.mockResolvedValue(mockResult);

      const result = await safeTelegramCall(mockCtx, 'sendMessage', [456, 'Hello']);

      expect(result).toEqual(mockResult);
      expect(mockCtx.telegram.sendMessage).toHaveBeenCalledWith(456, 'Hello');
      expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(1);
    });

    test('должен передавать все аргументы в метод', async () => {
      mockCtx.telegram.sendMessage.mockResolvedValue({});

      await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text', { parse_mode: 'HTML' }]);

      expect(mockCtx.telegram.sendMessage).toHaveBeenCalledWith(123, 'Text', { parse_mode: 'HTML' });
    });
  });

  describe('Обработка ошибок "message is not modified"', () => {
    test('должен вернуть null для ошибки "message is not modified"', async () => {
      const error = {
        response: {
          description: 'message is not modified',
        },
      };
      mockCtx.telegram.sendMessage.mockRejectedValue(error);

      const result = await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text']);

      expect(result).toBeNull();
      expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(1);
    });

    test('должен вернуть null для ошибки "message to edit not found"', async () => {
      const error = {
        response: {
          description: 'message to edit not found',
        },
      };
      mockCtx.telegram.editMessageText.mockRejectedValue(error);

      const result = await safeTelegramCall(mockCtx, 'editMessageText', [123, 456, null, 'Text']);

      expect(result).toBeNull();
      expect(mockCtx.telegram.editMessageText).toHaveBeenCalledTimes(1);
    });

    test('должен обработать ошибки без response', async () => {
      const error = {
        response: undefined,
        code: 500,
        message: 'Some error',
      };
      mockCtx.telegram.sendMessage.mockRejectedValue(error);

      try {
        await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text']);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('Обработка rate limit (429)', () => {
    test('должен повторить запрос при код 429', async () => {
      const mockResult = { message_id: 123 };
      const error429 = {
        code: 429,
        response: {
          parameters: { retry_after: 0.1 },
        },
      };

      mockCtx.telegram.sendMessage
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce(mockResult);

      const result = await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text'], 3);

      expect(result).toEqual(mockResult);
      expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('должен использовать дефолтный retry_after если не указан', async () => {
      const mockResult = { message_id: 123 };
      const error429 = {
        code: 429,
        response: {
          parameters: {},
        },
      };

      mockCtx.telegram.sendMessage
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce(mockResult);

      const result = await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text'], 3);

      expect(result).toEqual(mockResult);
      expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Обработка gateway timeout (504)', () => {
    test('должен повторить запрос при код 504', async () => {
      const mockResult = { message_id: 123 };
      const error504 = {
        code: 504,
        response: {
          parameters: { retry_after: 0.1 },
        },
      };

      mockCtx.telegram.sendMessage
        .mockRejectedValueOnce(error504)
        .mockResolvedValueOnce(mockResult);

      const result = await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text'], 3);

      expect(result).toEqual(mockResult);
      expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Обработка других ошибок', () => {
    test('должен выбросить ошибку для неизвестных кодов', async () => {
      const error = {
        code: 500,
        message: 'Internal Server Error',
      };
      mockCtx.telegram.sendMessage.mockRejectedValue(error);

      try {
        await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text'], 3);
      } catch (e) {
        expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(1); // выбрасывается сразу
      }
    });

    test('должен выбросить ошибку после исчерпания попыток', async () => {
      const error = {
        code: 500,
        message: 'Internal Server Error',
      };
      mockCtx.telegram.sendMessage.mockRejectedValue(error);

      try {
        await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text'], 2);
      } catch (e) {
        expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(1); // выброс сразу
      }
    });
  });

  describe('Настройка количества попыток', () => {
    test('должен использовать дефолтное количество попыток (3)', async () => {
      const error = { code: 429, response: { parameters: { retry_after: 0.1 } } };
      mockCtx.telegram.sendMessage.mockRejectedValue(error);

      try {
        await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text']);
      } catch (e) {
        expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(3);
      }
    });

    test('должен выбросить ошибку сразу для неизвестных кодов независимо от попыток', async () => {
      const error = { code: 500, message: 'Error' };
      mockCtx.telegram.sendMessage.mockRejectedValue(error);

      try {
        await safeTelegramCall(mockCtx, 'sendMessage', [123, 'Text'], 5);
      } catch (e) {
        expect(mockCtx.telegram.sendMessage).toHaveBeenCalledTimes(1); // выброс сразу
      }
    });
  });
});

