const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList, locations } = require("../utils/sendPlayerList");

module.exports = (bot, GlobalState) => {
  // Обработчик команды "s ДД.ММ.ГГГГ ЧЧ:ММ [prof|kz|saturn|tr]"
  bot.hears(/^s \d{2}\.\d{2}\.\d{4} \d{2}:\d{2} (prof|kz|saturn|tr)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isTeamsDivided = GlobalState.getDivided();
    const isMatchStarted = GlobalState.getStart();

    await ctx.deleteMessage().catch(() => {});

    if (ctx.chat.id > 0) {
      const message = await ctx.reply("Напиши в группу!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (isTeamsDivided) {
      const message = await ctx.reply("Матч уже стартовал! Запись закрыта.");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (isMatchStarted) {
      const message = await ctx.reply("⛔ Матч уже запущен!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const [, datePart, timePart, location] = ctx.message.text.match(
      /(\d{2}\.\d{2}\.\d{4}) (\d{2}:\d{2}) (prof|kz|saturn|tr)/i
    );
    const [day, month, year] = datePart.split(".").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    const collectionDate = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(collectionDate)) {
      const message = await ctx.reply("⚠️ Неверный формат даты!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    GlobalState.setCollectionDate(collectionDate);
    GlobalState.setPlayers([]);
    GlobalState.setQueue([]);
    GlobalState.setStart(true);
    GlobalState.setNotificationSent(false);
    GlobalState.setLocation(location.toLowerCase());
    GlobalState.setMaxPlayers(locations[location.toLowerCase()].limit);
    GlobalState.clearMatchResults();
    await sendPlayerList(ctx);

    const listMessageId = GlobalState.getListMessageId();
    if (listMessageId) {
      try {
        await ctx.telegram.pinChatMessage(ctx.chat.id, listMessageId);
      } catch (error) {
        console.error("Ошибка закрепления:", error);
      }
    }
  });

  // Обработчик команды "test [prof|kz|saturn|tr]"
  bot.hears(/^test (prof|kz|saturn|tr)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isTeamsDivided = GlobalState.getDivided();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (ctx.chat.id > 0) {
      const message = await ctx.reply("Напиши в группу!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (isTeamsDivided) {
      const message = await ctx.reply("Игра уже идет!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (isMatchStarted) {
      const message = await ctx.reply("⛔ Матч уже запущен!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const [, location] = ctx.message.text.match(/test (prof|kz|saturn|tr)/i);

    const collectionDate = new Date(2026, 2, 21, 19, 0);

    GlobalState.setCollectionDate(collectionDate);
    GlobalState.setPlayers([]);
    GlobalState.setQueue([]);
    GlobalState.setStart(true);
    GlobalState.setNotificationSent(false);
    GlobalState.setLocation(location.toLowerCase());
    GlobalState.setMaxPlayers(locations[location.toLowerCase()].limit);
    GlobalState.clearMatchResults();
    await sendPlayerList(ctx);

    const listMessageId = GlobalState.getListMessageId();
    if (listMessageId) {
      try {
        await ctx.telegram.pinChatMessage(ctx.chat.id, listMessageId);
      } catch (error) {
        console.error("Ошибка закрепления:", error);
      }
    }

    const loc = locations[location.toLowerCase()];
    const message = await ctx.reply(
      `✅ Тестовый матч запущен на 21.03.2026 19:00 (${loc.name})!`
    );
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });
};
