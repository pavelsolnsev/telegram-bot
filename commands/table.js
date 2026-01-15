const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { buildTeamsMessage } = require('../message/buildTeamsMessage');
const { sendPrivateMessage } = require('../message/sendPrivateMessage');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');
const { manageTableMessage, getPreviousTableMessage, updateTableMessageTimer } = require('../utils/manageUserMessage');
const { safeTelegramCall } = require('../utils/telegramUtils');

module.exports = (bot, GlobalState) => {
  // Функция для формирования и отправки таблицы
  const sendTable = async (ctx, userId) => {
    const isMatchStarted = GlobalState.getStart();
    const isTeamsDivided = GlobalState.getDivided();
    const teamsBase = GlobalState.getTeamsBase();
    const allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const playingTeams = GlobalState.getPlayingTeams();
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const isStatsInitialized = GlobalState.getIsStatsInitialized();

    if (!isMatchStarted) {
      const sentMessage = await sendPrivateMessage(bot, userId, '⚠️ Матч ещё не начат!');
      if (sentMessage && sentMessage.message_id) {
        // Удаляем сообщение через 6 секунд
        setTimeout(async () => {
          try {
            await bot.telegram.deleteMessage(userId, sentMessage.message_id);
          } catch (error) {
            // Игнорируем ошибки удаления
          }
        }, 6000);
      }
      return;
    }

    if (!GlobalState.getIsTableAllowed()) {
      const sentMessage = await sendPrivateMessage(bot, userId, '⚠️ Составы ещё не готовы.');
      if (sentMessage && sentMessage.message_id) {
        // Удаляем сообщение через 6 секунд
        setTimeout(async () => {
          try {
            await bot.telegram.deleteMessage(userId, sentMessage.message_id);
          } catch (error) {
            // Игнорируем ошибки удаления
          }
        }, 6000);
      }
      return;
    }

    if (!isTeamsDivided || teamsBase.length === 0) {
      const sentMessage = await sendPrivateMessage(bot, userId, '⚠️ Команды ещё не сформированы!');
      if (sentMessage && sentMessage.message_id) {
        // Удаляем сообщение через 6 секунд
        setTimeout(async () => {
          try {
            await bot.telegram.deleteMessage(userId, sentMessage.message_id);
          } catch (error) {
            // Игнорируем ошибки удаления
          }
        }, 6000);
      }
      return;
    }

    try {
      // Показываем иконки только если команды еще не выбраны И матчи еще не начались И матч не завершен
      // После начала матчей или завершения - всегда показываем без иконок
      const showRatings = !playingTeams && !isStatsInitialized && !isMatchFinished;
      const teamsForDisplay = !playingTeams && !isStatsInitialized && !isMatchFinished ? teamsBase : allTeams;

      const tableMessage = buildTeamsMessage(
        teamsBase,
        'Таблица текущих результатов',
        teamStats,
        teamsForDisplay,
        null,
        showRatings,
      );

      // Проверяем, есть ли предыдущее сообщение таблицы
      const previousMessage = getPreviousTableMessage(userId);

      let sent;
      if (previousMessage && previousMessage.chatId && previousMessage.messageId) {
        // Пытаемся отредактировать предыдущее сообщение
        try {
          await bot.telegram.editMessageText(
            previousMessage.chatId,
            previousMessage.messageId,
            null,
            tableMessage,
            { parse_mode: 'HTML' },
          );
          // Используем предыдущее сообщение и обновляем таймер
          sent = { message_id: previousMessage.messageId, chat: { id: previousMessage.chatId } };
          updateTableMessageTimer(userId, previousMessage.chatId, previousMessage.messageId, { telegram: bot.telegram, chat: { id: previousMessage.chatId } });
        } catch (error) {
          // Если не удалось отредактировать, отправляем новое
          sent = await sendPrivateMessage(bot, userId, tableMessage, { parse_mode: 'HTML' });
          if (sent && sent.message_id) {
            const chatId = sent.chat?.id || userId;
            manageTableMessage(userId, chatId, sent.message_id, { telegram: bot.telegram, chat: { id: chatId } });
          }
        }
      } else {
        // Отправляем новое сообщение
        sent = await sendPrivateMessage(bot, userId, tableMessage, { parse_mode: 'HTML' });
        if (sent && sent.message_id) {
          const chatId = sent.chat?.id || userId;
          manageTableMessage(userId, chatId, sent.message_id, { telegram: bot.telegram, chat: { id: chatId } });
        }
      }
    } catch (error) {
      console.error('Ошибка при формировании таблицы:', error);
      throw error;
    }
  };

  // Обработчик кнопки "Таблица"
  bot.action('show_table', async (ctx) => {
    const userId = ctx.from.id;

    await safeAnswerCallback(ctx, '📋 Отправляю таблицу в личные сообщения бота');

    try {
      await sendTable(ctx, userId);
      await safeAnswerCallback(ctx, '✅ Таблица отправлена в личные сообщения!');
    } catch (error) {
      const errorCode = error.response?.error_code;
      const errorDescription = error.response?.description || '';

      if (errorCode === 403 || errorDescription.includes('bot was blocked')) {
        await safeAnswerCallback(ctx, '⚠️ Начните диалог с ботом в личных сообщениях или нажми /start');
      } else if (errorCode === 400 && (errorDescription.includes('chat not found') || errorDescription.includes('have no access'))) {
        await safeAnswerCallback(ctx, '⚠️ Начните диалог с ботом в личных сообщениях или нажми /start');
      } else {
        console.error('Ошибка при отправке таблицы:', error);
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
    const playingTeams = GlobalState.getPlayingTeams();
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const isStatsInitialized = GlobalState.getIsStatsInitialized();


    if (ctx.chat.id < 0) {
      const msg = await ctx.reply('Напиши мне в ЛС.');
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    // Проверка условий
    if (!isMatchStarted) {
      const message = await ctx.reply('⚠️ Матч ещё не начат!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!GlobalState.getIsTableAllowed()) {
      const msg = await ctx.reply('⚠️ Составы ещё не готовы.');
      return deleteMessageAfterDelay(ctx, msg.message_id, 6000);
    }

    if (!isTeamsDivided || teamsBase.length === 0) {
      const message = await ctx.reply('⚠️ Команды ещё не сформированы!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    try {
      // Формируем сообщение с таблицей в реальном времени
      // Показываем иконки только если команды еще не выбраны И матчи еще не начались И матч не завершен
      // После начала матчей или завершения - всегда показываем без иконок
      const showRatings = !playingTeams && !isStatsInitialized && !isMatchFinished;
      const teamsForDisplay = !playingTeams && !isStatsInitialized && !isMatchFinished ? teamsBase : allTeams;

      const tableMessage = buildTeamsMessage(
        teamsBase,
        'Таблица текущих результатов',
        teamStats,
        teamsForDisplay,
        null,
        showRatings,
      );

      // Проверяем, есть ли предыдущее сообщение таблицы
      const userId = ctx.from.id;
      const previousMessage = getPreviousTableMessage(userId);

      let sentMessage;
      if (previousMessage && previousMessage.chatId === ctx.chat.id && previousMessage.messageId) {
        // Пытаемся отредактировать предыдущее сообщение
        try {
          await safeTelegramCall(ctx, 'editMessageText', [
            previousMessage.chatId,
            previousMessage.messageId,
            null,
            tableMessage,
            { parse_mode: 'HTML' },
          ]);
          // Используем предыдущее сообщение и обновляем таймер
          sentMessage = { message_id: previousMessage.messageId, chat: { id: previousMessage.chatId } };
          updateTableMessageTimer(userId, previousMessage.chatId, previousMessage.messageId, ctx);
        } catch (error) {
          // Если не удалось отредактировать, отправляем новое
          sentMessage = await ctx.reply(tableMessage, { parse_mode: 'HTML' });
          if (sentMessage && sentMessage.message_id) {
            manageTableMessage(userId, ctx.chat.id, sentMessage.message_id, ctx);
          }
        }
      } else {
        // Отправляем новое сообщение
        sentMessage = await ctx.reply(tableMessage, { parse_mode: 'HTML' });
        if (sentMessage && sentMessage.message_id) {
          manageTableMessage(userId, ctx.chat.id, sentMessage.message_id, ctx);
        }
      }
    } catch (error) {
      console.error('Ошибка при формировании таблицы:', error);
      const message = await ctx.reply('⚠️ Не удалось сформировать таблицу.');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};
