const { safeTelegramCall } = require('./telegramUtils');

// Функция для удаления сообщения через заданную задержку
const deleteMessageAfterDelay = (ctx, messageId, delay = 4000) => {
  setTimeout(() => {
    // Пытаемся удалить сообщение, если оно еще существует
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (chatId && messageId) {
      safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]).catch(() => {
        // Игнорируем ошибки, если сообщение уже удалено
      });
    }
  }, delay);
};

module.exports = { deleteMessageAfterDelay };
