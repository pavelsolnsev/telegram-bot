// ready.js
const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { createTeamManagementButtons } = require('../utils/createTeamManagementButtons');

// Функция объявления составов (общая логика для команды rdy и кнопки)
const announceTeams = async (ctx, GlobalState) => {
  // Разрешаем таблицу
  GlobalState.setIsTableAllowed(true);

  // Отправляем уведомление в группу
  const groupId = GlobalState.getGroupId();
  const text =
    'Составы команд готовы! Чтобы их просмотреть, отправьте команду <b>«таблица»</b> <a href="http://t.me/football_ramen_bot">боту</a> в личном сообщении.\n\n' +
    'Для просмотра истории сыгранных матчей используйте команду <b>«результаты»</b>.';

  await ctx.telegram.sendMessage(groupId, text, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('📋 Таблица', 'show_table')],
      [Markup.button.callback('📊 Результаты', 'show_results')],
    ]).reply_markup,
  });

  // Обновляем только кнопки в сообщении (не изменяя текст таблицы)
  // Это делается и для команды rdy, и для кнопки announce_teams
  const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
  if (lastTeamsMessage && lastTeamsMessage.chatId && lastTeamsMessage.messageId) {
    // Обновляем только клавиатуру, не трогая текст сообщения
    // Удаляем кнопку "Объявить составы" и делаем доступной кнопку "Выбрать команды"
    await safeTelegramCall(ctx, 'editMessageReplyMarkup', [
      lastTeamsMessage.chatId,
      lastTeamsMessage.messageId,
      null,
      createTeamManagementButtons(GlobalState),
    ]);
  }
};

module.exports = (bot, GlobalState) => {
  // Команда rdy - только устанавливает флаг, не обновляет сообщение
  bot.hears(/^rdy$/i, async (ctx) => {
    // Только личные сообщения
    if (ctx.chat.type !== 'private') return;

    // Только админ
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      const msg = await ctx.reply('⛔ У вас нет прав для этой команды.');
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    // Удаляем сообщение-команду
    await ctx.deleteMessage().catch(() => {});
    await announceTeams(ctx, GlobalState);
  });

  // Обработчик кнопки "Объявить составы"
  bot.action('announce_teams', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      if (chatId) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          chatId,
          '⛔ У вас нет прав для этой команды.',
        ]);
        if (message) {
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
      return;
    }

    // Показываем кнопки подтверждения/отклонения
    // Сообщение-предупреждение должно напомнить администратору про смену названий команд
    const text =
      '⚠️ <b>Проверь названия команд</b>\n\n' +
      'Перед объявлением составов убедись, что названия команд указаны корректно.\n' +
      'Если нужно, не забудь сменить названия команд.\n\n' +
      '<b>Продолжить объявление составов?</b>';

    await safeAnswerCallback(ctx, 'Подтвердите отправку уведомления');

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;

    // Отправляем сообщение с напоминанием и кнопками подтверждения
    const previewMessage = await safeTelegramCall(ctx, 'sendMessage', [
      chatId,
      text,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('✅ Подтвердить', 'announce_teams_confirm')],
          [Markup.button.callback('❌ Отклонить', 'announce_teams_cancel')],
        ]).reply_markup,
      },
    ]);
    deleteMessageAfterDelay(ctx, previewMessage.message_id, 60000);
  });

  // Обработчик подтверждения объявления составов
  bot.action('announce_teams_confirm', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      if (chatId) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          chatId,
          '⛔ У вас нет прав для этой команды.',
        ]);
        if (message) {
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;
    await safeAnswerCallback(ctx, '✅ Объявляю составы...');

    // Удаляем сообщение с подтверждением
    try {
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]);
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    await announceTeams(ctx, GlobalState);
  });

  // Обработчик отклонения объявления составов
  bot.action('announce_teams_cancel', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      if (chatId) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          chatId,
          '⛔ У вас нет прав для этой команды.',
        ]);
        if (message) {
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
      return;
    }

    await safeAnswerCallback(ctx, '❌ Отправка уведомления отменена');
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (chatId) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        '❌ Отправка уведомления отменена',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    }

    // Удаляем сообщение с подтверждением
    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]);
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }
  });
};
