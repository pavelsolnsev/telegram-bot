// Функция для удаления сообщения через заданную задержку
const deleteMessageAfterDelay = (ctx, messageId, delay = 3000) => {
  setTimeout(() => {
    // Пытаемся удалить сообщение, если оно еще существует
    ctx.telegram.deleteMessage(ctx.chat.id, messageId).catch(() => {});
  }, delay);
};

module.exports = { deleteMessageAfterDelay };
