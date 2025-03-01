const { Markup } = require("telegraf");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");

module.exports = (bot, GlobalState) => {
  // Команда fin (оригинальная версия)
  bot.hears(/^fin$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      return ctx.reply("⛔ Нет активного матча!");
    }

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    let allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();

    const team1Goals = team1.reduce((sum, player) => sum + (player.goals || 0), 0);
    const team2Goals = team2.reduce((sum, player) => sum + (player.goals || 0), 0);

    let result;
    if (team1Goals > team2Goals) {
      result = "team1";
    } else if (team1Goals < team2Goals) {
      result = "team2";
    } else {
      result = "draw";
    }

    const updateTeamStats = (teamKey, isWin, isDraw) => {
      if (!teamStats[teamKey]) {
        teamStats[teamKey] = { wins: 0, losses: 0, draws: 0, games: 0 };
      }
      teamStats[teamKey].games += 1;
      if (isWin) teamStats[teamKey].wins += 1;
      if (!isWin && !isDraw) teamStats[teamKey].losses += 1;
      if (isDraw) teamStats[teamKey].draws += 1;
    };

    const updatePlayerStats = (team, originalTeam, isWin, isDraw, isLose) => {
      return team.map((player, index) => {
        const goals = player.goals || 0;
        const originalPlayer = originalTeam[index] || {};
        const totalGoals = (originalPlayer.goals || 0) + goals;

        let rating = originalPlayer.rating || 0;
        rating += goals * 0.5;
        if (isWin) rating += 3;
        if (isDraw) rating += 1;
        if (isLose) rating -= 1.5;

        return {
          ...originalPlayer,
          name: player.name,
          username: player.username,
          gamesPlayed: (originalPlayer.gamesPlayed || 0) + 1,
          wins: (originalPlayer.wins || 0) + (isWin ? 1 : 0),
          draws: (originalPlayer.draws || 0) + (isDraw ? 1 : 0),
          losses: (originalPlayer.losses || 0) + (isLose ? 1 : 0),
          goals: totalGoals,
          rating: rating,
        };
      });
    };

    updateTeamStats(`team${teamIndex1 + 1}`, result === "team1", result === "draw");
    updateTeamStats(`team${teamIndex2 + 1}`, result === "team2", result === "draw");

    allTeams[teamIndex1] = updatePlayerStats(team1, allTeams[teamIndex1], result === "team1", result === "draw", result === "team2");
    allTeams[teamIndex2] = updatePlayerStats(team2, allTeams[teamIndex2], result === "team2", result === "draw", result === "team1");

    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);
    GlobalState.setPlayingTeams(null);

    const allTeamsBase = GlobalState.getTeamsBase();
    const updatedMessage = buildTeamsMessage(allTeamsBase, "Составы команд после матча", teamStats);

    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
    if (lastTeamsMessage) {
      await ctx.telegram.editMessageText(
        lastTeamsMessage.chatId,
        lastTeamsMessage.messageId,
        null,
        updatedMessage,
        { parse_mode: "HTML" }
      );
    } else {
      const sentMessage = await ctx.reply(updatedMessage, { parse_mode: "HTML" });
      GlobalState.setLastTeamsMessageId(ctx.chat.id, sentMessage.message_id);
    }

    await ctx.reply("✅ Матч завершен, статистика обновлена!");
  });

  // Команда next (с фиксацией результатов и запуском следующего матча)
  bot.hears(/^next$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      return ctx.reply("⛔ Нет активного матча для продолжения!");
    }

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    let allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();

    const team1Goals = team1.reduce((sum, player) => sum + (player.goals || 0), 0);
    const team2Goals = team2.reduce((sum, player) => sum + (player.goals || 0), 0);

    let result;
    if (team1Goals > team2Goals) {
      result = "team1";
    } else if (team1Goals < team2Goals) {
      result = "team2";
    } else {
      result = "draw";
    }

    // Обновление статистики команд
    const updateTeamStats = (teamKey, isWin, isDraw) => {
      if (!teamStats[teamKey]) {
        teamStats[teamKey] = { wins: 0, losses: 0, draws: 0, games: 0, consecutiveWins: 0 };
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
    };

    // Обновление статистики игроков
    const updatePlayerStats = (team, originalTeam, isWin, isDraw, isLose) => {
      return team.map((player, index) => {
        const goals = player.goals || 0;
        const originalPlayer = originalTeam[index] || {};
        const totalGoals = (originalPlayer.goals || 0) + goals;

        let rating = originalPlayer.rating || 0;
        rating += goals * 0.5;
        if (isWin) rating += 3;
        if (isDraw) rating += 1;
        if (isLose) rating -= 1.5;

        return {
          ...originalPlayer,
          name: player.name,
          username: player.username,
          gamesPlayed: (originalPlayer.gamesPlayed || 0) + 1,
          wins: (originalPlayer.wins || 0) + (isWin ? 1 : 0),
          draws: (originalPlayer.draws || 0) + (isDraw ? 1 : 0),
          losses: (originalPlayer.losses || 0) + (isLose ? 1 : 0),
          goals: totalGoals,
          rating: rating,
        };
      });
    };

    updateTeamStats(`team${teamIndex1 + 1}`, result === "team1", result === "draw");
    updateTeamStats(`team${teamIndex2 + 1}`, result === "team2", result === "draw");

    allTeams[teamIndex1] = updatePlayerStats(team1, allTeams[teamIndex1], result === "team1", result === "draw", result === "team2");
    allTeams[teamIndex2] = updatePlayerStats(team2, allTeams[teamIndex2], result === "team2", result === "draw", result === "team1");

    // Сохранение обновленной статистики
    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);

    // Обновление сообщения о составах команд
    const allTeamsBase = GlobalState.getTeamsBase();
    const updatedMessage = buildTeamsMessage(allTeamsBase, "Составы команд после матча", teamStats);

    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
    if (lastTeamsMessage) {
      await ctx.telegram.editMessageText(
        lastTeamsMessage.chatId,
        lastTeamsMessage.messageId,
        null,
        updatedMessage,
        { parse_mode: "HTML" }
      );
    } else {
      const sentMessage = await ctx.reply(updatedMessage, { parse_mode: "HTML" });
      GlobalState.setLastTeamsMessageId(ctx.chat.id, sentMessage.message_id);
    }

    const totalTeams = allTeams.length;
    if (totalTeams <= 2) {
      GlobalState.setPlayingTeams(null);
      return ctx.reply("⛔ Недостаточно команд для следующего матча!");
    }

    const resetGoals = (team) => team.map(player => ({ ...player, goals: 0 }));
    let nextTeamIndex1, nextTeamIndex2;

    if (totalTeams === 3) {
      if (result === "team1") {
        nextTeamIndex1 = teamIndex1;
        nextTeamIndex2 = teamIndex1 === 0 && teamIndex2 === 1 ? 2 : 
                        teamIndex1 === 0 && teamIndex2 === 2 ? 1 : 
                        teamIndex1 === 1 && teamIndex2 === 0 ? 2 : 1;
        if (teamStats[`team${teamIndex1 + 1}`].consecutiveWins >= 3) {
          nextTeamIndex1 = teamIndex2;
          nextTeamIndex2 = [0, 1, 2].find(i => i !== teamIndex1 && i !== teamIndex2);
        }
      } else if (result === "team2") {
        nextTeamIndex1 = teamIndex2;
        nextTeamIndex2 = teamIndex2 === 0 && teamIndex1 === 1 ? 2 : 
                        teamIndex2 === 0 && teamIndex1 === 2 ? 1 : 
                        teamIndex2 === 1 && teamIndex1 === 0 ? 2 : 1;
        if (teamStats[`team${teamIndex2 + 1}`].consecutiveWins >= 3) {
          nextTeamIndex1 = teamIndex1;
          nextTeamIndex2 = [0, 1, 2].find(i => i !== teamIndex1 && i !== teamIndex2);
        }
      } else { // ничья
        const games1 = teamStats[`team${teamIndex1 + 1}`].games;
        const games2 = teamStats[`team${teamIndex2 + 1}`].games;
        nextTeamIndex1 = games1 <= games2 ? teamIndex1 : teamIndex2;
        nextTeamIndex2 = [0, 1, 2].find(i => i !== teamIndex1 && i !== teamIndex2);
      }
    } else if (totalTeams >= 4) {
      if (result === "team1") {
        nextTeamIndex1 = teamIndex1;
        if (teamStats[`team${teamIndex1 + 1}`].consecutiveWins >= 3) {
          const availableTeams = allTeams.map((_, i) => i)
            .filter(i => i !== teamIndex1 && i !== teamIndex2)
            .sort((a, b) => teamStats[`team${a + 1}`].games - teamStats[`team${b + 1}`].games);
          nextTeamIndex1 = availableTeams[0];
          nextTeamIndex2 = availableTeams[1];
        } else {
          nextTeamIndex2 = allTeams.map((_, i) => i)
            .filter(i => i !== teamIndex1 && i !== teamIndex2)
            .sort((a, b) => teamStats[`team${a + 1}`].games - teamStats[`team${b + 1}`].games)[0];
        }
      } else if (result === "team2") {
        nextTeamIndex1 = teamIndex2;
        if (teamStats[`team${teamIndex2 + 1}`].consecutiveWins >= 3) {
          const availableTeams = allTeams.map((_, i) => i)
            .filter(i => i !== teamIndex1 && i !== teamIndex2)
            .sort((a, b) => teamStats[`team${a + 1}`].games - teamStats[`team${b + 1}`].games);
          nextTeamIndex1 = availableTeams[0];
          nextTeamIndex2 = availableTeams[1];
        } else {
          nextTeamIndex2 = allTeams.map((_, i) => i)
            .filter(i => i !== teamIndex1 && i !== teamIndex2)
            .sort((a, b) => teamStats[`team${a + 1}`].games - teamStats[`team${b + 1}`].games)[0];
        }
      } else { // ничья
        const availableTeams = allTeams.map((_, i) => i)
          .filter(i => i !== teamIndex1 && i !== teamIndex2)
          .sort((a, b) => teamStats[`team${a + 1}`].games - teamStats[`team${b + 1}`].games);
        nextTeamIndex1 = availableTeams[0];
        nextTeamIndex2 = availableTeams[1];
      }
    }

    const team1Next = resetGoals(allTeams[nextTeamIndex1]);
    const team2Next = resetGoals(allTeams[nextTeamIndex2]);

    const teamsMessage = buildPlayingTeamsMessage(team1Next, team2Next, nextTeamIndex1, nextTeamIndex2);
    const sentMessage = await ctx.reply(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(team1Next, nextTeamIndex1),
        ...createTeamButtons(team2Next, nextTeamIndex2),
      ]).reply_markup,
    });

    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
    GlobalState.setPlayingTeams({
      team1: team1Next,
      team2: team2Next,
      teamIndex1: nextTeamIndex1,
      teamIndex2: nextTeamIndex2,
    });

    await ctx.reply(`🏀 Автоматически начат новый матч: Команда ${nextTeamIndex1 + 1} vs Команда ${nextTeamIndex2 + 1}`);
  });
};