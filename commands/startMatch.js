const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");

module.exports = (bot, GlobalState) => {
  // Обработчик команды "s ДД.ММ.ГГГГ ЧЧ:ММ"
  bot.hears(/^s \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isTeamsDivided = GlobalState.getDivided();
    const isMatchStarted = GlobalState.getStart();
    const GROUP_ID = GlobalState.getGroupId();

    await ctx.deleteMessage().catch(() => {});

    // Проверяем, что команда отправлена в группе (chat.id < 0 для групп)
    if (ctx.chat.id > 0) {
      const message = await ctx.reply("Напиши в группу!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    // Проверяем, что сообщение отправлено в правильной группе
    if (ctx.chat.id !== GROUP_ID) {
      const message = await ctx.reply("⛔ Эта команда работает только в основной группе!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (isTeamsDivided) {
      const message = await ctx.reply("Игра уже идет!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (isMatchStarted) {
      const message = await ctx.reply("⛔ Матч уже запущен!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    const [, datePart, timePart] = ctx.message.text.match(/(\d{2}\.\d{2}\.\d{4}) (\d{2}:\d{2})/);
    const [day, month, year] = datePart.split(".").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    const collectionDate = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(collectionDate)) {
      const message = await ctx.reply("⚠️ Неверный формат даты!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    GlobalState.setCollectionDate(collectionDate);
    GlobalState.setPlayers([]);
    GlobalState.setQueue([]);
    GlobalState.setStart(true);
    GlobalState.setNotificationSent(false);

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

  // Обработчик команды "test"
  bot.hears(/^test$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isTeamsDivided = GlobalState.getDivided();
    const GROUP_ID = GlobalState.getGroupId(); // Предполагаем, что ID группы доступен
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    // Проверяем, что команда отправлена в группе (chat.id < 0 для групп)
    if (ctx.chat.id > 0) {
      const message = await ctx.reply("Напиши в группу!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    // Проверяем, что сообщение отправлено в правильной группе
    if (ctx.chat.id !== GROUP_ID) {
      const message = await ctx.reply("⛔ Эта команда работает только в основной группе!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (isTeamsDivided) {
      const message = await ctx.reply("Игра уже идет!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }


    if (isMatchStarted) {
      const message = await ctx.reply("⛔ Матч уже запущен!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    // Устанавливаем фиксированную дату 21.03.2026 19:00
    const collectionDate = new Date(2026, 2, 21, 19, 0); // Месяц 2, так как отсчет с 0 (март)

    GlobalState.setCollectionDate(collectionDate);
    GlobalState.setPlayers([]);
    GlobalState.setQueue([]);
    GlobalState.setStart(true);
    GlobalState.setNotificationSent(false);

    await sendPlayerList(ctx);

    const listMessageId = GlobalState.getListMessageId();
    if (listMessageId) {
      try {
        await ctx.telegram.pinChatMessage(ctx.chat.id, listMessageId);
      } catch (error) {
        console.error("Ошибка закрепления:", error);
      }
    }

    const message = await ctx.reply("✅ Тестовый матч запущен на 21.03.2026 19:00!");
    deleteMessageAfterDelay(ctx, message.message_id);
  });
};