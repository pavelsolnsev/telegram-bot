const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { sendPlayerList } = require('../../utils/sendPlayerList');
const { sendPrivateMessage } = require('../../message/sendPrivateMessage');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const { containsEmojiOrUnicode } = require('./validation');
const { notifyTeamFormation } = require('./notifications');

// Добавление игрока в список или очередь
const addPlayer = async (ctx, bot, GlobalState, updatedUser, isAdmin, displayName) => {
  const players = GlobalState.getPlayers();
  const queue = GlobalState.getQueue();
  const ADMIN_ID = GlobalState.getAdminId();
  const MAX_PLAYERS = GlobalState.getMaxPlayers();

  const isInList =
    players.some((p) => p.id === updatedUser.id) ||
    queue.some((p) => p.id === updatedUser.id);
  if (isInList) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Вы уже записаны!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }
  if (players.length < MAX_PLAYERS) {
    players.push(updatedUser);
    if (!isAdmin) {
      for (const adminId of ADMIN_ID) {
        if (isNaN(adminId) || adminId <= 0) {
          console.warn(`Некорректный adminId: ${adminId}`);
          continue;
        }
        await sendPrivateMessage(
          bot,
          adminId,
          `➕ Игрок ${displayName} записался в основной состав`,
        );
      }
    }
  } else {
    queue.push(updatedUser);
    if (!isAdmin) {
      for (const adminId of ADMIN_ID) {
        if (isNaN(adminId) || adminId <= 0) {
          console.warn(`Некорректный adminId: ${adminId}`);
          continue;
        }
        await sendPrivateMessage(
          bot,
          adminId,
          `➕ Игрок ${displayName} записался в очередь`,
        );
      }
    }
  }
  await sendPlayerList(ctx);
  const message = await safeTelegramCall(ctx, 'sendMessage', [
    ctx.chat.id,
    `✅ ${displayName} добавлен!`,
  ]);
  deleteMessageAfterDelay(ctx, message.message_id, 6000);
  await notifyTeamFormation(ctx, bot, GlobalState);
};

// Удаление игрока из списка или очереди
const removePlayer = async (ctx, bot, GlobalState, updatedUser, isAdmin, displayName) => {
  const players = GlobalState.getPlayers();
  const queue = GlobalState.getQueue();
  const ADMIN_ID = GlobalState.getAdminId();

  const playerIndex = players.findIndex((p) => p.id === updatedUser.id);
  if (playerIndex !== -1) {
    players.splice(playerIndex, 1);
    if (!isAdmin) {
      for (const adminId of ADMIN_ID) {
        if (isNaN(adminId) || adminId <= 0) {
          console.warn(`Некорректный adminId: ${adminId}`);
          continue;
        }
        await sendPrivateMessage(
          bot,
          adminId,
          `➖ Игрок ${displayName} вышел из основного состава`,
        );
      }
    }
    if (queue.length > 0) {
      const movedPlayer = queue.shift();
      let movedName = movedPlayer.name;
      if (movedPlayer.username && !containsEmojiOrUnicode(movedPlayer.username)) {
        if (movedPlayer.name && containsEmojiOrUnicode(movedPlayer.name)) {
          movedName = movedPlayer.username;
        }
      }
      const updatedMovedPlayer = { ...movedPlayer, name: movedName };
      const movedDisplayName = updatedMovedPlayer.username ? `${updatedMovedPlayer.name} (${updatedMovedPlayer.username})` : updatedMovedPlayer.name;
      players.push(updatedMovedPlayer);
      await sendPrivateMessage(
        bot,
        updatedMovedPlayer.id,
        '🎉 Вы в основном составе!',
      );
      if (!ADMIN_ID.includes(updatedMovedPlayer.id)) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `🔄 Игрок ${movedDisplayName} перемещен из очереди в основной состав`,
          );
        }
      }
    }
    await sendPlayerList(ctx);
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `🚶 ${displayName} вышел!`,
    ]);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
    await notifyTeamFormation(ctx, bot, GlobalState);
  } else {
    const queueIndex = queue.findIndex((p) => p.id === updatedUser.id);
    if (queueIndex !== -1) {
      queue.splice(queueIndex, 1);
      if (!isAdmin) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `➖ Игрок ${displayName} вышел из очереди`,
          );
        }
      }
      await sendPlayerList(ctx);
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        `🚶 ${displayName} вышел!`,
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
      await notifyTeamFormation(ctx, bot, GlobalState);
    } else {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Вы не в списке!',
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  }
};

// Добавление игрока через кнопку
const addPlayerByButton = async (ctx, bot, GlobalState, updatedUser, isAdmin, displayName) => {
  const players = GlobalState.getPlayers();
  const queue = GlobalState.getQueue();
  const ADMIN_ID = GlobalState.getAdminId();
  const MAX_PLAYERS = GlobalState.getMaxPlayers();

  const isInList =
    players.some((p) => p.id === updatedUser.id) ||
    queue.some((p) => p.id === updatedUser.id);

  if (isInList) {
    await safeAnswerCallback(ctx, '⚠️ Вы уже записаны!');
    return;
  }

  if (players.length < MAX_PLAYERS) {
    players.push(updatedUser);
    await safeAnswerCallback(ctx, '✅ Вы добавлены в список!');
    if (!isAdmin) {
      for (const adminId of ADMIN_ID) {
        if (isNaN(adminId) || adminId <= 0) {
          console.warn(`Некорректный adminId: ${adminId}`);
          continue;
        }
        await sendPrivateMessage(
          bot,
          adminId,
          `➕ Игрок ${displayName} записался в основной состав через кнопку`,
        );
      }
    }
  } else {
    queue.push(updatedUser);
    await safeAnswerCallback(ctx, '✅ Вы добавлены в очередь!');
    if (!isAdmin) {
      for (const adminId of ADMIN_ID) {
        if (isNaN(adminId) || adminId <= 0) {
          console.warn(`Некорректный adminId: ${adminId}`);
          continue;
        }
        await sendPrivateMessage(
          bot,
          adminId,
          `➕ Игрок ${displayName} записался в очередь через кнопку`,
        );
      }
    }
  }

  await sendPlayerList(ctx);
  await notifyTeamFormation(ctx, bot, GlobalState);
};

// Удаление игрока через кнопку
const removePlayerByButton = async (ctx, bot, GlobalState, updatedUser, isAdmin, displayName) => {
  const players = GlobalState.getPlayers();
  const queue = GlobalState.getQueue();
  const ADMIN_ID = GlobalState.getAdminId();

  const playerIndex = players.findIndex((p) => p.id === updatedUser.id);
  if (playerIndex !== -1) {
    players.splice(playerIndex, 1);
    if (!isAdmin) {
      for (const adminId of ADMIN_ID) {
        if (isNaN(adminId) || adminId <= 0) {
          console.warn(`Некорректный adminId: ${adminId}`);
          continue;
        }
        await sendPrivateMessage(
          bot,
          adminId,
          `➖ Игрок ${displayName} вышел из основного состава через кнопку`,
        );
      }
    }
    if (queue.length > 0) {
      const movedPlayer = queue.shift();
      let movedName = movedPlayer.name;
      if (movedPlayer.username && !containsEmojiOrUnicode(movedPlayer.username)) {
        if (movedPlayer.name && containsEmojiOrUnicode(movedPlayer.name)) {
          movedName = movedPlayer.username;
        }
      }
      const updatedMovedPlayer = { ...movedPlayer, name: movedName };
      const movedDisplayName = updatedMovedPlayer.username ? `${updatedMovedPlayer.name} (${updatedMovedPlayer.username})` : updatedMovedPlayer.name;
      players.push(updatedMovedPlayer);
      await sendPrivateMessage(
        bot,
        updatedMovedPlayer.id,
        '🎉 Вы в основном составе!',
      );
      if (!ADMIN_ID.includes(updatedMovedPlayer.id)) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `🔄 Игрок ${movedDisplayName} перемещен из очереди в основной состав`,
          );
        }
      }
    }
    await sendPlayerList(ctx);
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `🚶 ${displayName} вышел!`,
    ]);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
    await safeAnswerCallback(ctx, `🚶 ${displayName}, вы вышли!`);
    await notifyTeamFormation(ctx, bot, GlobalState);
  } else {
    const queueIndex = queue.findIndex((p) => p.id === updatedUser.id);
    if (queueIndex !== -1) {
      queue.splice(queueIndex, 1);
      if (!isAdmin) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `➖ Игрок ${displayName} вышел из очереди через кнопку`,
          );
        }
      }
      await sendPlayerList(ctx);
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        `🚶 ${displayName} вышел!`,
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
      await safeAnswerCallback(ctx, `🚶 ${displayName}, вы вышли!`);
      await notifyTeamFormation(ctx, bot, GlobalState);
    } else {
      await safeAnswerCallback(ctx, '⚠️ Вы не в списке!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Вы не в списке!',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    }
  }
};

module.exports = {
  addPlayer,
  removePlayer,
  addPlayerByButton,
  removePlayerByButton,
};
