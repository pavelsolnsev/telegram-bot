const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeAnswerCallback = async (ctx, text, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ctx.answerCbQuery(text);
    } catch (error) {
      const description = error?.description || '';
      // Игнорируем устаревшие callback-запросы
      if (error.code === 400 && description.includes('query is too old')) {
        console.warn(`Callback query устарел, пропускаем ответ: ${text}`);
        return null;
      }
      // Ретрай при rate limit или gateway timeout
      if (error.code === 429 || error.code === 504) {
        const retryAfter = (error?.response?.parameters?.retry_after || 1) * 1000;
        console.warn(`Error ${error.code} in answerCbQuery, retrying after ${retryAfter}ms (attempt ${attempt}/${retries})`);
        await delay(retryAfter);
        continue;
      }
      // Логируем и пробрасываем остальные ошибки
      console.error(`Error in answerCbQuery (attempt ${attempt}/${retries}):`, error);
      if (attempt === retries) {
        throw new Error(`Failed after ${retries} retries: ${error.message}`);
      }
    }
  }
};

module.exports = { safeAnswerCallback };
