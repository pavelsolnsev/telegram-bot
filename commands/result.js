
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');
const { sendPrivateMessage } = require('../message/sendPrivateMessage');
const { getTeamName } = require('../utils/getTeamName');

module.exports = (bot, GlobalState) => {
  const teamColors = ['🔴', '🔵', '🟢', '🟡'];

  const formatPlayerLine = (idx, player) => {
    if (!player || typeof player !== 'object') {
      return '';
    }

    const { name = 'Unknown', goals = 0, assists = 0, saves = 0 } = player;
    const index = String(idx + 1).padStart(2, ' ') + '.';

    // Форматируем статистику
    const goalsMark = goals > 0 ? ` ⚽️${goals}` : '';
    const assistsMark = assists > 0
      ? (goalsMark ? `🎯${assists}` : ` 🎯${assists}`)
      : '';
    const savesMark = saves > 0
      ? (goalsMark || assistsMark ? `🧤${saves}` : ` 🧤${saves}`)
      : '';

    // Форматируем имя аналогично buildPlayingTeamsMessage
    const nameStr = String(name || 'Unknown');
    const cleanName = nameStr
      // eslint-disable-next-line no-misleading-character-class
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu, '')
      .trim();
    const chars = Array.from(cleanName);
    const hasStats = Boolean(goalsMark || assistsMark || savesMark);
    const maxNameLength = hasStats ? 11 : 12;
    const displayName = chars.length <= maxNameLength
      ? cleanName.padEnd(maxNameLength, ' ')
      : chars.slice(0, Math.max(2, maxNameLength - 2)).join('') + '..';

    return `${index}${displayName}${goalsMark}${assistsMark}${savesMark}`;
  };

  // Вспомогательная функция для безопасного формирования секций результатов
  const formatMatchSection = (m, i) => {
    if (!m || typeof m !== 'object') {
      return `⚠️ Ошибка: некорректные данные матча №${i + 1}`;
    }

    const color1 = teamColors[m.teamIndex1] || '⚽';
    const color2 = teamColors[m.teamIndex2] || '⚽';
    const team1Name = getTeamName(m.teamIndex1);
    const team2Name = getTeamName(m.teamIndex2);
    const title = `✅ 🏁 Итог матча №${i + 1} 🏁`;

    // Безопасный доступ к массивам игроков
    const players1 = Array.isArray(m.players1) ? m.players1 : [];
    const players2 = Array.isArray(m.players2) ? m.players2 : [];
    const lines1 = players1.map((pl, idx) => formatPlayerLine(idx, pl)).filter(Boolean).join('\n');
    const lines2 = players2.map((pl, idx) => formatPlayerLine(idx, pl)).filter(Boolean).join('\n');

    const score1 = Number(m.score1) || 0;
    const score2 = Number(m.score2) || 0;
    const scoreLine = `📊 Счет: ${color1} ${score1}:${score2} ${color2}`;
    const resultText =
      score1 > score2
        ? `🏆 ${color1} ${team1Name}`
        : score2 > score1
          ? `🏆 ${color2} ${team2Name}`
          : '🤝 Ничья!';

    return [
      title,
      '',
      `${color1} ${team1Name}`,
      `<code>${lines1}</code>`,
      '',
      `${color2} ${team2Name}`,
      `<code>${lines2}</code>`,
      '',
      scoreLine,
      '',
      resultText,
    ].join('\n');
  };

  // Функция для формирования и отправки результатов
  const sendResults = async (ctx, userId) => {
    const results = GlobalState.getMatchResults();

    if (results.length === 0) {
      const sent = await sendPrivateMessage(bot, userId, '📋 Пока нет сыгранных матчей.');
      if (sent && sent.message_id) {
        deleteMessageAfterDelay({ telegram: bot.telegram, chat: { id: userId } }, sent.message_id, 30000);
      }
      return;
    }

    // Собираем текст сообщения
    const sections = results.map((m, i) => {
      const color1 = teamColors[m.teamIndex1] || '⚽';
      const color2 = teamColors[m.teamIndex2] || '⚽';
      const team1Name = getTeamName(m.teamIndex1);
      const team2Name = getTeamName(m.teamIndex2);
      const title = `✅ 🏁 Итог матча №${i + 1} 🏁`;
      const lines1 = m.players1.map((pl, idx) => formatPlayerLine(idx, pl)).join('\n');
      const lines2 = m.players2.map((pl, idx) => formatPlayerLine(idx, pl)).join('\n');
      const scoreLine = `📊 Счет: ${color1} ${m.score1}:${m.score2} ${color2}`;
      const resultText =
        m.score1 > m.score2
          ? `🏆 ${color1} ${team1Name}`
          : m.score2 > m.score1
            ? `🏆 ${color2} ${team2Name}`
            : '🤝 Ничья!';

      return [
        title,
        '',
        `${color1} ${team1Name}`,
        `<code>${lines1}</code>`,
        '',
        `${color2} ${team2Name}`,
        `<code>${lines2}</code>`,
        '',
        scoreLine,
        '',
        resultText,
      ].join('\n');
    });

    const text = sections.join('\n\n===============\n\n');

    // Отправляем сообщение в личку
    try {
      const sent = await bot.telegram.sendMessage(userId, text, { parse_mode: 'HTML' });
      if (sent && sent.chat && sent.message_id) {
        GlobalState.setLastResultMessageId(sent.chat.id, sent.message_id);
        deleteMessageAfterDelay({ telegram: bot.telegram, chat: { id: userId } }, sent.message_id, 120000);
      }
    } catch (error) {
      // Ошибка уже обработана в sendPrivateMessage для известных случаев
      // Здесь логируем только неожиданные ошибки
      const errorCode = error.response?.error_code;
      const errorDescription = error.response?.description || '';
      if (errorCode !== 403 && !errorDescription.includes('bot was blocked') &&
          errorCode !== 400 && !errorDescription.includes('chat not found') &&
          !errorDescription.includes('have no access')) {
        console.error(`Ошибка при отправке результатов пользователю ${userId}:`, error);
      }
      throw error; // Пробрасываем ошибку для обработки в вызывающем коде
    }
  };

  // Обработчик кнопки "Результаты"
  bot.action('show_results', async (ctx) => {
    const userId = ctx.from.id;

    await safeAnswerCallback(ctx, '📊 Отправляю результаты в личные сообщения бота');

    try {
      // Пытаемся отправить результаты в личку
      await sendResults(ctx, userId);
      await safeAnswerCallback(ctx, '✅ Результаты отправлены в личные сообщения!');
    } catch (error) {
      // Если не удалось отправить
      const errorCode = error.response?.error_code;
      const errorDescription = error.response?.description || '';

      if (errorCode === 403 || errorDescription.includes('bot was blocked')) {
        // Пользователь заблокировал бота
        await safeAnswerCallback(ctx, '⚠️ Начните диалог с ботом в личных сообщениях или нажми /start');
      } else if (errorCode === 400 && (errorDescription.includes('chat not found') || errorDescription.includes('have no access'))) {
        // Пользователь еще не начинал диалог с ботом
        await safeAnswerCallback(ctx, '⚠️ Начните диалог с ботом в личных сообщениях или нажми /start');
      } else {
        console.error('Ошибка при отправке результатов:', error);
        await safeAnswerCallback(ctx, "⚠️ Ошибка при отправке. Напишите боту команду 'результаты' в личных сообщениях.");
      }
    }
  });

  bot.hears(/^результаты$/i, async (ctx) => {

    await ctx.deleteMessage().catch(() => {});

    if (ctx.chat.id < 0) {
      try {
        const msg = await ctx.reply('Напиши мне в ЛС.');
        if (msg && msg.message_id) {
          deleteMessageAfterDelay(ctx, msg.message_id);
        }
      } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
      }
      return;
    }

    const results = GlobalState.getMatchResults();

    if (results.length === 0) {
      try {
        const msg = await ctx.reply('📋 Пока нет сыгранных матчей.');
        if (msg && msg.message_id) {
          deleteMessageAfterDelay(ctx, msg.message_id, 30000);
        }
      } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
      }
      return;
    }

    // Собираем текст сообщения
    const sections = results.map((m, i) => formatMatchSection(m, i));

    const text = sections.join('\n\n===============\n\n');
    const last = GlobalState.getLastResultMessageId();

    if (last && last.chatId && last.messageId) {
      try {
        await ctx.telegram.editMessageText(
          last.chatId,
          last.messageId,
          null,
          text,
          { parse_mode: 'HTML' },
        );
        deleteMessageAfterDelay(ctx, last.messageId, 120000);
      } catch (err) {
        const desc = err?.response?.description || '';
        if (desc.includes('message to edit not found')) {
          try {
            const sent = await ctx.reply(text, { parse_mode: 'HTML' });
            if (sent && sent.chat && sent.message_id) {
              GlobalState.setLastResultMessageId(sent.chat.id, sent.message_id);
              deleteMessageAfterDelay(ctx, sent.message_id, 120000);
            }
          } catch (replyError) {
            console.error('Ошибка при отправке результата:', replyError);
          }
        } else if (!desc.includes('message is not modified')) {
          console.error('Ошибка редактирования результата:', err);
        }
      }
    } else {
      try {
        const sent = await ctx.reply(text, { parse_mode: 'HTML' });
        if (sent && sent.chat && sent.message_id) {
          GlobalState.setLastResultMessageId(sent.chat.id, sent.message_id);
          deleteMessageAfterDelay(ctx, sent.message_id, 120000);
        }
      } catch (replyError) {
        console.error('Ошибка при отправке результата:', replyError);
      }
    }
  });

  // Обработчик deep link для результатов
  bot.start(async (ctx) => {
    const startParam = ctx.startPayload;
    if (startParam === 'results') {
      // Пользователь перешел по ссылке для получения результатов
      await sendResults(ctx, ctx.from.id).catch((error) => {
        console.error('Ошибка при отправке результатов через start:', error);
      });
    }
  });
};
