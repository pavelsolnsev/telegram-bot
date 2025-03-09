const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");
const { safeTelegramCall } = require("../utils/telegramUtils");
const getPlayerStats = require("../database/getPlayerStats");

module.exports = (bot, GlobalState) => {
  bot.on("text", async (ctx) => {
    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const GROUP_ID = GlobalState.getGroupId();
    const ADMIN_ID = GlobalState.getAdminId();
    let isMatchStarted = GlobalState.getStart();
    let MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();

    if (ctx.chat.id !== GROUP_ID) return;

    const user = {
      id: ctx.from.id,
      name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "),
      username: ctx.from.username ? `@${ctx.from.username}` : null,
      goals: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      rating: 0,
    };

    const [updatedUser] = await getPlayerStats([user]);

    if (ctx.message.text === "+") {
      await ctx.deleteMessage().catch(() => {});
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Матч не начат!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id);
      }
      if (isTeamsDivided) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚽ <b>Матч уже стартовал!</b> Запись закрыта.",
          { parse_mode: "HTML" },
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id);
      }
      const isInList = players.some((p) => p.id === updatedUser.id) || queue.some((p) => p.id === updatedUser.id);
      if (isInList) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Вы уже записаны!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id);
      }
      if (players.length < MAX_PLAYERS) {
        players.push(updatedUser);
      } else {
        queue.push(updatedUser);
      }
      await sendPlayerList(ctx);
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        `✅ ${updatedUser.name} добавлен!`,
      ]);
      deleteMessageAfterDelay(ctx, message.message_id);

    } else if (ctx.message.text === "-") {
      await ctx.deleteMessage().catch(() => {});
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Матч не начат!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id);
      }
      if (isTeamsDivided) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚽ <b>Матч уже стартовал!</b> Запись закрыта.",
          { parse_mode: "HTML" },
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id);
      }
      const playerIndex = players.findIndex((p) => p.id === updatedUser.id);
      if (playerIndex !== -1) {
        players.splice(playerIndex, 1);
        if (queue.length > 0) {
          const movedPlayer = queue.shift();
          players.push(movedPlayer);
          sendPrivateMessage(bot, movedPlayer.id, "🎉 Вы в основном составе!");
        }
        await sendPlayerList(ctx);
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          `✅ ${updatedUser.name} удален!`,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id);
      } else {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Вы не в списке!",
        ]);
        deleteMessageAfterDelay(ctx, message.message_id);
      }

    } else if (ctx.message.text === "+1") {
      await ctx.deleteMessage().catch(() => {});
      if (ctx.from.id !== ADMIN_ID) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⛔ У вас нет прав для этой команды!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id);
      }
      if (!isMatchStarted) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Матч не начат!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id);
      }

      const addedPlayers = [];
      const baseTestUserCount = players.length + queue.length;
      for (let i = 1; i <= 16; i++) {
        const testUserCount = baseTestUserCount + i;
        const testUser = {
          id: 100000 + testUserCount,
          name: `Test Player ${testUserCount}`,
          username: `@TestPlayer${testUserCount}`,
          goals: 0,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          rating: 0,
        };

        const [updatedTestUser] = await getPlayerStats([testUser]);
        const isInList = players.some((p) => p.id === updatedTestUser.id) || queue.some((p) => p.id === updatedTestUser.id);
        if (isInList) continue;

        if (players.length < MAX_PLAYERS) {
          players.push(updatedTestUser);
          addedPlayers.push(updatedTestUser.name + " (в список игроков)");
        } else {
          queue.push(updatedTestUser);
          addedPlayers.push(updatedTestUser.name + " (в очередь)");
        }
      }

      if (addedPlayers.length > 0) {
        const messageText = `✅ Добавлены тестовые игроки:\n${addedPlayers.join("\n")}`;
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          messageText,
        ]);
        deleteMessageAfterDelay(ctx, message.message_id);
        await sendPlayerList(ctx);
      } else {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⚠️ Все тестовые игроки уже добавлены или нет места!",
        ]);
        deleteMessageAfterDelay(ctx, message.message_id);
      }
    }
  });

  bot.action("join_match", async (ctx) => {
    let players = GlobalState.getPlayers();
    let queue = GlobalState.getQueue();
    let MAX_PLAYERS = GlobalState.getMaxPlayers();
    const isTeamsDivided = GlobalState.getDivided();

    if (isTeamsDivided) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚽ <b>Матч уже стартовал!</b> Запись закрыта.",
        { parse_mode: "HTML" },
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const user = {
      id: ctx.from.id,
      name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "),
      username: ctx.from.username ? `@${ctx.from.username}` : null,
      goals: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      rating: 0,
    };

    const [updatedUser] = await getPlayerStats([user]);
    const isInList = players.some((p) => p.id === updatedUser.id) || queue.some((p) => p.id === updatedUser.id);

    if (isInList) {
      await ctx.answerCbQuery("⚠️ Вы уже записаны!");
      return;
    }

    if (players.length < MAX_PLAYERS) {
      players.push(updatedUser);
      await ctx.answerCbQuery("✅ Вы добавлены в список!");
    } else {
      queue.push(updatedUser);
      await ctx.answerCbQuery("✅ Вы добавлены в очередь!");
    }

    await sendPlayerList(ctx);
  });
};