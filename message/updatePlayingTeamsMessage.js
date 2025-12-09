const { Markup } = require('telegraf');
const { GlobalState } = require('../store');
const { buildPlayingTeamsMessage } = require('./buildPlayingTeamsMessage');
const { safeTelegramCall } = require('../utils/telegramUtils');
const _ = require('lodash'); // Импортируем всю библиотеку lodash

// Базовая функция обновления сообщения
const updatePlayingTeamsMessageBase = async (ctx) => {
  const playingTeamsMessageId = GlobalState.getPlayingTeamsMessageId();
  const playingTeams = GlobalState.getPlayingTeams();

  if (!playingTeamsMessageId || !playingTeams) {
    console.log('Ошибка: playingTeamsMessageId или playingTeams отсутствуют!');
    return;
  }

  // Вычисляем номер матча
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;

  const teamsMessage = buildPlayingTeamsMessage(
    playingTeams.team1,
    playingTeams.team2,
    playingTeams.teamIndex1,
    playingTeams.teamIndex2,
    'playing',
    undefined,
    matchNumber,
  );

  await safeTelegramCall(ctx, 'editMessageText', [
    playingTeamsMessageId.chatId,
    playingTeamsMessageId.messageId,
    null,
    teamsMessage,
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('⚽ Отметить голы', 'show_goals_menu')],
        [Markup.button.callback('🅰️ Отметить ассист', 'show_assists_menu')],
        [Markup.button.callback('⏭️ Следующий матч', 'ksk_confirm')],
        [Markup.button.callback('⚙️ Управление', 'management_menu')],
      ]).reply_markup,
    },
  ]);
};

// Debounced версия функции (обновление не чаще раза в 1 секунду)
const updatePlayingTeamsMessage = _.debounce(updatePlayingTeamsMessageBase, 1000, {
  leading: false, // Не вызывать сразу
  trailing: true,  // Вызвать после завершения серии вызовов
});

module.exports = { updatePlayingTeamsMessage };
