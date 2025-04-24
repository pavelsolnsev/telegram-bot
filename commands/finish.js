const { Markup } = require("telegraf");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");

// Вспомогательные функции остаются без изменений
const checkAdminRights = async (ctx, ADMIN_ID) => {
  await ctx.deleteMessage().catch(() => {});
  if (!ADMIN_ID.includes(ctx.from.id)) {
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⛔ У вас нет прав для этой команды.",
    ]);
    deleteMessageAfterDelay(ctx, message.message_id);
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
    deleteMessageAfterDelay(ctx, message.message_id);
    return false;
  }
  return true;
};

const getMatchResult = (team1, team2) => {
  const team1Goals = team1.reduce((sum, player) => sum + (player.goals || 0), 0);
  const team2Goals = team2.reduce((sum, player) => sum + (player.goals || 0), 0);
  return team1Goals > team2Goals ? "team1" : team1Goals < team2Goals ? "team2" : "draw";
};

const updateTeamStats = (teamStats, teamKey, isWin, isDraw, goalsScored, goalsConceded) => {
  if (!teamStats[teamKey]) {
    teamStats[teamKey] = { wins: 0, losses: 0, draws: 0, games: 0, consecutiveWins: 0, goalsScored: 0, goalsConceded: 0 };
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

const updateTeamsMessage = async (ctx, GlobalState, allTeamsBase, teamStats) => {
  const updatedMessage = buildTeamsMessage(allTeamsBase, "Составы команд после матча", teamStats, GlobalState.getTeams());
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
  bot.hears(/^fn$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!await checkAdminRights(ctx, ADMIN_ID)) return;
    if (!await checkMatchStarted(ctx, GlobalState.getStart())) return;

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
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
    GlobalState.setPlayingTeams(null);

    const finishedMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, 'finished');
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

    const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "✅ Матч завершен, статистика обновлена!",
    ]);
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });

  bot.hears(/^nt$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!await checkAdminRights(ctx, ADMIN_ID)) return;
    if (!await checkMatchStarted(ctx, GlobalState.getStart())) return;
  
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
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    let allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const result = getMatchResult(team1, team2);
  
    const team1Goals = team1.reduce((sum, player) => sum + (player.goals || 0), 0);
    const team2Goals = team2.reduce((sum, player) => sum + (player.goals || 0), 0);
  
    // Обновляем статистику с учетом оппонентов в серии
    const updateTeamStatsWithOpponents = (teamStats, teamKey, isWin, isDraw, goalsScored, goalsConceded, opponentIndex) => {
      if (!teamStats[teamKey]) {
        teamStats[teamKey] = { 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          games: 0, 
          consecutiveWins: 0, 
          goalsScored: 0, 
          goalsConceded: 0,
          opponentsInCurrentStreak: []
        };
      } else if (!Array.isArray(teamStats[teamKey].opponentsInCurrentStreak)) {
        // Если объект существует, но opponentsInCurrentStreak отсутствует или не массив
        teamStats[teamKey].opponentsInCurrentStreak = [];
      }
      teamStats[teamKey].games += 1;
      if (isWin) {
        teamStats[teamKey].wins += 1;
        teamStats[teamKey].consecutiveWins += 1;
        if (!teamStats[teamKey].opponentsInCurrentStreak.includes(opponentIndex)) {
          teamStats[teamKey].opponentsInCurrentStreak.push(opponentIndex);
        }
      } else {
        teamStats[teamKey].consecutiveWins = 0;
        teamStats[teamKey].opponentsInCurrentStreak = []; // Сброс при прерывании серии
      }
      if (!isWin && !isDraw) teamStats[teamKey].losses += 1;
      if (isDraw) {
        teamStats[teamKey].draws += 1;
        teamStats[teamKey].consecutiveWins = 0;
        teamStats[teamKey].opponentsInCurrentStreak = []; // Сброс при ничьей
      }
      teamStats[teamKey].goalsScored += goalsScored;
      teamStats[teamKey].goalsConceded += goalsConceded;
    };
  
    updateTeamStatsWithOpponents(teamStats, `team${teamIndex1 + 1}`, result === "team1", result === "draw", team1Goals, team2Goals, teamIndex2);
    updateTeamStatsWithOpponents(teamStats, `team${teamIndex2 + 1}`, result === "team2", result === "draw", team2Goals, team1Goals, teamIndex1);
  
    allTeams[teamIndex1] = updatePlayerStats(team1, allTeams[teamIndex1], result === "team1", result === "draw", result === "team2");
    allTeams[teamIndex2] = updatePlayerStats(team2, allTeams[teamIndex2], result === "team2", result === "draw", result === "team1");
  
    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);
  
    const finishedMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, 'finished');
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
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    const resetGoals = (team) => team.map(player => ({ ...player, goals: 0 }));
    let nextTeamIndex1, nextTeamIndex2;
  
    // Получаем все доступные команды (кроме текущих играющих)
    let availableTeams = allTeams.map((_, i) => i)
      .filter(i => i !== teamIndex1 && i !== teamIndex2);
  
    if (totalTeams === 3) {
      const thirdTeamIndex = availableTeams[0];
      if (result === "team1") {
        if (teamStats[`team${teamIndex1 + 1}`].consecutiveWins >= 3) {
          nextTeamIndex1 = teamIndex2;
          nextTeamIndex2 = thirdTeamIndex;
          teamStats[`team${teamIndex1 + 1}`].consecutiveWins = 0;
          teamStats[`team${teamIndex1 + 1}`].opponentsInCurrentStreak = [];
        } else {
          nextTeamIndex1 = teamIndex1;
          nextTeamIndex2 = thirdTeamIndex;
        }
      } else if (result === "team2") {
        if (teamStats[`team${teamIndex2 + 1}`].consecutiveWins >= 3) {
          nextTeamIndex1 = teamIndex1;
          nextTeamIndex2 = thirdTeamIndex;
          teamStats[`team${teamIndex2 + 1}`].consecutiveWins = 0;
          teamStats[`team${teamIndex2 + 1}`].opponentsInCurrentStreak = [];
        } else {
          nextTeamIndex1 = teamIndex2;
          nextTeamIndex2 = thirdTeamIndex;
        }
      } else {
        if (teamStats[`team${teamIndex1 + 1}`].games >= teamStats[`team${teamIndex2 + 1}`].games) {
          nextTeamIndex1 = teamIndex2;
          nextTeamIndex2 = thirdTeamIndex;
        } else {
          nextTeamIndex1 = teamIndex1;
          nextTeamIndex2 = thirdTeamIndex;
        }
      }
    } else {
      // Логика для 4 команд
      // Сортируем доступные команды по количеству игр (меньше игр — выше приоритет)
      availableTeams.sort((a, b) => {
        const aStats = teamStats[`team${a + 1}`] || { games: 0 };
        const bStats = teamStats[`team${b + 1}`] || { games: 0 };
        return aStats.games - bStats.games;
      });
  
      if (result === "team1") {
        const team1Stats = teamStats[`team${teamIndex1 + 1}`];
        if (team1Stats.consecutiveWins >= 3 && team1Stats.opponentsInCurrentStreak.length === 3) {
          // 2) Команда 1 выиграла 3 раза подряд и сыграла со всеми → садится
          nextTeamIndex1 = availableTeams[0]; // Две команды с минимальным количеством игр
          nextTeamIndex2 = availableTeams[1];
          team1Stats.consecutiveWins = 0; // Сброс серии
          team1Stats.opponentsInCurrentStreak = []; // Сброс оппонентов
        } else {
          // 1) Команда 1 победила → остается
          nextTeamIndex1 = teamIndex1; // Победитель
          // 3 & 4) Выбираем оппонента, с которым еще не играли, с минимальным количеством игр
          const remainingOpponents = availableTeams.filter(i => !team1Stats.opponentsInCurrentStreak.includes(i));
          nextTeamIndex2 = remainingOpponents.length > 0 ? remainingOpponents[0] : availableTeams[0];
        }
      } else if (result === "team2") {
        const team2Stats = teamStats[`team${teamIndex2 + 1}`];
        if (team2Stats.consecutiveWins >= 3 && team2Stats.opponentsInCurrentStreak.length === 3) {
          // 2) Команда 2 выиграла 3 раза подряд и сыграла со всеми → садится
          nextTeamIndex1 = availableTeams[0]; // Две команды с минимальным количеством игр
          nextTeamIndex2 = availableTeams[1];
          team2Stats.consecutiveWins = 0; // Сброс серии
          team2Stats.opponentsInCurrentStreak = []; // Сброс оппонентов
        } else {
          // 1) Команда 2 победила → остается
          nextTeamIndex1 = teamIndex2; // Победитель
          // 3 & 4) Выбираем оппонента, с которым еще не играли, с минимальным количеством игр
          const remainingOpponents = availableTeams.filter(i => !team2Stats.opponentsInCurrentStreak.includes(i));
          nextTeamIndex2 = remainingOpponents.length > 0 ? remainingOpponents[0] : availableTeams[0];
        }
      } else {
        // 5) Ничья → обе команды садятся, заходят две другие с минимальным количеством игр
        nextTeamIndex1 = availableTeams[0];
        nextTeamIndex2 = availableTeams[1];
      }
    }
  
    const team1Next = resetGoals(allTeams[nextTeamIndex1]);
    const team2Next = resetGoals(allTeams[nextTeamIndex2]);
  
    const teamsMessage = buildPlayingTeamsMessage(team1Next, team2Next, nextTeamIndex1, nextTeamIndex2, 'playing');
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
      teamIndex2: nextTeamIndex2 
    });
  
    const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `🏀 Автоматически начат новый матч: Команда ${nextTeamIndex1 + 1} vs Команда ${nextTeamIndex2 + 1}`,
    ]);
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });
};