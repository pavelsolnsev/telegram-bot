const { Markup } = require("telegraf");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");

// Проверка прав администратора
const checkAdminRights = async (ctx, ADMIN_ID) => {
  await ctx.deleteMessage().catch(() => {});
  if (!ADMIN_ID.includes(ctx.from.id)) {
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⛔ У вас нет прав для этой команды.",
    ]);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
    return false;
  }
  return true;
};

// Проверка, начат ли матч
const checkMatchStarted = async (ctx, isMatchStarted) => {
  if (!isMatchStarted) {
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⚠️ Матч не начат!",
    ]);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
    return false;
  }
  return true;
};

// Определение результата матча
const getMatchResult = (team1, team2) => {
  const team1Goals = team1.reduce(
    (sum, player) => sum + (player.goals || 0),
    0
  );
  const team2Goals = team2.reduce(
    (sum, player) => sum + (player.goals || 0),
    0
  );
  return team1Goals > team2Goals
    ? "team1"
    : team1Goals < team2Goals
    ? "team2"
    : "draw";
};

// Обновление статистики команды
const updateTeamStats = (
  teamStats,
  teamKey,
  isWin,
  isDraw,
  goalsScored,
  goalsConceded
) => {
  if (!teamStats[teamKey]) {
    teamStats[teamKey] = {
      wins: 0,
      losses: 0,
      draws: 0,
      games: 0,
      consecutiveWins: 0,
      goalsScored: 0,
      goalsConceded: 0,
    };
  }
  teamStats[teamKey].games += 1;
  if (isWin) {
    teamStats[teamKey].wins += 1;
    teamStats[teamKey].consecutiveWins += 1;
  } else {
    teamStats[teamKey].consecutiveWins = 0;
  }
  if (!isWin && !isDraw) teamStats[teamKey].losses += 1;
  if (isDraw) teamStats[teamKey].draws += 1;

  teamStats[teamKey].goalsScored += goalsScored;
  teamStats[teamKey].goalsConceded += goalsConceded;
};

// Округление до 1 знака после запятой
const round1 = (n) => Math.round(n * 10) / 10;

// Модификатор роста рейтинга
const growthModifier = (baseRating) => Math.max(0.2, 1 - baseRating / 200);

// Обновление статистики игрока
const updatePlayerStats = (
  team,
  originalTeam,
  isWin,
  isDraw,
  isLose,
  allTeamsBase,
  teamIndex,
  teamGoals,
  opponentGoals
) => {
  return team.map((player, index) => {
    const goals = Number(player.goals) || 0;

    const originalPlayer = originalTeam[index] || {};
    const basePlayer = allTeamsBase[teamIndex][index] || {};
    const prevRating = Number(originalPlayer.rating) || 0;
    const baseRating = Number(basePlayer.rating) || 0;
    const mod = growthModifier(baseRating);

    const goalDelta = goals * 0.5 * mod;

    const isShutoutWin = isWin && teamGoals >= 3 && opponentGoals === 0;
    const isShutoutLoss = isLose && opponentGoals >= 3 && teamGoals === 0;

    const winDelta = isShutoutWin ? 3 * mod : isWin ? 2 * mod : 0;
    const drawDelta = isDraw ? 0.5 * mod : 0;
    const loseDelta = isShutoutLoss ? -1.5 : isLose ? -1 : 0;

    const delta = goalDelta + winDelta + drawDelta + loseDelta;

    const newRating = round1(Math.min(prevRating + delta, 200));

    return {
      ...originalPlayer,
      id: player.id,
      name: player.name,
      username: player.username,
      gamesPlayed: (originalPlayer.gamesPlayed || 0) + 1,
      wins: (originalPlayer.wins || 0) + (isWin ? 1 : 0),
      draws: (originalPlayer.draws || 0) + (isDraw ? 1 : 0),
      losses: (originalPlayer.losses || 0) + (isLose ? 1 : 0),
      goals: (originalPlayer.goals || 0) + goals,
      rating: newRating,
    };
  });
};

// Обновление сообщения с командами
const updateTeamsMessage = async (
  ctx,
  GlobalState,
  allTeamsBase,
  teamStats
) => {
  const updatedMessage = buildTeamsMessage(
    allTeamsBase,
    "Таблица",
    teamStats,
    GlobalState.getTeams(),
    null,
    false
  );
  const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_callback"),
  ]);
  
  if (lastTeamsMessage) {
    await safeTelegramCall(ctx, "editMessageText", [
      lastTeamsMessage.chatId,
      lastTeamsMessage.messageId,
      null,
      updatedMessage,
      {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      },
    ]);
  } else {
    const sentMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      updatedMessage,
      {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      },
    ]);
    GlobalState.setLastTeamsMessageId(ctx.chat.id, sentMessage.message_id);
  }
};

module.exports = {
  checkAdminRights,
  checkMatchStarted,
  getMatchResult,
  updateTeamStats,
  updatePlayerStats,
  updateTeamsMessage,
};

