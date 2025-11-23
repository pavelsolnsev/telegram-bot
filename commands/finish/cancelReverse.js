const { Markup } = require("telegraf");
const {
  buildPlayingTeamsMessage,
} = require("../../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../../utils/telegramUtils");
const { updateTeamsMessage } = require("../../utils/matchHelpers");

// Функция отмены активного матча
const cancelActiveMatch = async (ctx, GlobalState) => {
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

// Функция отката завершённого матча
const reverseFinishedMatch = async (ctx, GlobalState) => {
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
          [Markup.button.callback("🏁 Завершить матч", "finish_match")],
          [Markup.button.callback("⚙️ Управление", "management_menu")],
        ]).reply_markup,
      },
    ]);
    GlobalState.setPlayingTeamsMessageId(sent.chat.id, sent.message_id);
  }
};

// Функция для проверки и предложения продолжить процесс отката/отмены
const offerContinueEnd = async (ctx, chatId, action, GlobalState) => {
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
const executeEndStep = async (ctx, GlobalState, cancelActiveMatch, reverseFinishedMatch) => {
  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;

  const isMatchFinished = GlobalState.getIsMatchFinished();
  const playingTeams = GlobalState.getPlayingTeams();

  // Этап 1: Откатываем завершённый матч, если есть
  if (isMatchFinished) {
    await reverseFinishedMatch(ctx, GlobalState);
    // Обновляем chatId после выполнения, так как ctx мог измениться
    const updatedChatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    
    return { 
      action: "⏪ Выбери действие", 
      chatId: updatedChatId || chatId 
    };
  }

  // Этап 2: Если нет завершённого матча, но есть активный — отменяем его
  if (playingTeams) {
    await cancelActiveMatch(ctx, GlobalState);
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

module.exports = {
  cancelActiveMatch,
  reverseFinishedMatch,
  offerContinueEnd,
  executeEndStep,
};

