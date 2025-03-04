const { Markup } = require("telegraf");
const { GlobalState } = require("../store");
const { buildPlayingTeamsMessage } = require("./buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { safeTelegramCall } = require("../utils/telegramUtils");
const _ = require("lodash"); // Импортируем всю библиотеку lodash

// Базовая функция обновления сообщения
const updatePlayingTeamsMessageBase = async (ctx) => {
  const playingTeamsMessageId = GlobalState.getPlayingTeamsMessageId();
  const playingTeams = GlobalState.getPlayingTeams();

  if (!playingTeamsMessageId || !playingTeams) {
    console.log("Ошибка: playingTeamsMessageId или playingTeams отсутствуют!");
    return;
  }

  const teamsMessage = buildPlayingTeamsMessage(
    playingTeams.team1,
    playingTeams.team2,
    playingTeams.teamIndex1,
    playingTeams.teamIndex2
  );

  await safeTelegramCall(ctx, "editMessageText", [
    playingTeamsMessageId.chatId,
    playingTeamsMessageId.messageId,
    null,
    teamsMessage,
    {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(playingTeams.team1, playingTeams.teamIndex1),
        ...createTeamButtons(playingTeams.team2, playingTeams.teamIndex2),
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