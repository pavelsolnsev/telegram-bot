const { safeAnswerCallback } = require("../../utils/safeAnswerCallback");

describe("safeAnswerCallback", () => {
  let mockCtx;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockCtx = {
      answerCbQuery: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Успешные вызовы", () => {
    test("должен успешно вызвать answerCbQuery", async () => {
      const mockResult = { ok: true };
      mockCtx.answerCbQuery.mockResolvedValue(mockResult);

      const result = await safeAnswerCallback(mockCtx, "Текст");

      expect(result).toEqual(mockResult);
      expect(mockCtx.answerCbQuery).toHaveBeenCalledWith("Текст");
      expect(mockCtx.answerCbQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("Обработка устаревших callback-запросов", () => {
    test("должен вернуть null для устаревшего callback-запроса", async () => {
      const error = {
        code: 400,
        description: "query is too old",
      };
      mockCtx.answerCbQuery.mockRejectedValue(error);

      const result = await safeAnswerCallback(mockCtx, "Текст");

      expect(result).toBeNull();
      expect(mockCtx.answerCbQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("Обработка rate limit (429)", () => {
    test("должен повторить запрос при код 429", async () => {
      jest.useRealTimers();
      const mockResult = { ok: true };
      const error429 = {
        code: 429,
        response: {
          parameters: { retry_after: 0.1 },
        },
      };

      mockCtx.answerCbQuery
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce(mockResult);

      const result = await safeAnswerCallback(mockCtx, "Текст", 3);

      expect(result).toEqual(mockResult);
      expect(mockCtx.answerCbQuery).toHaveBeenCalledTimes(2);
      jest.useFakeTimers();
    }, 10000);

    test("должен использовать дефолтный retry_after если не указан", async () => {
      jest.useRealTimers();
      const mockResult = { ok: true };
      const error429 = {
        code: 429,
        response: {
          parameters: {},
        },
      };

      mockCtx.answerCbQuery
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce(mockResult);

      const result = await safeAnswerCallback(mockCtx, "Текст", 3);

      expect(result).toEqual(mockResult);
      expect(mockCtx.answerCbQuery).toHaveBeenCalledTimes(2);
      jest.useFakeTimers();
    }, 10000);
  });

  describe("Обработка gateway timeout (504)", () => {
    test("должен повторить запрос при код 504", async () => {
      jest.useRealTimers();
      const mockResult = { ok: true };
      const error504 = {
        code: 504,
        response: {
          parameters: { retry_after: 0.1 },
        },
      };

      mockCtx.answerCbQuery
        .mockRejectedValueOnce(error504)
        .mockResolvedValueOnce(mockResult);

      const result = await safeAnswerCallback(mockCtx, "Текст", 3);

      expect(result).toEqual(mockResult);
      expect(mockCtx.answerCbQuery).toHaveBeenCalledTimes(2);
      jest.useFakeTimers();
    }, 10000);
  });

  describe("Обработка других ошибок", () => {
    test("должен выбросить ошибку после исчерпания попыток", async () => {
      const error = {
        code: 500,
        message: "Internal Server Error",
      };
      mockCtx.answerCbQuery.mockRejectedValue(error);

      await expect(
        safeAnswerCallback(mockCtx, "Текст", 3)
      ).rejects.toThrow("Failed after 3 retries: Internal Server Error");

      expect(mockCtx.answerCbQuery).toHaveBeenCalledTimes(3);
    });

    test("должен выбросить ошибку для неизвестных кодов", async () => {
      const error = {
        code: 500,
        message: "Internal Server Error",
      };
      mockCtx.answerCbQuery.mockRejectedValue(error);

      await expect(
        safeAnswerCallback(mockCtx, "Текст", 1)
      ).rejects.toThrow("Failed after 1 retries: Internal Server Error");

      expect(mockCtx.answerCbQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("Настройка количества попыток", () => {
    test("должен использовать дефолтное количество попыток (3)", async () => {
      const error = {
        code: 500,
        message: "Error",
      };
      mockCtx.answerCbQuery.mockRejectedValue(error);

      await expect(
        safeAnswerCallback(mockCtx, "Текст")
      ).rejects.toThrow("Failed after 3 retries: Error");

      expect(mockCtx.answerCbQuery).toHaveBeenCalledTimes(3);
    });
  });
});

