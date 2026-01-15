const { registerSwapHandlers } = require('./swapHandlers');
const { registerMoveHandlers } = require('./moveHandlers');

module.exports = (bot, GlobalState) => {
  // Регистрируем обработчики для обмена игроков
  registerSwapHandlers(bot, GlobalState);
  
  // Регистрируем обработчики для перемещения игроков
  registerMoveHandlers(bot, GlobalState);
};
