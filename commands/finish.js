const { Markup } = require("telegraf");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const {
  buildPlayingTeamsMessage,
} = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");

// Existing helper functions (unchanged)
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

const updatePlayerStats = (team, originalTeam, isWin, isDraw, isLose) => {
  return team.map((player, index) => {
    const goals = player.goals || 0;
    const originalPlayer = originalTeam[index] || {};
    const totalGoals = (originalPlayer.goals || 0) + goals;
    let rating = originalPlayer.rating || 0;
    rating += goals * 0.5 + (isWin ? 3 : isDraw ? 1 : isLose ? -1.5 : 0);

    return {
      ...originalPlayer,
      name: player.name,
      username: player.username,
      gamesPlayed: (originalPlayer.gamesPlayed || 0) + 1,
      wins: (originalPlayer.wins || 0) + (isWin ? 1 : 0),
      draws: (originalPlayer.draws || 0) + (isDraw ? 1 : 0),
      losses: (originalPlayer.losses || 0) + (isLose ? 1 : 0),
      goals: totalGoals,
      rating,
    };
  });
};

const updateTeamsMessage = async (
  ctx,
  GlobalState,
  allTeamsBase,
  teamStats
) => {
  const updatedMessage = buildTeamsMessage(
    allTeamsBase,
    "Составы команд после матча",
    teamStats,
    GlobalState.getTeams()
  );
  const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
  if (lastTeamsMessage) {
    await safeTelegramCall(ctx, "editMessageText", [
      lastTeamsMessage.chatId,
      lastTeamsMessage.messageId,
      null,
      updatedMessage,
      { parse_mode: "HTML" },
    ]);
  } else {
    const sentMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      updatedMessage,
      { parse_mode: "HTML" },
    ]);
    GlobalState.setLastTeamsMessageId(ctx.chat.id, sentMessage.message_id);
  }
};

module.exports = (bot, GlobalState) => {
  // Existing 'fn' command (unchanged)
  bot.hears(/^fn$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;
    if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return;

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    let allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const result = getMatchResult(team1, team2);

    const team1Goals = team1.reduce(
      (sum, player) => sum + (player.goals || 0),
      0
    );
    const team2Goals = team2.reduce(
      (sum, player) => sum + (player.goals || 0),
      0
    );

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
      result === "team2"
    );
    allTeams[teamIndex2] = updatePlayerStats(
      team2,
      allTeams[teamIndex2],
      result === "team2",
      result === "draw",
      result === "team1"
    );

    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);
    GlobalState.setPlayingTeams(null);
    GlobalState.setIsMatchFinished(true);

    const finishedMessage = buildPlayingTeamsMessage(
      team1,
      team2,
      teamIndex1,
      teamIndex2,
      "finished"
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

    await updateTeamsMessage(
      ctx,
      GlobalState,
      GlobalState.getTeamsBase(),
      teamStats
    );

    const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "✅ Матч завершен, статистика обновлена!",
    ]);
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });

  bot.hears(/^end$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;
    if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return;

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча для отмены!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    const playingTeamsMessage = GlobalState.getPlayingTeamsMessageId();
    if (playingTeamsMessage) {
      await safeTelegramCall(ctx, "editMessageText", [
        playingTeamsMessage.chatId,
        playingTeamsMessage.messageId,
        null,
        buildPlayingTeamsMessage(
          team1,
          team2,
          teamIndex1,
          teamIndex2,
          "canceled"
        ),
        { parse_mode: "HTML" },
      ]);
    }

    GlobalState.setPlayingTeams(null);
    GlobalState.setPlayingTeamsMessageId(null, null);

    const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "🚫 Матч отменен!",
    ]);
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });

  bot.hears(/^nt$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;
    if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return;

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча для продолжения!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    let allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const result = getMatchResult(team1, team2);

    const team1Goals = team1.reduce(
      (sum, player) => sum + (player.goals || 0),
      0
    );
    const team2Goals = team2.reduce(
      (sum, player) => sum + (player.goals || 0),
      0
    );

    const updateTeamStatsWithOpponents = (
      teamStats,
      teamKey,
      isWin,
      isDraw,
      goalsScored,
      goalsConceded,
      opponentIndex
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
          opponentsInCurrentStreak: [],
        };
      } else if (!Array.isArray(teamStats[teamKey].opponentsInCurrentStreak)) {
        teamStats[teamKey].opponentsInCurrentStreak = [];
      }
      teamStats[teamKey].games += 1;
      if (isWin) {
        teamStats[teamKey].wins += 1;
        teamStats[teamKey].consecutiveWins += 1;
        if (
          !teamStats[teamKey].opponentsInCurrentStreak.includes(opponentIndex)
        ) {
          teamStats[teamKey].opponentsInCurrentStreak.push(opponentIndex);
        }
      } else {
        teamStats[teamKey].consecutiveWins = 0;
        teamStats[teamKey].opponentsInCurrentStreak = [];
      }
      if (!isWin && !isDraw) teamStats[teamKey].losses += 1;
      if (isDraw) {
        teamStats[teamKey].draws += 1;
        teamStats[teamKey].consecutiveWins = 0;
        teamStats[teamKey].opponentsInCurrentStreak = [];
      }
      teamStats[teamKey].goalsScored += goalsScored;
      teamStats[teamKey].goalsConceded += goalsConceded;
    };

    updateTeamStatsWithOpponents(
      teamStats,
      `team${teamIndex1 + 1}`,
      result === "team1",
      result === "draw",
      team1Goals,
      team2Goals,
      teamIndex2
    );
    updateTeamStatsWithOpponents(
      teamStats,
      `team${teamIndex2 + 1}`,
      result === "team2",
      result === "draw",
      team2Goals,
      team1Goals,
      teamIndex1
    );

    allTeams[teamIndex1] = updatePlayerStats(
      team1,
      allTeams[teamIndex1],
      result === "team1",
      result === "draw",
      result === "team2"
    );
    allTeams[teamIndex2] = updatePlayerStats(
      team2,
      allTeams[teamIndex2],
      result === "team2",
      result === "draw",
      result === "team1"
    );

    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);

    const finishedMessage = buildPlayingTeamsMessage(
      team1,
      team2,
      teamIndex1,
      teamIndex2,
      "finished"
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

    await updateTeamsMessage(
      ctx,
      GlobalState,
      GlobalState.getTeamsBase(),
      teamStats
    );

    const totalTeams = allTeams.length;
    if (totalTeams <= 2) {
      GlobalState.setPlayingTeams(null);
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Недостаточно команд для следующего матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const resetGoals = (team) =>
      team.map((player) => ({ ...player, goals: 0 }));
    let nextTeamIndex1, nextTeamIndex2;

    let availableTeams = allTeams
      .map((_, i) => i)
      .filter((i) => i !== teamIndex1 && i !== teamIndex2);

    if (totalTeams === 3) {
      const thirdTeamIndex = availableTeams[0];
      if (result === "team1") {
        if (teamStats[`team${teamIndex1 + 1}`].consecutiveWins >= 2) {
          nextTeamIndex1 = teamIndex2;
          nextTeamIndex2 = thirdTeamIndex;
          teamStats[`team${teamIndex1 + 1}`].consecutiveWins = 0;
          teamStats[`team${teamIndex1 + 1}`].opponentsInCurrentStreak = [];
        } else {
          nextTeamIndex1 = teamIndex1;
          nextTeamIndex2 = thirdTeamIndex;
        }
      } else if (result === "team2") {
        if (teamStats[`team${teamIndex2 + 1}`].consecutiveWins >= 2) {
          nextTeamIndex1 = teamIndex1;
          nextTeamIndex2 = thirdTeamIndex;
          teamStats[`team${teamIndex2 + 1}`].consecutiveWins = 0;
          teamStats[`team${teamIndex2 + 1}`].opponentsInCurrentStreak = [];
        } else {
          nextTeamIndex1 = teamIndex2;
          nextTeamIndex2 = thirdTeamIndex;
        }
      } else {
        if (
          teamStats[`team${teamIndex1 + 1}`].games >=
          teamStats[`team${teamIndex2 + 1}`].games
        ) {
          nextTeamIndex1 = teamIndex2;
          nextTeamIndex2 = thirdTeamIndex;
        } else {
          nextTeamIndex1 = teamIndex1;
          nextTeamIndex2 = thirdTeamIndex;
        }
      }
    } else {
      availableTeams.sort((a, b) => {
        const aStats = teamStats[`team${a + 1}`] || { games: 0 };
        const bStats = teamStats[`team${b + 1}`] || { games: 0 };
        return aStats.games - bStats.games;
      });

      if (result === "team1") {
        const team1Stats = teamStats[`team${teamIndex1 + 1}`];
        if (
          team1Stats.consecutiveWins >= 2 &&
          team1Stats.opponentsInCurrentStreak.length === 2
        ) {
          nextTeamIndex1 = availableTeams[0];
          nextTeamIndex2 = availableTeams[1];
          team1Stats.consecutiveWins = 0;
          team1Stats.opponentsInCurrentStreak = [];
        } else {
          nextTeamIndex1 = teamIndex1;
          const remainingOpponents = availableTeams.filter(
            (i) => !team1Stats.opponentsInCurrentStreak.includes(i)
          );
          nextTeamIndex2 =
            remainingOpponents.length > 0
              ? remainingOpponents[0]
              : availableTeams[0];
        }
      } else if (result === "team2") {
        const team2Stats = teamStats[`team${teamIndex2 + 1}`];
        if (
          team2Stats.consecutiveWins >= 2 &&
          team2Stats.opponentsInCurrentStreak.length === 2
        ) {
          nextTeamIndex1 = availableTeams[0];
          nextTeamIndex2 = availableTeams[1];
          team2Stats.consecutiveWins = 0;
          team2Stats.opponentsInCurrentStreak = [];
        } else {
          nextTeamIndex1 = teamIndex2;
          const remainingOpponents = availableTeams.filter(
            (i) => !team2Stats.opponentsInCurrentStreak.includes(i)
          );
          nextTeamIndex2 =
            remainingOpponents.length > 0
              ? remainingOpponents[0]
              : availableTeams[0];
        }
      } else {
        nextTeamIndex1 = availableTeams[0];
        nextTeamIndex2 = availableTeams[1];
      }
    }

    const team1Next = resetGoals(allTeams[nextTeamIndex1]);
    const team2Next = resetGoals(allTeams[nextTeamIndex2]);

    const teamsMessage = buildPlayingTeamsMessage(
      team1Next,
      team2Next,
      nextTeamIndex1,
      nextTeamIndex2,
      "playing"
    );
    const sentMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      teamsMessage,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          ...createTeamButtons(team1Next, nextTeamIndex1),
          ...createTeamButtons(team2Next, nextTeamIndex2),
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

    const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `🏀 Автоматически начат новый матч: Команда ${
        nextTeamIndex1 + 1
      } vs Команда ${nextTeamIndex2 + 1}`,
    ]);
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });

  bot.hears(/^bl$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;
    if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return;

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча для продолжения!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    let allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const result = getMatchResult(team1, team2);

    const team1Goals = team1.reduce(
      (sum, player) => sum + (player.goals || 0),
      0
    );
    const team2Goals = team2.reduce(
      (sum, player) => sum + (player.goals || 0),
      0
    );

    // Update team stats without tracking opponents or consecutive wins
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
      result === "team2"
    );
    allTeams[teamIndex2] = updatePlayerStats(
      team2,
      allTeams[teamIndex2],
      result === "team2",
      result === "draw",
      result === "team1"
    );

    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);

    const finishedMessage = buildPlayingTeamsMessage(
      team1,
      team2,
      teamIndex1,
      teamIndex2,
      "finished"
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

    await updateTeamsMessage(
      ctx,
      GlobalState,
      GlobalState.getTeamsBase(),
      teamStats
    );

    const totalTeams = allTeams.length;
    if (totalTeams <= 2) {
      GlobalState.setPlayingTeams(null);
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Недостаточно команд для следующего матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const resetGoals = (team) =>
      team.map((player) => ({ ...player, goals: 0 }));
    const availableTeams = allTeams.map((_, i) => i);
    availableTeams.sort((a, b) => {
      const aStats = teamStats[`team${a + 1}`] || { games: 0 };
      const bStats = teamStats[`team${b + 1}`] || { games: 0 };
      return aStats.games - bStats.games;
    });

    const nextTeamIndex1 = availableTeams[0];
    const nextTeamIndex2 = availableTeams[1];

    const team1Next = resetGoals(allTeams[nextTeamIndex1]);
    const team2Next = resetGoals(allTeams[nextTeamIndex2]);

    const teamsMessage = buildPlayingTeamsMessage(
      team1Next,
      team2Next,
      nextTeamIndex1,
      nextTeamIndex2,
      "playing"
    );
    const sentMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      teamsMessage,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          ...createTeamButtons(team1Next, nextTeamIndex1),
          ...createTeamButtons(team2Next, nextTeamIndex2),
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

    const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `🏀 Автоматически начат новый матч: Команда ${
        nextTeamIndex1 + 1
      } vs Команда ${nextTeamIndex2 + 1} (балансировка игр)`,
    ]);
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });

bot.hears(/^ksk$/i, async (ctx) => {
  const ADMIN_ID = GlobalState.getAdminId();
  if (!(await checkAdminRights(ctx, ADMIN_ID))) return;
  if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return;

  if (ctx.chat.id < 0) {
    const msg = await ctx.reply("Напиши мне в ЛС.");
    return deleteMessageAfterDelay(ctx, msg.message_id);
  }

  const playingTeams = GlobalState.getPlayingTeams();
  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⛔ Нет активного матча для продолжения!",
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  let allTeams = GlobalState.getTeams();
  const teamStats = GlobalState.getTeamStats();
  const result = getMatchResult(team1, team2);

  const team1Goals = team1.reduce((sum, player) => sum + (player.goals || 0), 0);
  const team2Goals = team2.reduce((sum, player) => sum + (player.goals || 0), 0);

  updateTeamStats(teamStats, `team${teamIndex1 + 1}`, result === "team1", result === "draw", team1Goals, team2Goals);
  updateTeamStats(teamStats, `team${teamIndex2 + 1}`, result === "team2", result === "draw", team2Goals, team1Goals);

  allTeams[teamIndex1] = updatePlayerStats(team1, allTeams[teamIndex1], result === "team1", result === "draw", result === "team2");
  allTeams[teamIndex2] = updatePlayerStats(team2, allTeams[teamIndex2], result === "team2", result === "draw", result === "team1");

  GlobalState.setTeams(allTeams);
  GlobalState.setTeamStats(teamStats);

  const finishedMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, "finished");
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

  await updateTeamsMessage(ctx, GlobalState, GlobalState.getTeamsBase(), teamStats);

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

  const resetGoals = (team) => team.map((player) => ({ ...player, goals: 0 }));

  let matchHistory = GlobalState.getMatchHistory();
  for (let i = 0; i < totalTeams; i++) {
    if (!matchHistory[i]) matchHistory[i] = {};
  }

  matchHistory[teamIndex1][teamIndex2] = (matchHistory[teamIndex1][teamIndex2] || 0) + 1;
  matchHistory[teamIndex2][teamIndex1] = (matchHistory[teamIndex2][teamIndex1] || 0) + 1;

  // === ЛОГИКА ПРОПУСКА ПОСЛЕ 2 ИГР ПОДРЯД ===
  let consecutiveGames = GlobalState.getConsecutiveGames() || {};
  consecutiveGames[teamIndex1] = (consecutiveGames[teamIndex1] || 0) + 1;
  consecutiveGames[teamIndex2] = (consecutiveGames[teamIndex2] || 0) + 1;

  // Все остальные сбрасываются
  for (let i = 0; i < totalTeams; i++) {
    if (i !== teamIndex1 && i !== teamIndex2) consecutiveGames[i] = 0;
  }

  // === ВЫБОР СЛЕДУЮЩЕЙ ПАРЫ ===
  const allMatchups = [];
  for (let i = 0; i < totalTeams; i++) {
    for (let j = i + 1; j < totalTeams; j++) {
      allMatchups.push([i, j]);
    }
  }

  // Проверка равномерности
  const minMatchesPlayed = Math.min(...allMatchups.map(([i, j]) => (matchHistory[i]?.[j]) || 0));
  if (allMatchups.every(([i, j]) => (matchHistory[i]?.[j] || 0) >= minMatchesPlayed + 1)) {
    matchHistory = {};
    for (let i = 0; i < totalTeams; i++) matchHistory[i] = {};
    GlobalState.setMatchHistory(matchHistory);
  }

  let nextTeamIndex1 = null;
  let nextTeamIndex2 = null;
  let minGames = Infinity;

  for (const [i, j] of allMatchups) {
    if ((consecutiveGames[i] >= 2) || (consecutiveGames[j] >= 2)) continue;

    const gamesPlayed = matchHistory[i]?.[j] || 0;
    if (gamesPlayed < minGames) {
      minGames = gamesPlayed;
      nextTeamIndex1 = i;
      nextTeamIndex2 = j;
    } else if (gamesPlayed === minGames) {
      const iGames = teamStats[`team${i + 1}`]?.games || 0;
      const jGames = teamStats[`team${j + 1}`]?.games || 0;
      const currentMinGames = (teamStats[`team${nextTeamIndex1 + 1}`]?.games || 0) + (teamStats[`team${nextTeamIndex2 + 1}`]?.games || 0);
      if (iGames + jGames < currentMinGames) {
        nextTeamIndex1 = i;
        nextTeamIndex2 = j;
      }
    }
  }

  if (nextTeamIndex1 === null || nextTeamIndex2 === null) {
    const msg = await ctx.reply("⛔ Не удалось подобрать команды, которые не играли 3 раза подряд.");
    return deleteMessageAfterDelay(ctx, msg.message_id);
  }

  GlobalState.setConsecutiveGames(consecutiveGames);
  GlobalState.setMatchHistory(matchHistory);

  const team1Next = resetGoals(allTeams[nextTeamIndex1]);
  const team2Next = resetGoals(allTeams[nextTeamIndex2]);

  const teamsMessage = buildPlayingTeamsMessage(
    team1Next,
    team2Next,
    nextTeamIndex1,
    nextTeamIndex2,
    "playing"
  );
  const sentMessage = await safeTelegramCall(ctx, "sendMessage", [
    ctx.chat.id,
    teamsMessage,
    {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(team1Next, nextTeamIndex1),
        ...createTeamButtons(team2Next, nextTeamIndex2),
      ]).reply_markup,
    },
  ]);

  GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
  GlobalState.setPlayingTeams({
    team1: team1Next,
    team2: team2Next,
    teamIndex1: nextTeamIndex1,
    teamIndex2: nextTeamIndex2,
  });

  const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
    ctx.chat.id,
    `🏀 Автоматически начат новый матч: Команда ${nextTeamIndex1 + 1} vs Команда ${nextTeamIndex2 + 1} (каждая с каждой, с учётом отдыха)`,
  ]);
  deleteMessageAfterDelay(ctx, notificationMessage.message_id);
});

};
