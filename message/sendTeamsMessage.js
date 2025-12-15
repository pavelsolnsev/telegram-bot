const { Markup } = require('telegraf');
const { GlobalState } = require('../store');
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

  const isTableAllowed = GlobalState.getIsTableAllowed();
  const playingTeams = GlobalState.getPlayingTeams();

  const buttons = [];

  if (isTableAllowed) {
    // Если составы объявлены - показываем кнопку выбора команд
    buttons.push([Markup.button.callback('🎯 Выбрать команды для матча', 'select_teams_callback')]);
  } else {
    // Если составы не объявлены - показываем кнопку выбора команд (заблокированную) и кнопку объявления
    buttons.push([Markup.button.callback('🎯 Выбрать команды для матча', 'select_teams_blocked')]);
    buttons.push([Markup.button.callback('📢 Объявить составы', 'announce_teams')]);
  }
  // Кнопка "Сменить игрока" показывается всегда, когда матч не идет (независимо от isTableAllowed)
  if (!playingTeams) {
    buttons.push([Markup.button.callback('🔄 Сменить игрока', 'change_player_callback')]);
  }

  const inlineKeyboard = Markup.inlineKeyboard(buttons);

  const sentMessage = await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard.reply_markup,
  });

  // Проверка на валидность sentMessage
  if (sentMessage && sentMessage.chat && sentMessage.chat.id && sentMessage.message_id) {
    GlobalState.setLastTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
  } else {
    console.error('Ошибка: некорректный ответ от ctx.reply в sendTeamsMessage');
  }
};

module.exports = { sendTeamsMessage };
