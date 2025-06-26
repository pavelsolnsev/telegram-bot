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
  // Проверка прав администратора
  if (!(await checkAdminRights(ctx, ADMIN_ID))) return;
  // Проверка, начат ли матч
  if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return;

  // Проверка, что команда отправлена в личные сообщения
  if (ctx.chat.id < 0) {
    const msg = await ctx.reply("Напиши мне в ЛС.");
    return deleteMessageAfterDelay(ctx, msg.message_id);
  }

  const playingTeams = GlobalState.getPlayingTeams();
  // Проверка, есть ли активный матч
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

  // Обновление статистики команд
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

  // Обновление статистики игроков
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

  // Обновление сообщения о завершённом матче
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

  // Обновление общего сообщения о составах команд
  await updateTeamsMessage(
    ctx,
    GlobalState,
    GlobalState.getTeamsBase(),
    teamStats
  );

  const totalTeams = allTeams.length;
  // Проверка, достаточно ли команд для следующего матча
  if (totalTeams <= 2) {
    GlobalState.setPlayingTeams(null);
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⛔ Недостаточно команд для следующего матча!",
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  // Проверка изменения количества команд
  const previousTeamCount = GlobalState.getTeamCount();
  if (previousTeamCount !== totalTeams) {
    GlobalState.setMatchHistory({}); // Сбрасываем историю матчей
    GlobalState.setTeamCount(totalTeams); // Обновляем количество команд
  }

  // Сброс голов для следующего матча
  const resetGoals = (team) =>
    team.map((player) => ({ ...player, goals: 0 }));

  let nextTeamIndex1, nextTeamIndex2;
  let matchHistory = GlobalState.getMatchHistory();

  if (totalTeams === 3) {
    // Инициализация истории для всех команд
    for (let i = 0; i < totalTeams; i++) {
      if (!matchHistory[i]) matchHistory[i] = {};
    }

    // Обновление истории матчей
    matchHistory[teamIndex1][teamIndex2] = (matchHistory[teamIndex1][teamIndex2] || 0) + 1;
    matchHistory[teamIndex2][teamIndex1] = (matchHistory[teamIndex2][teamIndex1] || 0) + 1;

    // Проверяем, первый ли это матч
    const totalGames = Object.values(matchHistory).reduce(
      (sum, opponents) => sum + Object.values(opponents).reduce((s, v) => s + v, 0),
      0
    );
    const isFirstMatch = totalGames <= 2;

    if (isFirstMatch && result !== "draw") {
      // Победитель первого матча играет следующий
      const winnerIndex = result === "team1" ? teamIndex1 : teamIndex2;
      const thirdTeamIndex = [0, 1, 2].find(
        (i) => i !== teamIndex1 && i !== teamIndex2
      );
      nextTeamIndex1 = winnerIndex;
      nextTeamIndex2 = thirdTeamIndex;
    } else {
      // Строгая очередность: 1-2, 2-3, 3-1
      const lastPair = [teamIndex1, teamIndex2].sort().join("-");
      if (lastPair === "0-1") {
        nextTeamIndex1 = 1;
        nextTeamIndex2 = 2;
      } else if (lastPair === "1-2") {
        nextTeamIndex1 = 2;
        nextTeamIndex2 = 0;
      } else if (lastPair === "0-2") {
        nextTeamIndex1 = 0;
        nextTeamIndex2 = 1;
      }
    }
  } else {
    // Логика для 4+ команд
    for (let i = 0; i < totalTeams; i++) {
      if (!matchHistory[i]) matchHistory[i] = {};
    }
    matchHistory[teamIndex1][teamIndex2] = (matchHistory[teamIndex1][teamIndex2] || 0) + 1;
    matchHistory[teamIndex2][teamIndex1] = (matchHistory[teamIndex2][teamIndex1] || 0) + 1;

    // Генерация всех возможных пар
    const allMatchups = [];
    for (let i = 0; i < totalTeams; i++) {
      for (let j = i + 1; j < totalTeams; j++) {
        allMatchups.push([i, j]);
      }
    }

    // Проверка, все ли пары сыграли одинаковое количество матчей
    const minMatchesPlayed = Math.min(
      ...allMatchups.map(([i, j]) => (matchHistory[i] && matchHistory[i][j]) || 0)
    );
    if (allMatchups.every(([i, j]) => (matchHistory[i] && matchHistory[i][j]) >= minMatchesPlayed + 1)) {
      matchHistory = {};
      GlobalState.setMatchHistory(matchHistory);
      for (let i = 0; i < totalTeams; i++) {
        matchHistory[i] = {};
      }
    }

    // Поиск следующей пары с минимальным количеством сыгранных матчей
    let minGames = Infinity;
    for (const [i, j] of allMatchups) {
      const gamesPlayed = (matchHistory[i] && matchHistory[i][j]) || 0;
      if (gamesPlayed < minGames) {
        minGames = gamesPlayed;
        nextTeamIndex1 = i;
        nextTeamIndex2 = j;
      } else if (gamesPlayed === minGames) {
        // Разрешение конфликта: выбираем команды с меньшим количеством игр
        const iGames = (teamStats[`team${i + 1}`]?.games || 0);
        const jGames = (teamStats[`team${j + 1}`]?.games || 0);
        const currentMinGames = (teamStats[`team${nextTeamIndex1 + 1}`]?.games || 0) +
                                (teamStats[`team${nextTeamIndex2 + 1}`]?.games || 0);
        if (iGames + jGames < currentMinGames) {
          nextTeamIndex1 = i;
          nextTeamIndex2 = j;
        }
      }
    }
  }

  GlobalState.setMatchHistory(matchHistory);

  const team1Next = resetGoals(allTeams[nextTeamIndex1]);
  const team2Next = resetGoals(allTeams[nextTeamIndex2]);

  // Формирование сообщения о новом матче
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

  // Обновление состояния текущего матча
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

  // Уведомление о новом матче
  const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
    ctx.chat.id,
    `🏀 Автоматически начат новый матч: Команда ${
      nextTeamIndex1 + 1
    } vs Команда ${nextTeamIndex2 + 1} (каждый с каждым)`,
  ]);
  deleteMessageAfterDelay(ctx, notificationMessage.message_id);
});
};
