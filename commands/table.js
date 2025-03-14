const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");

module.exports = (bot, GlobalState) => {
  bot.hears(/^tbl$/i, async (ctx) => {
    await ctx.deleteMessage().catch(() => {});

    const isMatchStarted = GlobalState.getStart();
    const isTeamsDivided = GlobalState.getDivided();
    const teamsBase = GlobalState.getTeamsBase()
    const allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    // Проверка условий
    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч ещё не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    if (!isTeamsDivided || teamsBase.length === 0) {
      const message = await ctx.reply("⚠️ Команды ещё не сформированы!");
      return deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }

    try {
      // Формируем сообщение с таблицей в реальном времени
      const tableMessage = buildTeamsMessage(
        teamsBase,
        "Таблица текущих результатов",
        teamStats,
        allTeams
      );

      // Отправляем сообщение
      const sentMessage = await ctx.reply(tableMessage, { parse_mode: "HTML" });

      // Удаляем сообщение через 2 часа (или другое время по вашему усмотрению)
      deleteMessageAfterDelay(ctx, sentMessage.message_id, 60000);
    } catch (error) {
      console.error("Ошибка при формировании таблицы:", error);
      const message = await ctx.reply("⚠️ Не удалось сформировать таблицу.");
      deleteMessageAfterDelay(ctx, message.message_id, 3000);
    }
  });
};