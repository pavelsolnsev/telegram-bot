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
  // Функция завершения матча (вынесена для переиспользования)
  const finishMatch = async (ctx) => {
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

  // Команда fn
  bot.hears(/^fn$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;
    if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return;

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    await finishMatch(ctx);
  });

  // Обработчик кнопки "🏁 Закончить матч"
  bot.action("finish_match", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    const isMatchStarted = GlobalState.getStart();
    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, "⚠️ Матч не начат!");
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (!chatId || chatId < 0) {
      await safeAnswerCallback(ctx, "⚠️ Команда доступна только в личных сообщениях!");
      return;
    }

    await safeAnswerCallback(ctx, "✅ Завершение матча...");
    await finishMatch(ctx);
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


  // Функция отмены активного матча (вынесена для переиспользования)
  const cancelActiveMatch = async (ctx) => {
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;

    // Команда доступна только в личных сообщениях
    if (!chatId || chatId < 0) {
      const targetChatId = chatId || ctx.from?.id;
      if (targetChatId) {
        const msg = await safeTelegramCall(ctx, "sendMessage", [
          targetChatId,
          "Напиши мне в ЛС.",
        ]);
        return deleteMessageAfterDelay(ctx, msg.message_id, 6000);
      }
      return;
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
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
          "canceled",
          undefined,
          null
        ),
        { parse_mode: "HTML" },
      ]);
    }

    // Удаляем запись о текущем матче
    GlobalState.setPlayingTeams(null);
    GlobalState.setPlayingTeamsMessageId(null, null);

    const notificationMessage = await safeTelegramCall(ctx, "sendMessage", [
      chatId,
      "🚫 Матч отменён!",
    ]);
    return deleteMessageAfterDelay(ctx, notificationMessage.message_id, 6000);
  };

  // Функция отката завершённого матча (вынесена для переиспользования)
  const reverseFinishedMatch = async (ctx) => {
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;

    if (!isMatchFinished) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        "⛔ Нет завершённого матча для отката!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const previousState = GlobalState.popMatchHistory();
    if (!previousState) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
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
      // Вычисляем номер матча после отката
      const reverseHistoryLength = GlobalState.getMatchHistoryStackLength();
      const reverseMatchNumber = reverseHistoryLength + 1;

      const teamsMessage = buildPlayingTeamsMessage(
        team1,
        team2,
        teamIndex1,
        teamIndex2,
        "playing",
        undefined,
        reverseMatchNumber
      );
      const sent = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        teamsMessage,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard([
            ...createTeamButtons(team1, teamIndex1),
            ...createTeamButtons(team2, teamIndex2),
            [], // Пустая строка для разделения
            [Markup.button.callback("⏭️ Следующий матч", "ksk_confirm")],
            [Markup.button.callback("🏁 Закончить матч", "finish_match")],
            [Markup.button.callback("⚙️ Управление", "management_menu")],
          ]).reply_markup,
        },
      ]);
      GlobalState.setPlayingTeamsMessageId(sent.chat.id, sent.message_id);
    }
  };

  // Функция для проверки и предложения продолжить процесс отката/отмены
  const offerContinueEnd = async (ctx, chatId, action) => {
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const playingTeams = GlobalState.getPlayingTeams();
    const historyLength = GlobalState.getMatchHistoryStackLength();

    // Проверяем, есть ли ещё что-то для обработки
    const hasMoreToProcess = isMatchFinished || playingTeams || historyLength > 0;

    if (hasMoreToProcess) {
      // Определяем тексты кнопок в зависимости от следующего действия
      const teamColors = ["🔴", "🔵", "🟢", "🟡"];
      let continueButtonText = "";
      let stopButtonText = "";
      let currentMatchNumber = 0;
      let teamIndex1 = -1;
      let teamIndex2 = -1;

      if (isMatchFinished) {
        // Если есть завершённый матч - следующее действие: откатить его
        // Получаем информацию о командах из последнего завершённого матча
        const matchResults = GlobalState.getMatchResults();
        if (matchResults && matchResults.length > 0) {
          const lastMatch = matchResults[matchResults.length - 1];
          teamIndex1 = lastMatch.teamIndex1;
          teamIndex2 = lastMatch.teamIndex2;
        }
        // Номер завершённого матча = количество завершённых матчей
        const finishedMatchNumber = matchResults.length;
        const teamMatchInfo = teamIndex1 >= 0 && teamIndex2 >= 0 
          ? ` ${teamColors[teamIndex1]} vs ${teamColors[teamIndex2]}`
          : "";
        continueButtonText = `⏪ Вернуться в прошлый матч №${finishedMatchNumber}${teamMatchInfo}`;
        // Когда есть завершённый матч, вторая кнопка закрывает меню для выбора новых команд
        stopButtonText = `🔄 Закрыть меню и выбрать новые команды`;
      } else if (playingTeams) {
        // Если есть активный матч - следующее действие: отменить его
        teamIndex1 = playingTeams.teamIndex1;
        teamIndex2 = playingTeams.teamIndex2;
        // Номер текущего активного матча = история + 1
        currentMatchNumber = historyLength + 1;
        const teamMatchInfo = ` ${teamColors[teamIndex1]} vs ${teamColors[teamIndex2]}`;
        continueButtonText = `🚫 Отменить этот матч №${currentMatchNumber}${teamMatchInfo}`;
        // После отмены активного матча, если есть история, следующий матч станет завершённым
        // или активным (в зависимости от того, что в истории)
        // Кнопка "Продолжить редактировать" должна показывать текущий активный матч
        // Так как активный матч уже есть (playingTeams), показываем его номер
        stopButtonText = `✅ Продолжить редактировать матч №${currentMatchNumber}${teamMatchInfo}`;
      } else if (historyLength > 0) {
        // Если есть история - следующее действие: откатить следующий матч из истории
        // Получаем информацию о матче из последнего элемента matchResults
        const matchResults = GlobalState.getMatchResults();
        if (matchResults && matchResults.length > 0) {
          const lastMatch = matchResults[matchResults.length - 1];
          teamIndex1 = lastMatch.teamIndex1;
          teamIndex2 = lastMatch.teamIndex2;
        }
        // Номер матча, который будет откачен = historyLength
        currentMatchNumber = historyLength;
        const historyWord = historyLength === 1 ? "матч" : historyLength < 5 ? "матча" : "матчей";
        const teamMatchInfo = teamIndex1 >= 0 && teamIndex2 >= 0 
          ? ` ${teamColors[teamIndex1]} vs ${teamColors[teamIndex2]}`
          : "";
        continueButtonText = `⏪ Откатить следующий матч №${currentMatchNumber}${teamMatchInfo} (осталось ${historyLength} ${historyWord})`;
        // После отката матча из истории, восстановится активный матч
        // Номер активного матча после отката = historyLength - 1 (после pop из стека)
        // Но сейчас нет активного матча, поэтому показываем, что будет после отката
        const activeMatchAfterPop = historyLength - 1; // После pop это будет активный матч
        if (activeMatchAfterPop > 0) {
          stopButtonText = `✅ Продолжить редактировать матч №${activeMatchAfterPop}${teamMatchInfo}`;
        } else {
          stopButtonText = `✅ Остановить`;
        }
      }

      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        action,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback(continueButtonText, "end_continue")],
            [Markup.button.callback(stopButtonText, "end_stop")],
          ]).reply_markup,
        },
      ]);
      // Удаляем сообщение через 60 секунд, если пользователь не ответил
      deleteMessageAfterDelay(ctx, message.message_id, 60000);
      return message.message_id;
    } else {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        `${action}\n\n✅ Все матчи обработаны!`,
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  };

  // Функция для выполнения одного шага отката/отмены
  const executeEndStep = async (ctx) => {
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;

    const isMatchFinished = GlobalState.getIsMatchFinished();
    const playingTeams = GlobalState.getPlayingTeams();

    // Этап 1: Откатываем завершённый матч, если есть
    if (isMatchFinished) {
      await reverseFinishedMatch(ctx);
      // Обновляем chatId после выполнения, так как ctx мог измениться
      const updatedChatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      
      return { 
        action: "⏪ Выбери действие", 
        chatId: updatedChatId || chatId 
      };
    }

    // Этап 2: Если нет завершённого матча, но есть активный — отменяем его
    if (playingTeams) {
      await cancelActiveMatch(ctx);
      // После отмены активного матча проверяем, есть ли история для отката
      const nextHistoryLength = GlobalState.getMatchHistoryStackLength();
      if (nextHistoryLength > 0) {
        // Есть история - следующий матч был завершённый, устанавливаем флаг для отката
        GlobalState.setIsMatchFinished(true);
      }
      // Обновляем chatId после выполнения
      const updatedChatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      
      return { 
        action: "🚫 Отмена активного матча выполнена", 
        chatId: updatedChatId || chatId 
      };
    }

    // Если нет ни завершённого, ни активного матча
    return { action: null, chatId };
  };

  // Команда end - выполняет один шаг, затем предлагает продолжить
  bot.hears(/^end$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!(await checkAdminRights(ctx, ADMIN_ID))) return;

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id, 6000);
    }

    const chatId = ctx.chat.id;
    const result = await executeEndStep(ctx);

    if (!result.action) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        "⛔ Нет матчей для обработки",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Предлагаем продолжить процесс
    await offerContinueEnd(ctx, chatId, result.action);
  });

  // Обработчик кнопки "End" из меню управления - работает так же как команда end
  bot.action("end_match", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (!chatId || chatId < 0) {
      await safeAnswerCallback(ctx, "⚠️ Команда доступна только в личных сообщениях!");
      return;
    }

    // Удаляем сообщение меню управления
    try {
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "deleteMessage", [
          chatId,
          messageId,
        ]).catch(() => {});
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    const result = await executeEndStep(ctx);

    if (!result.action) {
      await safeAnswerCallback(ctx, "⛔ Нет матчей для обработки");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        "⛔ Нет матчей для обработки",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Предлагаем продолжить процесс
    await offerContinueEnd(ctx, chatId, result.action);
  });

  // Обработчик кнопки "Продолжить" для команды end
  bot.action("end_continue", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    if (!chatId || chatId < 0) {
      await safeAnswerCallback(ctx, "⚠️ Команда доступна только в личных сообщениях!");
      return;
    }

    // Удаляем предыдущее сообщение с кнопками
    try {
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "deleteMessage", [
          chatId,
          messageId,
        ]).catch(() => {});
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    await safeAnswerCallback(ctx, "⏳ Выполняю следующее действие...");

    const result = await executeEndStep(ctx);

    if (!result.action) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        "⛔ Нет матчей для обработки",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Предлагаем продолжить процесс
    await offerContinueEnd(ctx, chatId, result.action);
  });

  // Обработчик кнопки "Остановить" для команды end
  bot.action("end_stop", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    // Удаляем сообщение с кнопками
    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "deleteMessage", [
          chatId,
          messageId,
        ]).catch(() => {});
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    await safeAnswerCallback(ctx, "✅ Процесс остановлен");
  });
};
