const { Markup } = require("telegraf");
const {
  buildPlayingTeamsMessage,
} = require("../../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../../utils/telegramUtils");
const {
  getMatchResult,
  updateTeamStats,
  updatePlayerStats,
  updateTeamsMessage,
} = require("../../utils/matchHelpers");

// Функция завершения матча
const finishMatch = async (ctx, GlobalState) => {
  const playingTeams = GlobalState.getPlayingTeams();
  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⛔ Нет активного матча!",
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  // Сохраняем текущее состояние перед изменениями
  GlobalState.pushMatchHistory({
    teams: JSON.parse(JSON.stringify(GlobalState.getTeams())),
    teamStats: JSON.parse(JSON.stringify(GlobalState.getTeamStats())),
    matchHistory: JSON.parse(JSON.stringify(GlobalState.getMatchHistory())),
    consecutiveGames: JSON.parse(
      JSON.stringify(GlobalState.getConsecutiveGames())
    ),
    playingTeams: JSON.parse(JSON.stringify(GlobalState.getPlayingTeams())),
  });

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  let allTeams = GlobalState.getTeams();
  const teamStats = GlobalState.getTeamStats();
  const allTeamsBase = GlobalState.getTeamsBase();
  const result = getMatchResult(team1, team2);

  const team1Goals = team1.reduce(
    (sum, player) => sum + (player.goals || 0),
    0
  );
  const team2Goals = team2.reduce(
    (sum, player) => sum + (player.goals || 0),
    0
  );

  GlobalState.addMatchResult({
    teamIndex1,
    teamIndex2,
    score1: team1Goals,
    score2: team2Goals,
    players1: team1.map((p) => ({
      name: p.username || p.name,
      goals: p.goals || 0,
    })),
    players2: team2.map((p) => ({
      name: p.username || p.name,
      goals: p.goals || 0,
    })),
  });

  updateTeamStats(
    teamStats,
    `team${teamIndex1 + 1}`,
    result === "team1",
    result === "draw",
    team1Goals,
    team2Goals
  );
  updateTeamStats(
    teamStats,
    `team${teamIndex2 + 1}`,
    result === "team2",
    result === "draw",
    team2Goals,
    team1Goals
  );

  allTeams[teamIndex1] = updatePlayerStats(
    team1,
    allTeams[teamIndex1],
    result === "team1",
    result === "draw",
    result === "team2",
    allTeamsBase,
    teamIndex1,
    team1Goals,
    team2Goals
  );
  allTeams[teamIndex2] = updatePlayerStats(
    team2,
    allTeams[teamIndex2],
    result === "team2",
    result === "draw",
    result === "team1",
    allTeamsBase,
    teamIndex2,
    team2Goals,
    team1Goals
  );

  GlobalState.setTeams(allTeams);
  GlobalState.setTeamStats(teamStats);
  GlobalState.setPlayingTeams(null);
  GlobalState.setIsMatchFinished(true);

  // Вычисляем номер завершённого матча
  const matchResults = GlobalState.getMatchResults();
  const finishedMatchNumber = matchResults.length;

  const finishedMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    teamIndex1,
    teamIndex2,
    "finished",
    undefined,
    finishedMatchNumber
  );
  const playingTeamsMessage = GlobalState.getPlayingTeamsMessageId();
  if (playingTeamsMessage) {
    await safeTelegramCall(ctx, "editMessageText", [
      playingTeamsMessage.chatId,
      playingTeamsMessage.messageId,
      null,
      finishedMessage,
      { parse_mode: "HTML" },
    ]);
  }

  await updateTeamsMessage(ctx, GlobalState, allTeamsBase, teamStats);

  const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
    ctx.chat.id,
    "✅ Матч завершен, статистика обновлена!",
  ]);
  deleteMessageAfterDelay(ctx, notificationMessage.message_id);
};

// Функция выполнения команды ksk (переход к следующему матчу)
const executeKskCommand = async (ctx, GlobalState, checkAdminRights, checkMatchStarted) => {
  if (!(await checkAdminRights(ctx, GlobalState.getAdminId()))) return false;
  if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return false;

  if (ctx.chat.id < 0) {
    const msg = await ctx.reply("Напиши мне в ЛС.");
    deleteMessageAfterDelay(ctx, msg.message_id);
    return false;
  }

  const playingTeams = GlobalState.getPlayingTeams();
  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⛔ Нет активного матча для продолжения!",
    ]);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
    return false;
  }

  // Сохраняем текущее состояние перед изменениями
  GlobalState.pushMatchHistory({
    teams: JSON.parse(JSON.stringify(GlobalState.getTeams())),
    teamStats: JSON.parse(JSON.stringify(GlobalState.getTeamStats())),
    matchHistory: JSON.parse(JSON.stringify(GlobalState.getMatchHistory())),
    consecutiveGames: JSON.parse(
      JSON.stringify(GlobalState.getConsecutiveGames())
    ),
    playingTeams: JSON.parse(JSON.stringify(GlobalState.getPlayingTeams())),
  });

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  let allTeams = GlobalState.getTeams();
  const teamStats = GlobalState.getTeamStats();
  const allTeamsBase = GlobalState.getTeamsBase();
  const result = getMatchResult(team1, team2);

  const team1Goals = team1.reduce(
    (sum, player) => sum + (player.goals || 0),
    0
  );
  const team2Goals = team2.reduce(
    (sum, player) => sum + (player.goals || 0),
    0
  );

  GlobalState.addMatchResult({
    teamIndex1,
    teamIndex2,
    score1: team1Goals,
    score2: team2Goals,
    players1: team1.map((p) => ({
      name: p.username || p.name,
      goals: p.goals || 0,
    })),
    players2: team2.map((p) => ({
      name: p.username || p.name,
      goals: p.goals || 0,
    })),
  });

  updateTeamStats(
    teamStats,
    `team${teamIndex1 + 1}`,
    result === "team1",
    result === "draw",
    team1Goals,
    team2Goals
  );
  updateTeamStats(
    teamStats,
    `team${teamIndex2 + 1}`,
    result === "team2",
    result === "draw",
    team2Goals,
    team1Goals
  );

  allTeams[teamIndex1] = updatePlayerStats(
    team1,
    allTeams[teamIndex1],
    result === "team1",
    result === "draw",
    result === "team2",
    allTeamsBase,
    teamIndex1,
    team1Goals,
    team2Goals
  );
  allTeams[teamIndex2] = updatePlayerStats(
    team2,
    allTeams[teamIndex2],
    result === "team2",
    result === "draw",
    result === "team1",
    allTeamsBase,
    teamIndex2,
    team2Goals,
    team1Goals
  );

  GlobalState.setTeams(allTeams);
  GlobalState.setTeamStats(teamStats);

  // Вычисляем номер завершённого матча после ksk
  const matchResultsAfterKsk = GlobalState.getMatchResults();
  const finishedMatchNumberAfterKsk = matchResultsAfterKsk.length;

  const finishedMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    teamIndex1,
    teamIndex2,
    "finished",
    undefined,
    finishedMatchNumberAfterKsk
  );
  const playingTeamsMessage = GlobalState.getPlayingTeamsMessageId();
  if (playingTeamsMessage) {
    await safeTelegramCall(ctx, "editMessageText", [
      playingTeamsMessage.chatId,
      playingTeamsMessage.messageId,
      null,
      finishedMessage,
      { parse_mode: "HTML" },
    ]);
  }

  await updateTeamsMessage(ctx, GlobalState, allTeamsBase, teamStats);

  const totalTeams = allTeams.length;
  if (totalTeams <= 2) {
    GlobalState.setPlayingTeams(null);
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⛔ Недостаточно команд для следующего матча!",
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const previousTeamCount = GlobalState.getTeamCount();
  if (previousTeamCount !== totalTeams) {
    GlobalState.setMatchHistory({});
    GlobalState.setTeamCount(totalTeams);
    GlobalState.setConsecutiveGames({});
  }

  const resetGoals = (team) =>
    team.map((player) => ({ ...player, goals: 0 }));

  let matchHistory = GlobalState.getMatchHistory();
  for (let i = 0; i < totalTeams; i++) {
    if (!matchHistory[i]) matchHistory[i] = {};
  }

  matchHistory[teamIndex1][teamIndex2] =
    (matchHistory[teamIndex1][teamIndex2] || 0) + 1;
  matchHistory[teamIndex2][teamIndex1] =
    (matchHistory[teamIndex2][teamIndex1] || 0) + 1;

  let consecutiveGames = GlobalState.getConsecutiveGames() || {};
  consecutiveGames[teamIndex1] = (consecutiveGames[teamIndex1] || 0) + 1;
  consecutiveGames[teamIndex2] = (consecutiveGames[teamIndex2] || 0) + 1;

  for (let i = 0; i < totalTeams; i++) {
    if (i !== teamIndex1 && i !== teamIndex2) consecutiveGames[i] = 0;
  }

  const allMatchups = [];
  for (let i = 0; i < totalTeams; i++) {
    for (let j = i + 1; j < totalTeams; j++) {
      allMatchups.push([i, j]);
    }
  }

  const minMatchesPlayed = Math.min(
    ...allMatchups.map(([i, j]) => matchHistory[i]?.[j] || 0)
  );
  if (
    allMatchups.every(
      ([i, j]) => (matchHistory[i]?.[j] || 0) >= minMatchesPlayed + 1
    )
  ) {
    matchHistory = {};
    for (let i = 0; i < totalTeams; i++) matchHistory[i] = {};
    GlobalState.setMatchHistory(matchHistory);
  }

  let nextTeamIndex1 = null;
  let nextTeamIndex2 = null;
  let minGames = Infinity;

  for (const [i, j] of allMatchups) {
    if (consecutiveGames[i] >= 2 || consecutiveGames[j] >= 2) continue;

    const gamesPlayed = matchHistory[i]?.[j] || 0;
    if (gamesPlayed < minGames) {
      minGames = gamesPlayed;
      nextTeamIndex1 = i;
      nextTeamIndex2 = j;
    } else if (gamesPlayed === minGames) {
      const iGames = teamStats[`team${i + 1}`]?.games || 0;
      const jGames = teamStats[`team${j + 1}`]?.games || 0;
      const currentMinGames =
        (teamStats[`team${nextTeamIndex1 + 1}`]?.games || 0) +
        (teamStats[`team${nextTeamIndex2 + 1}`]?.games || 0);
      if (iGames + jGames < currentMinGames) {
        nextTeamIndex1 = i;
        nextTeamIndex2 = j;
      }
    }
  }

  if (nextTeamIndex1 === null || nextTeamIndex2 === null) {
    const msg = await ctx.reply(
      "⛔ Не удалось подобрать команды, которые не играли 3 раза подряд."
    );
    return deleteMessageAfterDelay(ctx, msg.message_id);
  }

  GlobalState.setConsecutiveGames(consecutiveGames);
  GlobalState.setMatchHistory(matchHistory);

  GlobalState.setIsMatchFinished(true);

  const team1Next = resetGoals(allTeams[nextTeamIndex1]);
  const team2Next = resetGoals(allTeams[nextTeamIndex2]);

  // Вычисляем номер следующего активного матча
  const nextMatchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const nextMatchNumber = nextMatchHistoryLength + 1;

  const teamsMessage = buildPlayingTeamsMessage(
    team1Next,
    team2Next,
    nextTeamIndex1,
    nextTeamIndex2,
    "playing",
    undefined,
    nextMatchNumber
  );
  const sentMessage = await safeTelegramCall(ctx, "sendMessage", [
    ctx.chat.id,
    teamsMessage,
    {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(team1Next, nextTeamIndex1),
        ...createTeamButtons(team2Next, nextTeamIndex2),
        [], // Пустая строка для разделения
        [Markup.button.callback("⏭️ Следующий матч", "ksk_confirm")],
        [Markup.button.callback("🏁 Закончить матч", "finish_match")],
        [Markup.button.callback("⚙️ Управление", "management_menu")],
      ]).reply_markup,
    },
  ]);

  GlobalState.setPlayingTeamsMessageId(
    sentMessage.chat.id,
    sentMessage.message_id
  );
  GlobalState.setPlayingTeams({
    team1: team1Next,
    team2: team2Next,
    teamIndex1: nextTeamIndex1,
    teamIndex2: nextTeamIndex2,
  });

  return true;
};

module.exports = {
  finishMatch,
  executeKskCommand,
};

