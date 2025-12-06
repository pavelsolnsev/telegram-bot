const { deleteMessageAfterDelay } = require("../../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../../utils/telegramUtils");

jest.mock("../../utils/telegramUtils");

describe("deleteMessageAfterDelay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    safeTelegramCall.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("должен удалить сообщение после задержки", () => {
    const mockCtx = {
      chat: { id: 123 },
    };
    const messageId = 456;
    const delay = 1000;

    deleteMessageAfterDelay(mockCtx, messageId, delay);

    expect(safeTelegramCall).not.toHaveBeenCalled();

    jest.advanceTimersByTime(delay);

    expect(safeTelegramCall).toHaveBeenCalledWith(
      mockCtx,
      "deleteMessage",
      [123, 456]
    );
  });

  test("должен использовать chatId из callbackQuery если доступен", () => {
    const mockCtx = {
      callbackQuery: {
        message: {
          chat: { id: 789 },
        },
      },
      chat: { id: 123 },
    };
    const messageId = 456;

    deleteMessageAfterDelay(mockCtx, messageId, 1000);

    jest.advanceTimersByTime(1000);

    expect(safeTelegramCall).toHaveBeenCalledWith(
      mockCtx,
      "deleteMessage",
      [789, 456]
    );
  });

  test("должен использовать дефолтную задержку 4000ms", () => {
    const mockCtx = {
      chat: { id: 123 },
    };
    const messageId = 456;

    deleteMessageAfterDelay(mockCtx, messageId);

    jest.advanceTimersByTime(4000);

    expect(safeTelegramCall).toHaveBeenCalled();
  });

  test("не должен удалять сообщение если нет chatId", () => {
    const mockCtx = {};
    const messageId = 456;

    deleteMessageAfterDelay(mockCtx, messageId, 1000);

    jest.advanceTimersByTime(1000);

    expect(safeTelegramCall).not.toHaveBeenCalled();
  });

  test("не должен удалять сообщение если нет messageId", () => {
    const mockCtx = {
      chat: { id: 123 },
    };

    deleteMessageAfterDelay(mockCtx, null, 1000);

    jest.advanceTimersByTime(1000);

    expect(safeTelegramCall).not.toHaveBeenCalled();
  });

  test("должен игнорировать ошибки при удалении", () => {
    const mockCtx = {
      chat: { id: 123 },
    };
    const messageId = 456;

    safeTelegramCall.mockRejectedValue(new Error("Message not found"));

    deleteMessageAfterDelay(mockCtx, messageId, 1000);

    jest.advanceTimersByTime(1000);

    expect(safeTelegramCall).toHaveBeenCalled();
    // Не должно быть выброшено исключение
  });
});

