const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const {
  checkAdminRights,
  checkMatchStarted,
} = require('../../utils/matchHelpers');
const { finishMatch, executeKskCommand } = require('./finishMatch');
const {
  cancelActiveMatch,
  reverseFinishedMatch,
  offerContinueEnd,
  executeEndStep,
} = require('./cancelReverse');

module.exports = (bot, GlobalState) => {
  // Команда fn
  bot.hears(/^fn$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;
    if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return;

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply('Напиши мне в ЛС.');
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    await finishMatch(ctx, GlobalState);
  });

  // Обработчик кнопки "🏁 Завершить матч"
  bot.action('finish_match', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      return;
    }

    const isMatchStarted = GlobalState.getStart();
    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      if (chatId) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          chatId,
          '⚠️ Матч не начат!',
        ]);
        if (message) {
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (!chatId || chatId < 0) {
      await safeAnswerCallback(ctx, '⚠️ Команда доступна только в личных сообщениях!');
      return;
    }

    await safeAnswerCallback(ctx, '✅ Завершение матча...');
    await finishMatch(ctx, GlobalState);
  });

  // Команда ksk (текстовый ввод)
  bot.hears(/^ksk$/i, async (ctx) => {
    await executeKskCommand(ctx, GlobalState, checkAdminRights, checkMatchStarted);
  });

  // Обработчик первого нажатия кнопки KSK (подтверждение)
  bot.action('ksk_confirm', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();

    // Проверка прав админа
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      return;
    }

    // Проверка условий
    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      if (chatId) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          chatId,
          '⚠️ Матч не начат!',
        ]);
        if (message) {
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
      return;
    }

    if (!playingTeams) {
      await safeAnswerCallback(ctx, '⛔ Нет активного матча для продолжения!');
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      if (chatId) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          chatId,
          '⛔ Нет активного матча для продолжения!',
        ]);
        if (message) {
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (!chatId || chatId < 0) {
      await safeAnswerCallback(ctx, '⚠️ Команда доступна только в личных сообщениях!');
      return;
    }

    // Показываем подтверждающее сообщение с кнопками
    const confirmMessage = await safeTelegramCall(ctx, 'sendMessage', [
      chatId,
      '⚠️ <b>Подтверждение перехода к следующему матчу</b>\n\n' +
      'Текущий матч будет завершен, статистика обновлена, и начнется следующий матч.\n\n' +
      'Вы уверены, что хотите продолжить?',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Подтвердить', 'ksk_execute'),
            Markup.button.callback('❌ Отмена', 'ksk_cancel'),
          ],
        ]).reply_markup,
      },
    ]);

    // Удаляем сообщение с подтверждением через 30 секунд
    if (confirmMessage) {
      setTimeout(() => {
        safeTelegramCall(ctx, 'deleteMessage', [
          chatId,
          confirmMessage.message_id,
        ]).catch(() => {
          // Игнорируем ошибки, если сообщение уже удалено
        });
      }, 30000);
    }

    await safeAnswerCallback(ctx, 'Подтвердите переход к следующему матчу');
  });

  // Обработчик подтверждения выполнения команды KSK
  bot.action('ksk_execute', async (ctx) => {
    // Удаляем сообщение с подтверждением
    if (ctx.callbackQuery?.message) {
      await safeTelegramCall(ctx, 'deleteMessage', [
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id,
      ]).catch(() => {
        // Игнорируем ошибки, если сообщение уже удалено
      });
    }

    await safeAnswerCallback(ctx, '✅ Переход к следующему матчу...');
    await executeKskCommand(ctx, GlobalState, checkAdminRights, checkMatchStarted);
  });

  // Обработчик отмены выполнения команды KSK
  bot.action('ksk_cancel', async (ctx) => {
    // Удаляем сообщение с подтверждением
    if (ctx.callbackQuery?.message) {
      await safeTelegramCall(ctx, 'deleteMessage', [
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id,
      ]).catch(() => {
        // Игнорируем ошибки, если сообщение уже удалено
      });
    }

    await safeAnswerCallback(ctx);
  });

  // Команда end - выполняет один шаг, затем предлагает продолжить
  bot.hears(/^end$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply('Напиши мне в ЛС.');
      return deleteMessageAfterDelay(ctx, msg.message_id, 6000);
    }

    const chatId = ctx.chat.id;
    const result = await executeEndStep(
      ctx,
      GlobalState,
      cancelActiveMatch,
      reverseFinishedMatch,
    );

    if (!result.action) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        '⛔ Нет матчей для обработки',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Предлагаем продолжить процесс
    await offerContinueEnd(ctx, chatId, result.action, GlobalState);
  });

  // Обработчик кнопки "End" из меню управления - работает так же как команда end
  bot.action('end_match', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (!chatId || chatId < 0) {
      await safeAnswerCallback(ctx, '⚠️ Команда доступна только в личных сообщениях!');
      return;
    }

    // Удаляем сообщение меню управления
    try {
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [
          chatId,
          messageId,
        ]).catch(() => {});
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    const result = await executeEndStep(
      ctx,
      GlobalState,
      cancelActiveMatch,
      reverseFinishedMatch,
    );

    if (!result.action) {
      await safeAnswerCallback(ctx, '⛔ Нет матчей для обработки');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        '⛔ Нет матчей для обработки',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Предлагаем продолжить процесс
    await offerContinueEnd(ctx, chatId, result.action, GlobalState);
  });

  // Обработчик кнопки "Продолжить" для команды end
  bot.action('end_continue', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (!chatId || chatId < 0) {
      await safeAnswerCallback(ctx, '⚠️ Команда доступна только в личных сообщениях!');
      return;
    }

    // Удаляем предыдущее сообщение с кнопками
    try {
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [
          chatId,
          messageId,
        ]).catch(() => {});
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    await safeAnswerCallback(ctx, '⏳ Выполняю следующее действие...');

    const result = await executeEndStep(
      ctx,
      GlobalState,
      cancelActiveMatch,
      reverseFinishedMatch,
    );

    if (!result.action) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        '⛔ Нет матчей для обработки',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Предлагаем продолжить процесс
    await offerContinueEnd(ctx, chatId, result.action, GlobalState);
  });

  // Обработчик кнопки "Остановить" для команды end
  bot.action('end_stop', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      return;
    }

    // Удаляем сообщение с кнопками
    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [
          chatId,
          messageId,
        ]).catch(() => {});
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    await safeAnswerCallback(ctx, '✅ Процесс остановлен');
  });
};

