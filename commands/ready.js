// ready.js
const { Markup } = require("telegraf");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");
const { safeTelegramCall } = require("../utils/telegramUtils");

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

  // Обновляем только кнопки в сообщении (не изменяя текст таблицы)
  // Это делается и для команды rdy, и для кнопки announce_teams
  const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
  if (lastTeamsMessage && lastTeamsMessage.chatId && lastTeamsMessage.messageId) {
    // Обновляем только клавиатуру, не трогая текст сообщения
    // Удаляем кнопку "Объявить составы" и делаем доступной кнопку "Выбрать команды"
    await safeTelegramCall(ctx, "editMessageReplyMarkup", [
      lastTeamsMessage.chatId,
      lastTeamsMessage.messageId,
      null,
        Markup.inlineKeyboard((() => {
          const isTableAllowed = GlobalState.getIsTableAllowed();
          const playingTeams = GlobalState.getPlayingTeams();
          const buttons = [];
          if (isTableAllowed) {
            // Если составы объявлены - показываем кнопку выбора команд
            buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_callback")]);
          } else {
            // Если составы не объявлены - показываем кнопку выбора команд (заблокированную) и кнопку объявления
            buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_blocked")]);
            buttons.push([Markup.button.callback("📢 Объявить составы", "announce_teams")]);
          }
          // Кнопка "Сменить игрока" показывается всегда, когда матч не идет (независимо от isTableAllowed)
          if (!playingTeams) {
            buttons.push([Markup.button.callback("🔄 Сменить игрока", "change_player_callback")]);
          }
          return buttons;
        })()).reply_markup,
    ]);
  }
};

module.exports = (bot, GlobalState) => {
  // Команда rdy - только устанавливает флаг, не обновляет сообщение
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

    // Показываем кнопки подтверждения/отклонения
    const text =
      "Составы команд готовы! Чтобы их просмотреть, отправьте команду <b>«таблица»</b> в личные сообщения " +
      '<a href="http://t.me/football_ramen_bot">боту</a>.\n\n' +
      "Для просмотра истории сыгранных матчей используйте команду <b>«результаты»</b>.";

    await safeAnswerCallback(ctx, "Подтвердите отправку уведомления");
    
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    
    // Отправляем сообщение с предпросмотром и кнопками подтверждения
    const previewMessage = await safeTelegramCall(ctx, "sendMessage", [
      chatId,
      `📢 <b>Предпросмотр уведомления:</b>\n\n${text}\n\n<b>Отправить это уведомление в группу?</b>`,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback("✅ Подтвердить", "announce_teams_confirm")],
          [Markup.button.callback("❌ Отклонить", "announce_teams_cancel")],
        ]).reply_markup,
      },
    ]);
    deleteMessageAfterDelay(ctx, previewMessage.message_id, 60000);
  });

  // Обработчик подтверждения объявления составов
  bot.action("announce_teams_confirm", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    await safeAnswerCallback(ctx, "✅ Объявляю составы...");
    
    // Удаляем сообщение с подтверждением
    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "deleteMessage", [chatId, messageId]);
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }
    
    await announceTeams(ctx, GlobalState);
  });

  // Обработчик отклонения объявления составов
  bot.action("announce_teams_cancel", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    await safeAnswerCallback(ctx, "❌ Отправка уведомления отменена");
    
    // Удаляем сообщение с подтверждением
    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "deleteMessage", [chatId, messageId]);
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }
  });
};
