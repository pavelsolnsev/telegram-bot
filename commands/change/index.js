const { registerSwapHandlers } = require('./swapHandlers');
const { registerMoveHandlers } = require('./moveHandlers');
const { registerDistributeHandlers } = require('./distributeHandlers');

module.exports = (bot, GlobalState) => {
  // Регистрируем обработчики для обмена игроков
  registerSwapHandlers(bot, GlobalState);

  // Регистрируем обработчики для перемещения игроков
  registerMoveHandlers(bot, GlobalState);

  // Регистрируем обработчики для распределения игроков
  registerDistributeHandlers(bot, GlobalState);
};
