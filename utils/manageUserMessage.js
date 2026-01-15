const { safeTelegramCall } = require('./telegramUtils');

// Хранилище для таймеров и ID сообщений по пользователям
const userTableMessages = new Map(); // userId -> { chatId, messageId, timeoutId }
const userResultMessages = new Map(); // userId -> { chatId, messageId, timeoutId }

// Константа для времени удаления (5 минут)
const DELETE_DELAY = 5 * 60 * 1000; // 300000 мс

// Функция для удаления предыдущего сообщения и отмены таймера
const clearPreviousMessage = (messageMap, userId, ctx) => {
  const previous = messageMap.get(userId);
  if (previous) {
    // Отменяем таймер удаления
    if (previous.timeoutId) {
      clearTimeout(previous.timeoutId);
    }
    // Пытаемся удалить предыдущее сообщение
    if (previous.chatId && previous.messageId && ctx) {
      safeTelegramCall(ctx, 'deleteMessage', [previous.chatId, previous.messageId]).catch(() => {
        // Игнорируем ошибки удаления (сообщение может быть уже удалено)
      });
    }
    messageMap.delete(userId);
  }
};

// Функция для сохранения нового сообщения и установки таймера удаления
const saveMessageWithAutoDelete = (messageMap, userId, chatId, messageId, ctx) => {
  // Удаляем предыдущее сообщение, если оно есть
  clearPreviousMessage(messageMap, userId, ctx);

  // Устанавливаем таймер для удаления нового сообщения
  const timeoutId = setTimeout(() => {
    safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]).catch(() => {
      // Игнорируем ошибки удаления
    });
    messageMap.delete(userId);
  }, DELETE_DELAY);

  // Сохраняем информацию о новом сообщении
  messageMap.set(userId, { chatId, messageId, timeoutId });
};

// Функция для управления сообщениями таблицы
const manageTableMessage = (userId, chatId, messageId, ctx) => {
  saveMessageWithAutoDelete(userTableMessages, userId, chatId, messageId, ctx);
};

// Функция для управления сообщениями результатов
const manageResultMessage = (userId, chatId, messageId, ctx) => {
  saveMessageWithAutoDelete(userResultMessages, userId, chatId, messageId, ctx);
};

// Функция для обновления таймера существующего сообщения (при редактировании)
const updateMessageTimer = (messageMap, userId, chatId, messageId, ctx) => {
  const existing = messageMap.get(userId);
  if (existing && existing.chatId === chatId && existing.messageId === messageId) {
    // Отменяем старый таймер
    if (existing.timeoutId) {
      clearTimeout(existing.timeoutId);
    }
    // Устанавливаем новый таймер
    const timeoutId = setTimeout(() => {
      safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]).catch(() => {
        // Игнорируем ошибки удаления
      });
      messageMap.delete(userId);
    }, DELETE_DELAY);
    // Обновляем таймер в записи
    messageMap.set(userId, { chatId, messageId, timeoutId });
  } else {
    // Если сообщение не найдено или изменилось, создаем новую запись
    saveMessageWithAutoDelete(messageMap, userId, chatId, messageId, ctx);
  }
};

// Функция для получения предыдущего сообщения таблицы (для редактирования)
const getPreviousTableMessage = (userId) => {
  return userTableMessages.get(userId) || null;
};

// Функция для получения предыдущего сообщения результатов (для редактирования)
const getPreviousResultMessage = (userId) => {
  return userResultMessages.get(userId) || null;
};

// Функция для очистки всех сообщений пользователя (при необходимости)
const clearUserMessages = (userId, ctx) => {
  clearPreviousMessage(userTableMessages, userId, ctx);
  clearPreviousMessage(userResultMessages, userId, ctx);
};

// Функция для обновления таймера сообщения таблицы
const updateTableMessageTimer = (userId, chatId, messageId, ctx) => {
  updateMessageTimer(userTableMessages, userId, chatId, messageId, ctx);
};

// Функция для обновления таймера сообщения результатов
const updateResultMessageTimer = (userId, chatId, messageId, ctx) => {
  updateMessageTimer(userResultMessages, userId, chatId, messageId, ctx);
};

module.exports = {
  manageTableMessage,
  manageResultMessage,
  getPreviousTableMessage,
  getPreviousResultMessage,
  clearUserMessages,
  updateTableMessageTimer,
  updateResultMessageTimer,
  DELETE_DELAY,
};
