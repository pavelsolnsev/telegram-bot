const { GlobalState } = require('../store');
const { createTeamManagementButtons } = require('../utils/createTeamManagementButtons');
// Функция отправки сообщения с составами команд
const sendTeamsMessage = async (ctx, message) => {
  // Проверка на валидность ctx
  if (!ctx || !ctx.reply) {
    console.error('Ошибка: некорректный ctx в sendTeamsMessage');
    return;
  }

  // Проверка на валидность message
  if (!message || typeof message !== 'string') {
    console.error('Ошибка: некорректный message в sendTeamsMessage');
    return;
  }

  const sentMessage = await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: createTeamManagementButtons(GlobalState),
  });

  // Проверка на валидность sentMessage
  if (sentMessage && sentMessage.chat && sentMessage.chat.id && sentMessage.message_id) {
    GlobalState.setLastTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
  } else {
    console.error('Ошибка: некорректный ответ от ctx.reply в sendTeamsMessage');
  }
};

module.exports = { sendTeamsMessage };
