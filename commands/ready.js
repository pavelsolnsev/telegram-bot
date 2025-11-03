// ready.js
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");

module.exports = (bot, GlobalState) => {
  bot.hears(/^rdy$/i, async (ctx) => {
    // Только личные сообщения
    if (ctx.chat.type !== "private") return;

    // Только админ
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      const msg = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    // Удаляем сообщение-команду
    await ctx.deleteMessage().catch(() => {});
    // Разрешаем таблицу
    GlobalState.setIsTableAllowed(true);

    // Отправляем уведомление в группу
    const groupId = GlobalState.getGroupId();
    const text =
      "Составы команд готовы! Чтобы их просмотреть, отправьте команду <b>«таблица»</b> в личные сообщения " +
      '<a href="http://t.me/football_ramen_bot">боту</a>.\n\n' +
      "Для просмотра истории сыгранных матчей используйте команду <b>«результаты»</b>.";

    await ctx.telegram.sendMessage(groupId, text, { parse_mode: "HTML" });

    // Подтверждение в ЛС
    const confirm = await ctx.reply(
      "✅ Составы объявлены — команда <b>«таблица»</b> теперь доступна в группе."
    );
    return deleteMessageAfterDelay(ctx, confirm.message_id);
  });
};
