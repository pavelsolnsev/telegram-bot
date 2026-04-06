const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Синтетические id игроков без Telegram (как в getPlayerByName), строка или число */
function isSyntheticPlayerId(userId) {
  try {
    const s = String(userId).trim();
    if (!/^\d+$/.test(s)) {
      return false;
    }
    const bi = BigInt(s);
    return bi >= 100000n && bi < 200000n;
  } catch {
    return false;
  }
}

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {number|string} userId
 * @param {string} message
 * @param {Record<string, unknown> & { floodMaxRetries?: number }} [options]
 */
const sendPrivateMessage = async (bot, userId, message, options = {}) => {
  if (isSyntheticPlayerId(userId)) {
    return null;
  }

  const floodMaxRetries = typeof options.floodMaxRetries === 'number' ? options.floodMaxRetries : 0;
  const telegramOptions = { ...options };
  delete telegramOptions.floodMaxRetries;

  const chatId = /^\d+$/.test(String(userId).trim()) ? String(userId).trim() : userId;

  for (let floodAttempt = 0; ; floodAttempt += 1) {
    try {
      const sent = await bot.telegram.sendMessage(chatId, message, telegramOptions);
      return sent;
    } catch (error) {
      const errorCode = error.response?.error_code;
      const errorDescription = error.response?.description || '';
      const retryAfter = error.response?.parameters?.retry_after;

      if (errorCode === 429 && floodAttempt < floodMaxRetries) {
        const waitMs = Math.max(1000, (Number(retryAfter) || 1) * 1000);
        console.warn(
          `FloodWait ${waitMs}ms при отправке ${userId} (попытка ${floodAttempt + 1}/${floodMaxRetries})`,
        );
        await delay(waitMs);
        continue;
      }

      if (errorCode === 403 || errorDescription.includes('bot was blocked')) {
        console.log(`Пользователь ${userId} заблокировал бота`);
        return null;
      }
      if (
        errorCode === 400
        && (errorDescription.includes('chat not found') || errorDescription.includes('have no access'))
      ) {
        console.log(`Чат с ID ${userId} не найден или нет доступа`);
        return null;
      }

      console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, error.message || error);
      return null;
    }
  }
};

module.exports = { sendPrivateMessage, isSyntheticPlayerId };
