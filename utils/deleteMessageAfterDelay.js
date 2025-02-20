const deleteMessageAfterDelay = (ctx, messageId, delay = 2000) => {
  setTimeout(() => {
    ctx.telegram.deleteMessage(ctx.chat.id, messageId).catch(() => {});
  }, delay);
};

module.exports = { deleteMessageAfterDelay };