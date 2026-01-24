const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');
const { Markup } = require('telegraf');

module.exports = (bot, GlobalState) => {
  const executeUpdate = () => {
    // Сохраняем то, что должно остаться после /update
    const players = GlobalState.getPlayers();
    const collectionDate = GlobalState.getCollectionDate();
    const location = GlobalState.getLocation();
    const maxPlayers = GlobalState.getMaxPlayers();
    const listMessageId = GlobalState.getListMessageId();
    const listMessageChatId = GlobalState.getListMessageChatId();

    // Полный сброс турнирного состояния в памяти, результаты матчей тоже очищаем,
    // чтобы избежать рассинхрона с историей/откатами.
    GlobalState.resetTournamentState({ preserveMatchResults: false });

    // Восстанавливаем сохранённые значения, чтобы вернуться к этапу "tm"
    GlobalState.setPlayers(Array.isArray(players) ? players : []);
    GlobalState.setCollectionDate(collectionDate || null);
    GlobalState.setLocation(location || null);
    if (typeof maxPlayers === 'number' && !Number.isNaN(maxPlayers)) {
      GlobalState.setMaxPlayers(maxPlayers);
    }
    GlobalState.setListMessageId(listMessageId || null);
    GlobalState.setListMessageChatId(listMessageChatId || null);
    GlobalState.setStart(true);
    GlobalState.setNotificationSent(false);
  };

  // Команда /update — сбросить турнирное состояние в памяти,
  // не сохраняя данные в БД и сохранив только список игроков.
  bot.hears(/^update$/i, async (ctx) => {
    try {
      if (!ctx.from || typeof ctx.from.id !== 'number') {
        console.error('Ошибка: некорректный ctx.from в команде /update');
        return;
      }
      if (!ctx.chat || typeof ctx.chat.id !== 'number') {
        console.error('Ошибка: некорректный ctx.chat в команде /update');
        return;
      }

      const ADMIN_ID = GlobalState.getAdminId();
      if (!Array.isArray(ADMIN_ID)) {
        console.error('Ошибка: ADMIN_ID не является массивом');
        return;
      }

      await ctx.deleteMessage().catch(() => {});

      // Команда доступна только в ЛС
      if (ctx.chat.type !== 'private') {
        const message = await ctx.reply('⚠️ Команда доступна только в личных сообщениях с ботом.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      const isMatchStarted = GlobalState.getStart();
      if (!isMatchStarted) {
        const message = await ctx.reply('⚠️ Матч не начат!');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      const confirmMessage = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ <b>Подтверждение /update</b>\n\n' +
          'Будет сброшено всё состояние (команды/матчи/откаты/названия/судья/результаты),\n' +
          'но список игроков сохранится.\n\n' +
          '<b>Продолжить?</b>',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Подтвердить', 'update_confirm'),
              Markup.button.callback('❌ Отмена', 'update_cancel'),
            ],
          ]).reply_markup,
        },
      ]);

      if (confirmMessage && confirmMessage.message_id) {
        setTimeout(() => {
          safeTelegramCall(ctx, 'deleteMessage', [
            ctx.chat.id,
            confirmMessage.message_id,
          ]).catch(() => {});
        }, 30000);
      }
    } catch (error) {
      console.error('Необработанная ошибка в обработчике /update:', error.message);
      const message = await ctx.reply('⚠️ Произошла ошибка при обработке команды /update.');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });

  bot.action('update_confirm', async (ctx) => {
    try {
      if (!ctx.from || typeof ctx.from.id !== 'number') {
        console.error('Ошибка: некорректный ctx.from в update_confirm');
        return;
      }

      const ADMIN_ID = GlobalState.getAdminId();
      if (!Array.isArray(ADMIN_ID)) {
        console.error('Ошибка: ADMIN_ID не является массивом');
        return;
      }

      if (!ADMIN_ID.includes(ctx.from.id)) {
        await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
        return;
      }

      const chatType = ctx.callbackQuery?.message?.chat?.type || ctx.chat?.type;
      if (chatType !== 'private') {
        await safeAnswerCallback(ctx, '⚠️ Команда доступна только в личных сообщениях с ботом.');
        return;
      }

      const isMatchStarted = GlobalState.getStart();
      if (!isMatchStarted) {
        await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
        return;
      }

      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]).catch(() => {});
      }

      await safeAnswerCallback(ctx, '✅ Выполняю /update...');
      await executeUpdate(ctx);

      const message = await safeTelegramCall(ctx, 'sendMessage', [
        chatId || ctx.chat.id,
        '✅ Обновлено: состояние сброшено, игроки сохранены.\n' +
          'Теперь можно снова разделить команды командой <b>tm2/tm3/tm4</b>.',
        { parse_mode: 'HTML' },
      ]);
      if (message && message.message_id) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    } catch (error) {
      console.error('Необработанная ошибка в update_confirm:', error.message);
      await safeAnswerCallback(ctx, '⚠️ Ошибка при выполнении /update');
    }
  });

  bot.action('update_cancel', async (ctx) => {
    try {
      const chatType = ctx.callbackQuery?.message?.chat?.type || ctx.chat?.type;
      if (chatType !== 'private') {
        await safeAnswerCallback(ctx);
        return;
      }

      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]).catch(() => {});
      }
      await safeAnswerCallback(ctx, '❌ Отменено');
    } catch (error) {
      // игнорируем
    }
  });
};

