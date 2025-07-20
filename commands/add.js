const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");
const { safeTelegramCall } = require("../utils/telegramUtils");
const getPlayerStats = require("../database/getPlayerStats");

// Функция для проверки наличия эмодзи или Unicode-символов
const containsEmojiOrUnicode = (text) => {
  const emojiUnicodeRegex = /[\u{1F000}-\u{1FFFF}\u{2000}-\u{2FFF}\u{3000}-\u{3FFF}\u{FF00}-\u{FFFF}]/u;
  return emojiUnicodeRegex.test(text);
};

module.exports = (bot, GlobalState) => {
  bot.on("text", async (ctx) => {
    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const GROUP_ID = GlobalState.getGroupId();
    const ADMIN_ID = GlobalState.getAdminId();
    let isMatchStarted = GlobalState.getStart();
    let MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();

    // Формирование объекта user с учётом проверки username и name
    let userName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ");
    let userUsername = ctx.from.username ? `${ctx.from.username}` : null;

    // Проверка имени пользователя на эмодзи и Unicode-символы
    let nameToCheck = userUsername; // Сначала проверяем username
    let displayType = "username";

    if (!nameToCheck) {
      nameToCheck = userName; // Если username отсутствует, проверяем name
      displayType = "name";
    }

    if (!nameToCheck) {
      await ctx.deleteMessage().catch(() => {});
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        `⚠️ У вас не указан ник. Пожалуйста, установите нормальный ник в Telegram.`,
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 10000);
    }

    if (containsEmojiOrUnicode(nameToCheck)) {
      await ctx.deleteMessage().catch(() => {});
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        `⚠️ Недопустимые символы в ${displayType === "username" ? "username" : "имени"}.`,
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 10000);
    }

    // Если username валиден, проверяем name и при необходимости заменяем его
    if (userUsername && !containsEmojiOrUnicode(userUsername)) {
      if (userName && containsEmojiOrUnicode(userName)) {
        userName = userUsername; // Заменяем name на username
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
    let displayName = updatedUser.username ? `${updatedUser.name} (${updatedUser.username})` : updatedUser.name;

    // Проверка, состоит ли пользователь в группе
    let isMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(GROUP_ID, user.id);
      isMember = ["member", "administrator", "creator"].includes(
        chatMember.status
      );
    } catch (error) {
      console.error("Ошибка проверки членства в группе:", error);
    }

    if (ctx.message.text === "+") {
      await ctx.deleteMessage().catch(() => {});

      if (!isMember) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Чтобы записаться, вступите в группу!",
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
          // Применяем проверку для перемещённого игрока
          let movedName = movedPlayer.name;
          if (movedPlayer.username && !containsEmojiOrUnicode(movedPlayer.username)) {
            if (movedPlayer.name && containsEmojiOrUnicode(movedPlayer.name)) {
              movedName = movedPlayer.username;
            }
          }
          const updatedMovedPlayer = { ...movedPlayer, name: movedName };
          // Формируем displayName для перемещённого игрока
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
      for (let i = 1; i <= 2; i++) {
        const testUserCount = baseTestUserCount + i;
        let testUserName = `Test Player ${testUserCount}`;
        const testUserUsername = `TestPlayer${testUserCount}`;

        // Проверка тестового имени
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

        // Формируем displayName для тестового игрока
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
      } else {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Все тестовые игроки уже добавлены или нет места!",
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
    const GROUP_ID = GlobalState.getGroupId();
    // Проверка, состоит ли пользователь в группе
    let isMember = false;
    try {
      const chatMember = await ctx.telegram.getChatMember(GROUP_ID, ctx.from.id);
      isMember = ["member", "administrator", "creator"].includes(chatMember.status);
    } catch (error) {
      console.error("Ошибка проверки членства в группе:", error);
    }

    if (!isMember) {
      await ctx.answerCbQuery("⚠️ Чтобы записаться, вступите в группу!");
      return;
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
      await ctx.answerCbQuery(
        `⚠️ У вас не указан ник. Пожалуйста, установите нормальный ник в Telegram.`
      );
      return;
    }

    if (containsEmojiOrUnicode(nameToCheck)) {
      await ctx.answerCbQuery(
        `⚠️ Недопустимые символы в ${displayType === "username" ? "username" : "имени"}.`
      );
      return;
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
    let displayName = updatedUser.username ? `${updatedUser.name} (${updatedUser.username})` : updatedUser.name;

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
      await ctx.answerCbQuery("⚠️ Вы уже записаны!");
      return;
    }

    if (players.length < MAX_PLAYERS) {
      players.push(updatedUser);
      await ctx.answerCbQuery("✅ Вы добавлены в список!");
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
      await ctx.answerCbQuery("✅ Вы добавлены в очередь!");
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
  });

  bot.action("leave_match", async (ctx) => {
    let players = GlobalState.getPlayers();
    let queue = GlobalState.getQueue();
    const isTeamsDivided = GlobalState.getDivided();
    const ADMIN_ID = GlobalState.getAdminId();
    let isMatchStarted = GlobalState.getStart();

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
      await ctx.answerCbQuery(
        `⚠️ У вас не указан ник. Пожалуйста, установите нормальный ник в Telegram.`
      );
      return;
    }

    if (containsEmojiOrUnicode(nameToCheck)) {
      await ctx.answerCbQuery(
        `⚠️ Недопустимые символы в ${displayType === "username" ? "username" : "имени"}.`
      );
      return;
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
    let displayName = updatedUser.username ? `${updatedUser.name} (${updatedUser.username})` : updatedUser.name;

    if (!isMatchStarted) {
      await ctx.answerCbQuery("⚠️ Матч не начат!");
      return;
    }

    if (isTeamsDivided) {
      await ctx.answerCbQuery("⚽ Матч уже стартовал! Запись закрыта.");
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
        // Применяем проверку для перемещённого игрока
        let movedName = movedPlayer.name;
        if (movedPlayer.username && !containsEmojiOrUnicode(movedPlayer.username)) {
          if (movedPlayer.name && containsEmojiOrUnicode(movedPlayer.name)) {
            movedName = movedPlayer.username;
          }
        }
        const updatedMovedPlayer = { ...movedPlayer, name: movedName };
        // Формируем displayName для перемещённого игрока
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
      await ctx.answerCbQuery(`🚶 ${displayName}, вы вышли!`);
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
        await ctx.answerCbQuery(`🚶 ${displayName}, вы вышли!`);
      } else {
        await ctx.answerCbQuery("⚠️ Вы не в списке!");
      }
    }
  });
};