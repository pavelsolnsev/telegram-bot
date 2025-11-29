const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");
const { safeTelegramCall } = require("../utils/telegramUtils");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");
const getPlayerStats = require("../database/getPlayerStats");
const getPlayerByName = require("../database/getPlayerByName");

// Функция для проверки наличия эмодзи или Unicode-символов
const containsEmojiOrUnicode = (text) => {
  const emojiUnicodeRegex = /[\u{1F000}-\u{1FFFF}\u{2000}-\u{2FFF}\u{3000}-\u{3FFF}\u{FF00}-\u{FFFF}]/u;
  return emojiUnicodeRegex.test(text);
};

// Функция для проверки и создания объекта пользователя
const validateAndCreateUser = async (ctx, GlobalState) => {
  const GROUP_ID = GlobalState.getGroupId();
  const ADMIN_ID = GlobalState.getAdminId();

  // Проверка, состоит ли пользователь в группе
  let isMember = false;
  try {
    const chatMember = await ctx.telegram.getChatMember(GROUP_ID, ctx.from.id);
    isMember = ["member", "administrator", "creator"].includes(chatMember.status);
  } catch (error) {
    console.error("Ошибка проверки членства в группе:", error);
  }

  if (!isMember) {
    return { error: "⚠️ Чтобы записаться, вступите в группу!" };
  }

  // Формирование объекта user с учётом проверки username и name
  let userName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ");
  let userUsername = ctx.from.username ? `${ctx.from.username}` : null;

  // Проверка имени пользователя на эмодзи и Unicode-символы
  let nameToCheck = userUsername;
  let displayType = "username";

  if (!nameToCheck) {
    nameToCheck = userName;
    displayType = "name";
  }

  if (!nameToCheck) {
    return { error: `⚠️ У вас не указан ник. Пожалуйста, установите нормальный ник в Telegram.` };
  }

  if (containsEmojiOrUnicode(nameToCheck)) {
    return { error: `⚠️ Недопустимые символы в ${displayType === "username" ? "username" : "имени"}.` };
  }

  // Если username валиден, проверяем name и при необходимости заменяем его
  if (userUsername && !containsEmojiOrUnicode(userUsername)) {
    if (userName && containsEmojiOrUnicode(userName)) {
      userName = userUsername;
    }
  }

  const user = {
    id: ctx.from.id,
    name: userName,
    username: userUsername,
    goals: 0,
    gamesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    rating: 0,
  };

  const [updatedUser] = await getPlayerStats([user]);
  const isAdmin = ADMIN_ID.includes(updatedUser.id);
  // Формируем displayName как name и username в скобках, если username существует
  const displayName = updatedUser.username ? `${updatedUser.name} (${updatedUser.username})` : updatedUser.name;

  return { user: updatedUser, isAdmin, displayName };
};

const notifyTeamFormation = async (ctx, bot, GlobalState) => {
  const location = GlobalState.getLocation();
  const players = GlobalState.getPlayers();
  const queue = GlobalState.getQueue();
  const groupId = GlobalState.getGroupId();

  const count = players.length;

  if (location === "zalkz") {
    if (count === 16) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        groupId,
        "🏆 Собрано 2 команды (16 игроков)",
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 24) {
      const queueLength = queue.length;
      if (queueLength < 6) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          groupId,
          `🏆 3 команды (24 игрока) собрались! Для открытия 4-й команды нужно еще минимум ${6 - queueLength} в очереди.`,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 60000);
      } else {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          groupId,
          `🏆 3 команды собрались и очередь уже полна для 4-й! Готовимся к 4 командам.`,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 60000);
      }
    } else if (count === 32) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        groupId,
        "🏆 Собрано 4 команды (32 игрока)",
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    }
  } else {
    if (count === 10) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        groupId,
        "🏆 Собрано 2 команды (10 игроков)!",
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 15) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        groupId,
        "🏆 Собрано 3 команды (15 игроков)!",
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    } else if (count === 20) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        groupId,
        "🏆 Собрано 4 команды (20 игроков)!",
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
    }
  }
};

module.exports = (bot, GlobalState) => {
  bot.on("text", async (ctx) => {
    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const ADMIN_ID = GlobalState.getAdminId();
    let isMatchStarted = GlobalState.getStart();
    let MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();

    const validationResult = await validateAndCreateUser(ctx, GlobalState);
    if (validationResult.error) {
      await ctx.deleteMessage().catch(() => {});
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        validationResult.error,
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 10000);
    }

    const { user: updatedUser, isAdmin, displayName } = validationResult;

    if (ctx.message.text === "+") {
      await ctx.deleteMessage().catch(() => {});

      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Матч не начат!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (isTeamsDivided) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚽ <b>Матч уже стартовал!</b> Запись закрыта.",
          { parse_mode: "HTML" },
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      const isInList =
        players.some((p) => p.id === updatedUser.id) ||
        queue.some((p) => p.id === updatedUser.id);
      if (isInList) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Вы уже записаны!",
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
              `➕ Игрок ${displayName} записался в основной состав`
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
              `➕ Игрок ${displayName} записался в очередь`
            );
          }
        }
      }
      await sendPlayerList(ctx);
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        `✅ ${displayName} добавлен!`,
      ]);
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
      await notifyTeamFormation(ctx, bot, GlobalState);
    } else if (ctx.message.text === "-") {
      await ctx.deleteMessage().catch(() => {});
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Матч не начат!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (isTeamsDivided) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚽ <b>Матч уже стартовал!</b> Запись закрыта.",
          { parse_mode: "HTML" },
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
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
              `➖ Игрок ${displayName} вышел из основного состава`
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
            "🎉 Вы в основном составе!"
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
                `🔄 Игрок ${movedDisplayName} перемещен из очереди в основной состав`
              );
            }
          }
        }
        await sendPlayerList(ctx);
        const message = await safeTelegramCall(ctx, "sendMessage", [
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
                `➖ Игрок ${displayName} вышел из очереди`
              );
            }
          }
          await sendPlayerList(ctx);
          const message = await safeTelegramCall(ctx, "sendMessage", [
            ctx.chat.id,
            `🚶 ${displayName} вышел!`,
          ]);
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
          await notifyTeamFormation(ctx, bot, GlobalState);
        } else {
          const message = await safeTelegramCall(ctx, "sendMessage", [
            ctx.chat.id,
            "⚠️ Вы не в списке!",
          ]);
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
    } else if (ctx.message.text === "+1test") {
      await ctx.deleteMessage().catch(() => {});
      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⛔ У вас нет прав для этой команды!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Матч не начат!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      const addedPlayers = [];
      const baseTestUserCount = players.length + queue.length;
      for (let i = 1; i <= 10; i++) {
        const testUserCount = baseTestUserCount + i;
        let testUserName = `Test Player ${testUserCount}`;
        const testUserUsername = `TestPlayer${testUserCount}`;

        if (!containsEmojiOrUnicode(testUserUsername)) {
          if (containsEmojiOrUnicode(testUserName)) {
            testUserName = testUserUsername;
          }
        }

        const testUser = {
          id: 100000 + testUserCount,
          name: testUserName,
          username: testUserUsername,
          goals: 0,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          rating: 0,
        };

        const [updatedTestUser] = await getPlayerStats([testUser]);
        const isInList =
          players.some((p) => p.id === updatedTestUser.id) ||
          queue.some((p) => p.id === updatedTestUser.id);
        if (isInList) continue;

        const testDisplayName = updatedTestUser.username ? `${updatedTestUser.name} (${updatedTestUser.username})` : updatedTestUser.name;

        if (players.length < MAX_PLAYERS) {
          players.push(updatedTestUser);
          addedPlayers.push(`${testDisplayName} (в список игроков)`);
        } else {
          queue.push(updatedTestUser);
          addedPlayers.push(`${testDisplayName} (в очередь)`);
        }
      }

      if (addedPlayers.length > 0) {
        const messageText = `✅ Добавлены тестовые игроки:\n${addedPlayers.join("\n")}`;
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          messageText,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
        await sendPlayerList(ctx);
        await notifyTeamFormation(ctx, bot, GlobalState);
      } else {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Все тестовые игроки уже добавлены или нет места!",
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    } else if (ctx.message.text.startsWith("+add ")) {
      await ctx.deleteMessage().catch(() => {});
      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⛔ У вас нет прав для этой команды!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Матч не начат!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      if (isTeamsDivided) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚽ <b>Матч уже стартовал!</b> Запись закрыта.",
          { parse_mode: "HTML" },
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Извлекаем имя игрока из команды
      const playerName = ctx.message.text.substring(5).trim(); // "+add " = 5 символов
      
      if (!playerName) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Укажите имя игрока! Использование: +add <имя>",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Проверка на эмодзи и Unicode-символы
      if (containsEmojiOrUnicode(playerName)) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Недопустимые символы в имени игрока.",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      try {
        // Получаем или создаем игрока по имени
        const playerData = await getPlayerByName(playerName);
        
        const newPlayer = {
          id: playerData.id,
          name: playerData.name || playerData.username,
          username: playerData.username || playerData.name,
          goals: 0,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          rating: 0,
        };

        // Получаем статистику игрока из базы данных
        const [updatedPlayer] = await getPlayerStats([newPlayer]);
        
        // Обновляем username, если он был изменен в базе данных
        updatedPlayer.username = updatedPlayer.username || updatedPlayer.name || playerName;
        updatedPlayer.name = updatedPlayer.name || updatedPlayer.username || playerName;
        
        // Проверяем, не добавлен ли уже игрок
        const isInList =
          players.some((p) => p.id === updatedPlayer.id) ||
          queue.some((p) => p.id === updatedPlayer.id);
        
        if (isInList) {
          const displayName = updatedPlayer.username || updatedPlayer.name;
          const message = await safeTelegramCall(ctx, "sendMessage", [
            ctx.chat.id,
            `⚠️ Игрок ${displayName} уже в списке!`,
          ]);
          return deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }

        const displayName = updatedPlayer.username || updatedPlayer.name;

        // Добавляем игрока в список или очередь
        if (players.length < MAX_PLAYERS) {
          players.push(updatedPlayer);
          const message = await safeTelegramCall(ctx, "sendMessage", [
            ctx.chat.id,
            `✅ Игрок ${displayName} добавлен в основной состав!`,
          ]);
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        } else {
          queue.push(updatedPlayer);
          const message = await safeTelegramCall(ctx, "sendMessage", [
            ctx.chat.id,
            `✅ Игрок ${displayName} добавлен в очередь!`,
          ]);
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }

        await sendPlayerList(ctx);
        await notifyTeamFormation(ctx, bot, GlobalState);
      } catch (error) {
        console.error("Ошибка при добавлении игрока по имени:", error);
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "❌ Ошибка при добавлении игрока. Попробуйте позже.",
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    }
  });

  bot.action("join_match", async (ctx) => {
    let players = GlobalState.getPlayers();
    let queue = GlobalState.getQueue();
    let MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();
    const ADMIN_ID = GlobalState.getAdminId();

    const validationResult = await validateAndCreateUser(ctx, GlobalState);
    if (validationResult.error) {
      await safeAnswerCallback(ctx, validationResult.error);
      return;
    }

    const { user: updatedUser, isAdmin, displayName } = validationResult;

    if (isTeamsDivided) {
      await safeAnswerCallback(ctx, "⚽ Матч уже стартовал! Запись закрыта.");
      return;
    }

    const isInList =
      players.some((p) => p.id === updatedUser.id) ||
      queue.some((p) => p.id === updatedUser.id);

    if (isInList) {
      await safeAnswerCallback(ctx, "⚠️ Вы уже записаны!");
      return;
    }

    if (players.length < MAX_PLAYERS) {
      players.push(updatedUser);
      await safeAnswerCallback(ctx, "✅ Вы добавлены в список!");
      if (!isAdmin) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `➕ Игрок ${displayName} записался в основной состав через кнопку`
          );
        }
      }
    } else {
      queue.push(updatedUser);
      await safeAnswerCallback(ctx, "✅ Вы добавлены в очередь!");
      if (!isAdmin) {
        for (const adminId of ADMIN_ID) {
          if (isNaN(adminId) || adminId <= 0) {
            console.warn(`Некорректный adminId: ${adminId}`);
            continue;
          }
          await sendPrivateMessage(
            bot,
            adminId,
            `➕ Игрок ${displayName} записался в очередь через кнопку`
          );
        }
      }
    }

    await sendPlayerList(ctx);
    await notifyTeamFormation(ctx, bot, GlobalState);
  });

  bot.action("leave_match", async (ctx) => {
    let players = GlobalState.getPlayers();
    let queue = GlobalState.getQueue();
    const isTeamsDivided = GlobalState.getDivided();
    const ADMIN_ID = GlobalState.getAdminId();
    let isMatchStarted = GlobalState.getStart();

    const validationResult = await validateAndCreateUser(ctx, GlobalState);
    if (validationResult.error) {
      await safeAnswerCallback(ctx, validationResult.error);
      return;
    }

    const { user: updatedUser, isAdmin, displayName } = validationResult;

    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, "⚠️ Матч не начат!");
      return;
    }

    if (isTeamsDivided) {
      await safeAnswerCallback(ctx, "⚽ Матч уже стартовал! Запись закрыта.");
      return;
    }

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
            `➖ Игрок ${displayName} вышел из основного состава через кнопку`
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
          "🎉 Вы в основном составе!"
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
              `🔄 Игрок ${movedDisplayName} перемещен из очереди в основной состав`
            );
          }
        }
      }
      await sendPlayerList(ctx);
      const message = await safeTelegramCall(ctx, "sendMessage", [
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
              `➖ Игрок ${displayName} вышел из очереди через кнопку`
            );
          }
        }
        await sendPlayerList(ctx);
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          `🚶 ${displayName} вышел!`,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
        await safeAnswerCallback(ctx, `🚶 ${displayName}, вы вышли!`);
        await notifyTeamFormation(ctx, bot, GlobalState);
      } else {
        await safeAnswerCallback(ctx, "⚠️ Вы не в списке!");
      }
    }
  });
};