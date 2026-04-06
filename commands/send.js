const { sendPrivateMessage, isSyntheticPlayerId } = require('../message/sendPrivateMessage');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const getAllPlayersForBroadcast = require('../database/getAllPlayersForBroadcast');

const VK_BROADCAST_TEXT =
  'Привет! Футбольная группа переезжает в VK\n\n' +
  '👉 https://vk.cc/cWcUyc\n\n' +
  'Если не подписан на сообщество — зайди через него:\n' +
  'https://vk.com/rmsfootball\n\n' +
  'Присоединяйся, там теперь вся активность!\n\n' +
  'Telegram группу не удаляй — ждём лучших времён 🤝';

const SEND_OPTIONS = {
  parse_mode: 'HTML',
  link_preview_options: {
    url: 'https://vk.cc/cWcUyc',
    prefer_large_media: true,
  },
  /** Повтор при 429: ждём retry_after и пробуем снова (только для рассылки) */
  floodMaxRetries: 12,
};

const MS_BETWEEN_RECIPIENTS = 150;

function escapeHtml(text) {
  const t = text == null ? '' : String(text).trim();
  if (t === '') {
    return '—';
  }
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatUsernameForList(username) {
  const u = username && String(username).trim();
  if (!u) {
    return '—';
  }
  return u.startsWith('@') ? escapeHtml(u) : `@${escapeHtml(u)}`;
}

function formatPlayerLine(row) {
  const name = escapeHtml(row.name);
  const un = formatUsernameForList(row.username);
  return `• ${name} | ${un}`;
}

/** Одна слишком длинная строка — по лимиту кодовых точек */
function chunkLongLineCodepoints(line, maxLen) {
  const codepoints = [...line];
  const parts = [];
  let buf = [];
  for (const c of codepoints) {
    if (buf.length + 1 > maxLen && buf.length > 0) {
      parts.push(buf.join(''));
      buf = [c];
    } else {
      buf.push(c);
    }
  }
  if (buf.length > 0) {
    parts.push(buf.join(''));
  }
  return parts;
}

/** Разбивает длинный текст на части ≤ maxLen (по строкам, длинные строки — по кодовым точкам) */
function chunkByLines(text, maxLen = 3800) {
  const lines = text.split('\n');
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ([...line].length > maxLen) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (const piece of chunkLongLineCodepoints(line, maxLen)) {
        chunks.push(piece);
      }
      continue;
    }
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

module.exports = (bot, GlobalState) => {
  let broadcastInProgress = false;

  const handleSendBroadcast = async (ctx) => {
    if (broadcastInProgress) {
      if (ctx.chat?.id) {
        await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⏳ Рассылка уже выполняется. Дождитесь отчёта.',
        ]);
      }
      return;
    }
    broadcastInProgress = true;

    try {
      await ctx.deleteMessage().catch(() => {});

      if (!ctx.from?.id) {
        return;
      }

      const ADMIN_ID = GlobalState.getAdminId();
      if (!Array.isArray(ADMIN_ID) || !ADMIN_ID.includes(ctx.from.id)) {
        const message = await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '⛔ У вас нет прав для этой команды.',
        ]);
        if (message) {
          deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
        return;
      }

      if (ctx.chat.type !== 'private') {
        const msg = await ctx.reply('⚠️ Команда доступна только в личных сообщениях с ботом.');
        return deleteMessageAfterDelay(ctx, msg.message_id, 6000);
      }

      let players;
      try {
        players = await getAllPlayersForBroadcast();
      } catch (error) {
        console.error('Ошибка чтения players для рассылки:', error);
        await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          '❌ Не удалось прочитать базу данных.',
        ]);
        return;
      }

      const rawRowCount = players.length;
      players = players.filter(
        (p) => p && /^\d+$/.test(String(p.id).trim()) && !isSyntheticPlayerId(p.id),
      );
      const skippedInvalid = rawRowCount - players.length;

      if (players.length === 0) {
        let msg = 'В базе нет игроков с подходящим Telegram id для рассылки.';
        if (skippedInvalid > 0) {
          msg += `\n(Пропущено записей без числового id или с синтетическим id: ${skippedInvalid})`;
        }
        await safeTelegramCall(ctx, 'sendMessage', [ctx.chat.id, msg]);
        return;
      }

      let statusText = `⏳ Рассылка… получателей: ${players.length}`;
      if (skippedInvalid > 0) {
        statusText += ` (пропущено строк в БД: ${skippedInvalid})`;
      }

      const statusMessage = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        statusText,
      ]);

      let sentOk = 0;
      const delivered = [];
      const failed = [];

      for (const p of players) {
        const sent = await sendPrivateMessage(bot, p.id, VK_BROADCAST_TEXT, SEND_OPTIONS);
        if (sent) {
          sentOk += 1;
          delivered.push({
            name: p.name,
            username: p.username,
            id: p.id,
          });
        } else {
          failed.push({
            name: p.name,
            username: p.username,
            id: p.id,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, MS_BETWEEN_RECIPIENTS));
      }

      if (statusMessage && statusMessage.message_id) {
        await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id).catch(() => {});
      }

      let report =
        '✅ <b>Рассылка завершена</b>\n\n' +
        'Отправлено: ' + sentOk + '\n' +
        'Не доставлено: ' + failed.length;
      if (skippedInvalid > 0) {
        report += '\nПропущено при подготовке (некорректный / синтетический id): ' + skippedInvalid;
      }

      report += '\n\n<b>Доставлено — name | username:</b>\n';
      report += delivered.length > 0
        ? delivered.map(formatPlayerLine).join('\n')
        : '—';

      report += '\n\n<b>Не доставлено — name | username (для ручной обработки):</b>\n';
      report += failed.length > 0
        ? failed.map(formatPlayerLine).join('\n')
        : '—';

      const parts = chunkByLines(report);
      for (let i = 0; i < parts.length; i += 1) {
        await safeTelegramCall(ctx, 'sendMessage', [
          ctx.chat.id,
          parts[i],
          { parse_mode: 'HTML' },
        ]);
        if (i < parts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
    } finally {
      broadcastInProgress = false;
    }
  };

  bot.command('send', handleSendBroadcast);
  bot.hears(/^send$/i, handleSendBroadcast);
};
