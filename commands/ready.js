// ready.js
const { Markup } = require("telegraf");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");

// Функция объявления составов (общая логика для команды rdy и кнопки)
const announceTeams = async (ctx, GlobalState) => {
  // Разрешаем таблицу
  GlobalState.setIsTableAllowed(true);

  // Отправляем уведомление в группу
  const groupId = GlobalState.getGroupId();
  const text =
    "Составы команд готовы! Чтобы их просмотреть, отправьте команду <b>«таблица»</b> в личные сообщения " +
    '<a href="http://t.me/football_ramen_bot">боту</a>.\n\n' +
    "Для просмотра истории сыгранных матчей используйте команду <b>«результаты»</b>.";

  await ctx.telegram.sendMessage(groupId, text, {
    parse_mode: "HTML",
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback("📋 Таблица", "show_table")],
      [Markup.button.callback("📊 Результаты", "show_results")],
    ]).reply_markup,
  });

  // Обновляем сообщение с командами - убираем кнопку "Объявить составы" и разблокируем "Выбрать команды"
  const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
  if (lastTeamsMessage) {
    const teamsBase = GlobalState.getTeamsBase();
    const teamStats = GlobalState.getTeamStats();
    const teams = GlobalState.getTeams();
    const updatedMessage = buildTeamsMessage(
      teamsBase,
      "Таблица",
      teamStats,
      teams,
      null,
      false
    );
    
    await safeTelegramCall(ctx, "editMessageText", [
      lastTeamsMessage.chatId,
      lastTeamsMessage.messageId,
      null,
      updatedMessage,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_callback")],
        ]).reply_markup,
      },
    ]);
  }
};

module.exports = (bot, GlobalState) => {
  // Команда rdy
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
    await announceTeams(ctx, GlobalState);
  });

  // Обработчик кнопки "Объявить составы"
  bot.action("announce_teams", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    await safeAnswerCallback(ctx, "✅ Объявляю составы...");
    await announceTeams(ctx, GlobalState);
  });
};
