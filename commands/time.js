const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
const { checkTimeAndNotify } = require("../utils/checkTimeAndNotify");

module.exports = (bot, GlobalState) => {
  bot.hears(/^t \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    
    await ctx.deleteMessage().catch(() => {});

    if (!isMatchStarted) return;

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const userInput = ctx.message.text.trim().slice(2).trim();
    const [datePart, timePart] = userInput.split(" ");
    const [day, month, year] = datePart.split(".").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    const newDate = new Date(year, month - 1, day, hours, minutes);

    if (isNaN(newDate.getTime())) {
      const message = await ctx.reply(
        "⚠️ Неверный формат даты! Используй: t ДД.ММ.ГГГГ ЧЧ:ММ"
      );
      return deleteMessageAfterDelay(ctx, message.message_id, 2000);
    }

    // Обновляем дату сбора в глобальном состоянии
    GlobalState.setCollectionDate(newDate);

    // Сбрасываем флаг отправки уведомления
    GlobalState.setNotificationSent(false);

    const message = await ctx.reply(`✅ Время тренировки изменено на: ${userInput}`);
    deleteMessageAfterDelay(ctx, message.message_id, 2000);

    // Обновляем список игроков
    await sendPlayerList(ctx);

    // Запускаем проверку уведомлений
    checkTimeAndNotify(bot);
  });
};
