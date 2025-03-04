const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeTelegramCall = async (ctx, method, payload, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await ctx.telegram[method](...payload);
    } catch (error) {
      if (error.code === 429) {
        const retryAfter = (error.response.parameters.retry_after || 1) * 1000;
        console.log(`Too Many Requests, retrying after ${retryAfter}ms`);
        await delay(retryAfter);
      } else {
        console.error(`Error in ${method}:`, error);
        throw error;
      }
    }
  }
  throw new Error(`Failed after ${retries} retries`);
};


module.exports = { safeTelegramCall };