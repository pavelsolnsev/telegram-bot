const { Markup } = require("telegraf");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const {
  buildPlayingTeamsMessage,
} = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");

// Вспомогательные функции
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

const round1 = (n) => Math.round(n * 10) / 10;

const growthModifier = (baseRating) => Math.max(0.2, 1 - baseRating / 200);

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
  // Команда fn
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

    await updateTeamsMessage(ctx, GlobalState, allTeamsBase, teamStats);

    const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "✅ Матч завершен, статистика обновлена!",
    ]);
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
  });

  // Функция выполнения команды ksk (вынесена для переиспользования)
  const executeKskCommand = async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return false;
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
          [], // Пустая строка для разделения
          [Markup.button.callback("⏭️ Следующий матч", "ksk_confirm")],
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
      `Команда ${nextTeamIndex1 + 1} vs Команда ${nextTeamIndex2 + 1}`,
    ]);
    deleteMessageAfterDelay(ctx, notificationMessage.message_id);
    return true;
  };

  // Команда ksk (текстовый ввод)
  bot.hears(/^ksk$/i, async (ctx) => {
    await executeKskCommand(ctx);
  });

  // Обработчик первого нажатия кнопки KSK (подтверждение)
  bot.action("ksk_confirm", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();

    // Проверка прав админа
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    // Проверка условий
    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, "⚠️ Матч не начат!");
      return;
    }

    if (!playingTeams) {
      await safeAnswerCallback(ctx, "⛔ Нет активного матча для продолжения!");
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (!chatId || chatId < 0) {
      await safeAnswerCallback(ctx, "⚠️ Команда доступна только в личных сообщениях!");
      return;
    }

    // Показываем подтверждающее сообщение с кнопками
    const confirmMessage = await safeTelegramCall(ctx, "sendMessage", [
      chatId,
      "⚠️ <b>Подтверждение перехода к следующему матчу</b>\n\n" +
      "Текущий матч будет завершен, статистика обновлена, и начнется следующий матч.\n\n" +
      "Вы уверены, что хотите продолжить?",
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Подтвердить", "ksk_execute"),
            Markup.button.callback("❌ Отмена", "ksk_cancel"),
          ],
        ]).reply_markup,
      },
    ]);

    // Удаляем сообщение с подтверждением через 30 секунд
    if (confirmMessage) {
      setTimeout(() => {
        safeTelegramCall(ctx, "deleteMessage", [
          chatId,
          confirmMessage.message_id,
        ]).catch(() => {
          // Игнорируем ошибки, если сообщение уже удалено
        });
      }, 30000);
    }

    await safeAnswerCallback(ctx, "Подтвердите переход к следующему матчу");
  });

  // Обработчик подтверждения выполнения команды KSK
  bot.action("ksk_execute", async (ctx) => {
    // Удаляем сообщение с подтверждением
    if (ctx.callbackQuery?.message) {
      await safeTelegramCall(ctx, "deleteMessage", [
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id,
      ]).catch(() => {
        // Игнорируем ошибки, если сообщение уже удалено
      });
    }

    await safeAnswerCallback(ctx, "✅ Переход к следующему матчу...");
    await executeKskCommand(ctx);
  });

  // Обработчик отмены выполнения команды KSK
  bot.action("ksk_cancel", async (ctx) => {
    // Удаляем сообщение с подтверждением
    if (ctx.callbackQuery?.message) {
      await safeTelegramCall(ctx, "deleteMessage", [
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id,
      ]).catch(() => {
        // Игнорируем ошибки, если сообщение уже удалено
      });
    }

    await safeAnswerCallback(ctx, "❌ Переход к следующему матчу отменен");
  });


  bot.hears(/^end$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;

    const isMatchFinished = GlobalState.getIsMatchFinished();
    const isMatchStarted = GlobalState.getStart();

    // Если есть завершённый матч (после fn/ksk) — откатываем изменения
    if (isMatchFinished) {
      const previousState = GlobalState.popMatchHistory();
      if (!previousState) {
        const message = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          "⛔ Нет истории для отката!",
        ]);
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Удаляем последний матч из результатов
      const results = GlobalState.getMatchResults();
      if (results.length > 0) {
        results.pop();
      }

      // Откатываем состояние
      GlobalState.setTeams(previousState.teams);
      GlobalState.setTeamStats(previousState.teamStats);
      GlobalState.setMatchHistory(previousState.matchHistory);
      GlobalState.setConsecutiveGames(previousState.consecutiveGames);
      GlobalState.setPlayingTeams(previousState.playingTeams);
      GlobalState.setIsMatchFinished(false);

      // Обновляем сообщение с командами после отката
      await updateTeamsMessage(
        ctx,
        GlobalState,
        GlobalState.getTeamsBase(),
        previousState.teamStats
      );

      // Восстанавливаем сообщение с активным матчем (если было)
      if (previousState.playingTeams) {
        const { team1, team2, teamIndex1, teamIndex2 } =
          previousState.playingTeams;
        const teamsMessage = buildPlayingTeamsMessage(
          team1,
          team2,
          teamIndex1,
          teamIndex2,
          "playing"
        );
        const sent = await safeTelegramCall(ctx, "sendMessage", [
          ctx.chat.id,
          teamsMessage,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([
              ...createTeamButtons(team1, teamIndex1),
              ...createTeamButtons(team2, teamIndex2),
            ]).reply_markup,
          },
        ]);
        GlobalState.setPlayingTeamsMessageId(sent.chat.id, sent.message_id);
      }

      const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⏪ Последний матч отменён, статистика восстановлена!",
      ]);
      return deleteMessageAfterDelay(ctx, notificationMessage.message_id, 6000);
    }

    // Если матч в процессе — отменяем его
    if (isMatchStarted) {
      if (ctx.chat.id < 0) {
        const msg = await ctx.reply("Напиши мне в ЛС.");
        return deleteMessageAfterDelay(ctx, msg.message_id, 6000);
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
      const playingMsg = GlobalState.getPlayingTeamsMessageId();
      if (playingMsg) {
        await safeTelegramCall(ctx, "editMessageText", [
          playingMsg.chatId,
          playingMsg.messageId,
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

      // Удаляем запись о текущем матче
      GlobalState.setPlayingTeams(null);
      GlobalState.setPlayingTeamsMessageId(null, null);

      const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "🚫 Матч отменён!",
      ]);
      return deleteMessageAfterDelay(ctx, notificationMessage.message_id, 6000);
    }

    // Если нет ни активного, ни завершённого матча
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "⛔ Нет активного матча для отмены!",
    ]);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });
};
