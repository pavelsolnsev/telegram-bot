const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');
const resetPlayersStats = require('../database/resetPlayersStats');

module.exports = (bot, GlobalState) => {
  // Команда reset — обнуляет статистику всех игроков в базе
  bot.hears(/^reset$/i, async (ctx) => {
    await ctx.deleteMessage().catch(() => {});

    const ADMIN_ID = GlobalState.getAdminId();

    // Проверяем права администратора
    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ У вас нет прав для этой команды.',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    // Для безопасности выполняем только в ЛС с ботом
    if (ctx.chat.id < 0) {
      const msg = await ctx.reply('⚠️ Команда доступна только в личных сообщениях с ботом.');
      return deleteMessageAfterDelay(ctx, msg.message_id, 6000);
    }

    // Показываем подтверждающее сообщение с кнопками
    const confirmMessage = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ <b>Подтверждение обнуления статистики</b>\n\n' +
      'Вы собираетесь обнулить статистику всех игроков в базе данных:\n' +
      '• Голы (goals)\n' +
      '• Голевые передачи (assists)\n' +
      '• Сейвы (saves)\n' +
      '• Сыгранные игры (gamesPlayed)\n' +
      '• Победы (wins)\n' +
      '• Ничьи (draws)\n' +
      '• Поражения (losses)\n' +
      '• Рейтинг (rating)\n' +
      '• MVP (mvp)\n\n' +
      '<b>Это действие нельзя отменить!</b>\n\n' +
      'Вы уверены, что хотите продолжить?',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Подтвердить', 'reset_confirm'),
            Markup.button.callback('❌ Отмена', 'reset_cancel'),
          ],
        ]).reply_markup,
      },
    ]);

    // Удаляем сообщение с подтверждением через 60 секунд
    if (confirmMessage) {
      setTimeout(() => {
        safeTelegramCall(ctx, 'deleteMessage', [
          ctx.chat.id,
          confirmMessage.message_id,
        ]).catch(() => {
          // Игнорируем ошибки, если сообщение уже удалено
        });
      }, 60000);
    }
  });

  // Обработчик подтверждения обнуления статистики
  bot.action('reset_confirm', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

    // Проверяем права администратора
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      return;
    }

    // Удаляем сообщение с подтверждением
    if (ctx.callbackQuery?.message) {
      await safeTelegramCall(ctx, 'deleteMessage', [
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id,
      ]).catch(() => {
        // Игнорируем ошибки, если сообщение уже удалено
      });
    }

    await safeAnswerCallback(ctx, '✅ Обнуление статистики...');

    try {
      await resetPlayersStats();

      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '✅ Статистика всех игроков успешно обнулена.',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 60000);
      }
    } catch (error) {
      console.error('Ошибка при выполнении команды reset:', error);
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Произошла ошибка при обнулении статистики игроков. Попробуйте позже.',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    }
  });

  // Обработчик отмены обнуления статистики
  bot.action('reset_cancel', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

    // Проверяем права администратора
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      return;
    }

    // Удаляем сообщение с подтверждением
    if (ctx.callbackQuery?.message) {
      await safeTelegramCall(ctx, 'deleteMessage', [
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id,
      ]).catch(() => {
        // Игнорируем ошибки, если сообщение уже удалено
      });
    }

    await safeAnswerCallback(ctx, '❌ Обнуление статистики отменено.');

    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '❌ Обнуление статистики отменено.',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};


