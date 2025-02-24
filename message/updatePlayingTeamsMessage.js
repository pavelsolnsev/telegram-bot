
const { Markup } = require("telegraf");
const { GlobalState } = require("../store");
const { buildPlayingTeamsMessage } = require("./buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");

const updatePlayingTeamsMessage = async (ctx) => {
  const playingTeamsMessageId = GlobalState.getPlayingTeamsMessageId();
  const playingTeams = GlobalState.getPlayingTeams();

  if (!playingTeamsMessageId || !playingTeams) {
    console.log("Ошибка: playingTeamsMessageId или playingTeams отсутствуют!");
    return;
  }

  if (!playingTeamsMessageId || !playingTeams) {
    return;
  }

  const teamsMessage = buildPlayingTeamsMessage(
    playingTeams.team1,
    playingTeams.team2,
    playingTeams.teamIndex1,
    playingTeams.teamIndex2
  );

  try {
    await ctx.telegram.editMessageText(
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
      }
    );
  } catch (error) {
    console.error("Ошибка при обновлении сообщения с играющими командами:", error);
  }
};

module.exports = { updatePlayingTeamsMessage };