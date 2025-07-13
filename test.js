BOT_TOKEN=7628509164:AAG6GPSzIcRsn1Qg1a4p2GMURpUSGsuR6PA
ID=-1002341289414

# TEST
# ID=-1002501938260
ADMIN_ID=312571900,455425840,7696486238
IMAGE_URL=https://www.meme-arsenal.com/memes/a69b26bcf26d80f28a6422ebac425b5f.jpg

DB_HOST=pavels3f.beget.tech
DB_USER=pavels3f_fball
DB_PASSWORD=Spas3082330275!
DB_NAME=pavels3f_fball


# DB_HOST=pavels3f.beget.tech
# DB_USER=pavels3f_test
# DB_PASSWORD=Spas3082330275!
# DB_NAME=pavels3f_test

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


  

  const updatePlayerStats = (team, originalTeam, isWin, isDraw, isLose) => {
  return team.map((player, index) => {
    const goals = player.goals || 0;
    const originalPlayer = team[index] || originalTeam[index] || {};
    const totalGoals = (originalPlayer.goals || 0) + goals;
    const gamesPlayed = (originalPlayer.gamesPlayed || 0) + 1;

    // Расчёт изменения рейтинга (пункт 6 + бонус за участие)
    let ratingChange = (isWin ? 2 : isDraw ? 0.5 : -1) + (goals * 0.3) + 0.1;

    // Уменьшение прироста для высокого рейтинга
    const normalizedRating = (originalPlayer.rating || 0) / (originalPlayer.gamesPlayed || 1);
    const multiplier = 1 / (1 + 0.05 * normalizedRating);
    const adjustedChange = ratingChange * multiplier;

    // Обновление абсолютного рейтинга
    let newRating = (originalPlayer.rating || 0) + adjustedChange;

    // Нормализация рейтинга (пункт 1)
    let finalRating = gamesPlayed >= 3 ? newRating / gamesPlayed : newRating;

    return {
      ...originalPlayer,
      name: player.name,
      username: player.username,
      gamesPlayed,
      wins: (originalPlayer.wins || 0) + (isWin ? 1 : 0),
      draws: (originalPlayer.draws || 0) + (isDraw ? 1 : 0),
      losses: (originalPlayer.losses || 0) + (isLose ? 1 : 0),
      goals: totalGoals,
      rating: finalRating,
    };
  });
};

module.exports = updatePlayerStats;