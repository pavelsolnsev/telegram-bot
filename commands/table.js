const { Markup } = require("telegraf");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");
const { safeTelegramCall } = require("../utils/telegramUtils");

module.exports = (bot, GlobalState) => {
  // Функция для формирования и отправки таблицы
  const sendTable = async (ctx, userId) => {
    const isMatchStarted = GlobalState.getStart();
    const isTeamsDivided = GlobalState.getDivided();
    const teamsBase = GlobalState.getTeamsBase();
    const allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();

    if (!isMatchStarted) {
      await sendPrivateMessage(bot, userId, "⚠️ Матч ещё не начат!");
      return;
    }

    if (!GlobalState.getIsTableAllowed()) {
      await sendPrivateMessage(bot, userId, "⚠️ Составы ещё не готовы.");
      return;
    }

    if (!isTeamsDivided || teamsBase.length === 0) {
      await sendPrivateMessage(bot, userId, "⚠️ Команды ещё не сформированы!");
      return;
    }

    try {
      const tableMessage = buildTeamsMessage(
        teamsBase,
        "Таблица текущих результатов",
        teamStats,
        allTeams
      );

      const sent = await sendPrivateMessage(bot, userId, tableMessage, { parse_mode: "HTML" });
      if (sent && sent.message_id) {
        deleteMessageAfterDelay({ telegram: bot.telegram, chat: { id: userId } }, sent.message_id, 120000);
      }
    } catch (error) {
      console.error("Ошибка при формировании таблицы:", error);
      throw error;
    }
  };

  // Обработчик кнопки "Таблица"
  bot.action("show_table", async (ctx) => {
    const userId = ctx.from.id;

    await safeAnswerCallback(ctx, "📋 Отправляю таблицу в личные сообщения бота");

    try {
      await sendTable(ctx, userId);
      await safeAnswerCallback(ctx, "✅ Таблица отправлена в личные сообщения!");
    } catch (error) {
      const errorCode = error.response?.error_code;
      const errorDescription = error.response?.description || "";
      
      if (errorCode === 403 || errorDescription.includes("bot was blocked")) {
        await safeAnswerCallback(ctx, "⚠️ Начните диалог с ботом в личных сообщениях или нажми /start");
      } else if (errorCode === 400 && (errorDescription.includes("chat not found") || errorDescription.includes("have no access"))) {
        await safeAnswerCallback(ctx, "⚠️ Начните диалог с ботом в личных сообщениях или нажми /start");
      } else {
        console.error("Ошибка при отправке таблицы:", error);
        await safeAnswerCallback(ctx, "⚠️ Ошибка при отправке. Напишите боту команду 'таблица' в личных сообщениях.");
      }
    }
  });

  bot.hears(/^таблица$/i, async (ctx) => {
    await ctx.deleteMessage().catch(() => {});

    const isMatchStarted = GlobalState.getStart();
    const isTeamsDivided = GlobalState.getDivided();
    const teamsBase = GlobalState.getTeamsBase();
    const allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();


    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    // Проверка условий
    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч ещё не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!GlobalState.getIsTableAllowed()) {
      const msg = await ctx.reply("⚠️ Составы ещё не готовы.");
      return deleteMessageAfterDelay(ctx, msg.message_id, 6000);
    }

    if (!isTeamsDivided || teamsBase.length === 0) {
      const message = await ctx.reply("⚠️ Команды ещё не сформированы!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
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

      deleteMessageAfterDelay(ctx, sentMessage.message_id, 120000);
    } catch (error) {
      console.error("Ошибка при формировании таблицы:", error);
      const message = await ctx.reply("⚠️ Не удалось сформировать таблицу.");
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};
