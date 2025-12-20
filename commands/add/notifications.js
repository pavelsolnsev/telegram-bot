const { safeTelegramCall } = require('../../utils/telegramUtils');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');

const notifyTeamFormation = async (ctx, bot, GlobalState) => {
  const location = GlobalState.getLocation();
  const players = GlobalState.getPlayers();
  const queue = GlobalState.getQueue();
  const groupId = GlobalState.getGroupId();

  const count = players.length;

  if (location === 'zalkz') {
    if (count === 16) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 2 команды (16 игроков)',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 24) {
      const queueLength = queue.length;
      if (queueLength < 6) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          groupId,
          `🏆 3 команды (24 игрока) собрались! Для открытия 4-й команды нужно еще минимум ${6 - queueLength} в очереди.`,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 60000);
      } else {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          groupId,
          '🏆 3 команды собрались и очередь уже полна для 4-й! Готовимся к 4 командам.',
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 60000);
      }
    } else if (count === 32) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 4 команды (32 игрока)',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    }
  } else {
    if (count === 10) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 2 команды (10 игроков)!',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 15) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 3 команды (15 игроков)!',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 20) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        groupId,
        '🏆 Собрано 4 команды (20 игроков)!',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    }
  }
};

module.exports = {
  notifyTeamFormation,
};
