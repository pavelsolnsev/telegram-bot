const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeTelegramCall = async (ctx, method, payload, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ctx.telegram[method](...payload);
    } catch (error) {
      const description = error?.response?.description || "";
      // Игнорируем ошибки, если сообщение не изменилось или не найдено
      if (
        description.includes("message is not modified") ||
        description.includes("message to edit not found")
      ) {
        return null;
      }
      // Ретрай при rate limit или gateway timeout
      if (error.code === 429 || error.code === 504) {
        const retryAfter = (error?.response?.parameters?.retry_after || 1) * 1000;
        console.warn(`Error ${error.code} in ${method}, retrying after ${retryAfter}ms (attempt ${attempt}/${retries})`);
        await delay(retryAfter);
        continue;
      }
      // Логируем и пробрасываем остальные ошибки
      console.error(`Error in ${method} (attempt ${attempt}/${retries}):`, error);
      throw error;
    }
  }
  throw new Error(`Failed after ${retries} retries`);
};

module.exports = { safeTelegramCall };