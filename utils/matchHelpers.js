const { buildTeamsMessage } = require('../message/buildTeamsMessage');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { createTeamManagementButtons } = require('./createTeamManagementButtons');

// Проверка прав администратора
const checkAdminRights = async (ctx, ADMIN_ID) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в checkAdminRights');
    return false;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в checkAdminRights');
    return false;
  }

  // Проверка на валидность ADMIN_ID
  if (!Array.isArray(ADMIN_ID)) {
    console.error('Ошибка: ADMIN_ID не является массивом');
    return false;
  }

  await ctx.deleteMessage().catch(() => {});
  if (!ADMIN_ID.includes(ctx.from.id)) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ У вас нет прав для этой команды.',
    ]);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
    return false;
  }
  return true;
};

// Проверка, начат ли матч
const checkMatchStarted = async (ctx, isMatchStarted) => {
  if (!isMatchStarted) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    deleteMessageAfterDelay(ctx, message.message_id, 6000);
    return false;
  }
  return true;
};

// Определение результата матча
const getMatchResult = (team1, team2) => {
  // Проверка на валидность массивов команд
  if (!Array.isArray(team1) || !Array.isArray(team2)) {
    console.error('Ошибка: team1 или team2 не являются массивами в getMatchResult');
    return 'draw'; // Возвращаем ничью как безопасное значение по умолчанию
  }

  const team1Goals = team1.reduce(
    (sum, player) => {
      if (!player || typeof player !== 'object') return sum;
      return sum + (Number(player.goals) || 0);
    },
    0,
  );
  const team2Goals = team2.reduce(
    (sum, player) => {
      if (!player || typeof player !== 'object') return sum;
      return sum + (Number(player.goals) || 0);
    },
    0,
  );
  return team1Goals > team2Goals
    ? 'team1'
    : team1Goals < team2Goals
      ? 'team2'
      : 'draw';
};

// Обновление статистики команды
const updateTeamStats = (
  teamStats,
  teamKey,
  isWin,
  isDraw,
  goalsScored,
  goalsConceded,
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

// Модификатор роста рейтинга (более консервативный)
const growthModifier = (baseRating) => Math.max(0.2, 1 - baseRating / 250);

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
  opponentGoals,
) => {
  // Проверка на валидность массивов
  if (!Array.isArray(team)) {
    console.error('Ошибка: team не является массивом в updatePlayerStats');
    return [];
  }
  if (!Array.isArray(originalTeam)) {
    console.error('Ошибка: originalTeam не является массивом в updatePlayerStats');
    return [];
  }
  if (!Array.isArray(allTeamsBase)) {
    console.error('Ошибка: allTeamsBase не является массивом в updatePlayerStats');
    return [];
  }

  // Проверка индекса команды
  if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex >= allTeamsBase.length) {
    console.error('Ошибка: некорректный teamIndex в updatePlayerStats');
    return [];
  }

  return team.map((player, index) => {
    // Проверка на валидность объекта игрока
    if (!player || typeof player !== 'object') {
      console.error(`Ошибка: некорректный объект игрока в updatePlayerStats (index: ${index})`);
      return null;
    }
    const goals = Number(player.goals) || 0;
    const assists = Number(player.assists) || 0;
    const saves = Number(player.saves) || 0;
    const yellowCards = Number(player.yellowCards) || 0;

    const originalPlayer = originalTeam[index] || {};
    const basePlayer = allTeamsBase[teamIndex][index] || {};
    const prevRating = Number(originalPlayer.rating) || 0;
    const baseRating = Number(basePlayer.rating) || 0;
    const mod = growthModifier(baseRating);

    const goalDelta = goals * 0.3 * mod;
    const assistDelta = assists * 0.3 * mod;
    const saveDelta = saves * 0.3 * mod;
    const yellowCardDelta = yellowCards * -0.3;

    // === Голевые бонусы (выбирается максимальный) ===
    // Покер (4+ гола) > Хет-трик (3 гола) > Дубль (2 гола)
    const goalBonus = goals >= 4 ? 0.7 * mod : goals >= 3 ? 0.3 * mod : goals >= 2 ? 0.2 * mod : 0;

    // === Ассистентский бонус ===
    // Плеймейкер (3+ ассистов)
    const assistBonus = assists >= 3 ? 0.3 * mod : 0;

    // === Вратарские бонусы ===
    // Сухарь (сейвы > 0 И команда не пропустила)
    const cleanSheetBonus = (saves > 0 && opponentGoals === 0) ? 0.3 * mod : 0;
    // Супер-вратарь (4+ сейвов) > Стена (2+ сейвов)
    const saveBonus = saves >= 4 ? 0.7 * mod : saves >= 2 ? 0.3 * mod : 0;

    const isShutoutWin = isWin && teamGoals >= 3 && opponentGoals === 0;
    const isShutoutLoss = isLose && opponentGoals >= 3 && teamGoals === 0;

    const winDelta = isWin ? 1.8 * mod : 0; // Базовая победа
    const shutoutWinBonus = isShutoutWin ? 0.7 * mod : 0; // Дополнительный бонус за сухую победу
    const drawDelta = isDraw ? 0.3 * mod : 0;

    // === Штраф за поражение со смягчением ===
    // Герой проигравших (≥2 гола): -0.5 от штрафа
    // Боролся до конца (≥2 действия): -0.4 от штрафа
    const totalActions = goals + assists + saves;
    const loseReduction = isLose ? (goals >= 2 ? 0.5 : totalActions >= 2 ? 0.4 : 0) : 0;
    const baseLoseDelta = isShutoutLoss ? -1.8 : isLose ? -1.3 : 0;
    const loseDelta = baseLoseDelta + loseReduction;

    const delta = goalDelta + assistDelta + saveDelta + goalBonus + assistBonus + cleanSheetBonus + saveBonus + winDelta + drawDelta + loseDelta + shutoutWinBonus + yellowCardDelta;

    const newRating = round1(Math.min(prevRating + delta, 200));

    // Накопление дельт рейтинга за турнир
    const ratingGoalsDelta = (originalPlayer.ratingGoalsDelta || 0) + goalDelta + goalBonus;
    const ratingAssistsDelta = (originalPlayer.ratingAssistsDelta || 0) + assistDelta + assistBonus;
    const ratingSavesDelta = (originalPlayer.ratingSavesDelta || 0) + saveDelta + saveBonus;
    const ratingCleanSheetsDelta = (originalPlayer.ratingCleanSheetsDelta || 0) + cleanSheetBonus;
    const ratingWinsDelta = (originalPlayer.ratingWinsDelta || 0) + (isWin ? 2 * mod : 0);
    const ratingDrawsDelta = (originalPlayer.ratingDrawsDelta || 0) + drawDelta;
    const ratingLossesDelta = (originalPlayer.ratingLossesDelta || 0) + loseDelta;
    const ratingShutoutWinDelta = (originalPlayer.ratingShutoutWinDelta || 0) + shutoutWinBonus;
    const ratingYellowCardsDelta = (originalPlayer.ratingYellowCardsDelta || 0) + yellowCardDelta;
    const ratingTournamentDelta = ratingGoalsDelta + ratingAssistsDelta + ratingSavesDelta
      + ratingCleanSheetsDelta + ratingWinsDelta + ratingDrawsDelta + ratingLossesDelta + ratingShutoutWinDelta + ratingYellowCardsDelta;

    // Отслеживание серий побед и непобедимости
    let consecutiveWins = originalPlayer.consecutiveWins || 0;
    let consecutiveUnbeaten = originalPlayer.consecutiveUnbeaten || 0;
    let maxConsecutiveWins = originalPlayer.maxConsecutiveWins || 0;
    let maxConsecutiveUnbeaten = originalPlayer.maxConsecutiveUnbeaten || 0;

    if (isWin) {
      consecutiveWins += 1;
      consecutiveUnbeaten += 1;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
      maxConsecutiveUnbeaten = Math.max(maxConsecutiveUnbeaten, consecutiveUnbeaten);
    } else if (isDraw) {
      consecutiveWins = 0;
      consecutiveUnbeaten += 1;
      maxConsecutiveUnbeaten = Math.max(maxConsecutiveUnbeaten, consecutiveUnbeaten);
    } else if (isLose) {
      consecutiveWins = 0;
      consecutiveUnbeaten = 0;
    }

    return {
      ...originalPlayer,
      id: player.id,
      // Сохраняем name и username, если они есть, иначе используем из originalPlayer
      name: player.name || originalPlayer.name || 'Unknown',
      username: player.username || originalPlayer.username || null,
      gamesPlayed: (originalPlayer.gamesPlayed || 0) + 1,
      wins: (originalPlayer.wins || 0) + (isWin ? 1 : 0),
      draws: (originalPlayer.draws || 0) + (isDraw ? 1 : 0),
      losses: (originalPlayer.losses || 0) + (isLose ? 1 : 0),
      goals: (originalPlayer.goals || 0) + goals,
      assists: (originalPlayer.assists || 0) + assists,
      saves: (originalPlayer.saves || 0) + saves,
      yellowCards: (originalPlayer.yellowCards || 0) + yellowCards,
      rating: newRating,
      ratingGoalsDelta,
      ratingAssistsDelta,
      ratingSavesDelta,
      ratingCleanSheetsDelta,
      ratingWinsDelta,
      ratingDrawsDelta,
      ratingLossesDelta,
      ratingShutoutWinDelta,
      ratingYellowCardsDelta,
      ratingTournamentDelta,
      consecutiveWins,
      consecutiveUnbeaten,
      maxConsecutiveWins,
      maxConsecutiveUnbeaten,
    };
  });
};

// Обновление истории матчей при завершении матча
const updateMatchHistory = (GlobalState, teamIndex1, teamIndex2) => {
  const teams = GlobalState.getTeams();
  if (!Array.isArray(teams)) {
    console.error('Ошибка: teams не является массивом в updateMatchHistory');
    return;
  }

  const totalTeams = teams.length;

  // Проверка индексов команд
  if (!Number.isInteger(teamIndex1) || teamIndex1 < 0 || teamIndex1 >= totalTeams) {
    console.error('Ошибка: некорректный teamIndex1 в updateMatchHistory');
    return;
  }
  if (!Number.isInteger(teamIndex2) || teamIndex2 < 0 || teamIndex2 >= totalTeams) {
    console.error('Ошибка: некорректный teamIndex2 в updateMatchHistory');
    return;
  }
  if (totalTeams <= 2) {
    return;
  }

  const previousTeamCount = GlobalState.getTeamCount();
  if (previousTeamCount !== totalTeams) {
    GlobalState.setMatchHistory({});
    GlobalState.setLastMatchIndex({});
    GlobalState.setTeamCount(totalTeams);
    GlobalState.setConsecutiveGames({});
  }

  let matchHistory = GlobalState.getMatchHistory();
  let lastMatchIndex = GlobalState.getLastMatchIndex();
  const matchResults = GlobalState.getMatchResults();
  const currentMatchIndex = matchResults.length;

  // Инициализируем структуры
  for (let i = 0; i < totalTeams; i++) {
    if (!matchHistory[i]) matchHistory[i] = {};
    if (!lastMatchIndex[i]) lastMatchIndex[i] = {};
  }

  // Обновляем количество игр между командами
  matchHistory[teamIndex1][teamIndex2] =
    (matchHistory[teamIndex1][teamIndex2] || 0) + 1;
  matchHistory[teamIndex2][teamIndex1] =
    (matchHistory[teamIndex2][teamIndex1] || 0) + 1;

  // Обновляем индекс последнего матча между этими командами
  lastMatchIndex[teamIndex1][teamIndex2] = currentMatchIndex;
  lastMatchIndex[teamIndex2][teamIndex1] = currentMatchIndex;

  // Обновляем consecutiveGames
  const consecutiveGames = GlobalState.getConsecutiveGames() || {};
  consecutiveGames[teamIndex1] = (consecutiveGames[teamIndex1] || 0) + 1;
  consecutiveGames[teamIndex2] = (consecutiveGames[teamIndex2] || 0) + 1;

  for (let i = 0; i < totalTeams; i++) {
    if (i !== teamIndex1 && i !== teamIndex2) consecutiveGames[i] = 0;
  }

  // Проверяем, нужно ли сбросить историю (если все пары сыграли одинаковое количество раз)
  const allMatchups = [];
  for (let i = 0; i < totalTeams; i++) {
    for (let j = i + 1; j < totalTeams; j++) {
      allMatchups.push([i, j]);
    }
  }

  const minMatchesPlayed = Math.min(
    ...allMatchups.map(([i, j]) => matchHistory[i]?.[j] || 0),
  );
  if (
    allMatchups.every(
      ([i, j]) => (matchHistory[i]?.[j] || 0) >= minMatchesPlayed + 1,
    )
  ) {
    matchHistory = {};
    lastMatchIndex = {};
    for (let i = 0; i < totalTeams; i++) {
      matchHistory[i] = {};
      lastMatchIndex[i] = {};
    }
  }

  // Сохраняем обновленные структуры
  GlobalState.setMatchHistory(matchHistory);
  GlobalState.setLastMatchIndex(lastMatchIndex);
  GlobalState.setConsecutiveGames(consecutiveGames);
};

// Обновление сообщения с командами
const updateTeamsMessage = async (
  ctx,
  GlobalState,
  allTeamsBase,
  teamStats,
) => {
  // Проверка на валидность ctx.chat
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в updateTeamsMessage');
    return;
  }

  // Проверка на валидность allTeamsBase
  if (!Array.isArray(allTeamsBase)) {
    console.error('Ошибка: allTeamsBase не является массивом в updateTeamsMessage');
    return;
  }

  try {
    const updatedMessage = buildTeamsMessage(
      allTeamsBase,
      'Таблица',
      teamStats,
      GlobalState.getTeams(),
      null,
      false,
    );
    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
    const isTableAllowed = GlobalState.getIsTableAllowed();
    const playingTeams = GlobalState.getPlayingTeams();

    const inlineKeyboard = { reply_markup: createTeamManagementButtons(GlobalState) };

    if (lastTeamsMessage) {
      await safeTelegramCall(ctx, 'editMessageText', [
        lastTeamsMessage.chatId,
        lastTeamsMessage.messageId,
        null,
        updatedMessage,
        {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard.reply_markup,
        },
      ]);
    } else {
      const sentMessage = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        updatedMessage,
        {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard.reply_markup,
        },
      ]);
      GlobalState.setLastTeamsMessageId(ctx.chat.id, sentMessage.message_id);
    }
  } catch (error) {
    console.error('Ошибка при обновлении сообщения с командами:', error);
    // Не пробрасываем ошибку дальше, чтобы не сломать выполнение команды
  }
};

module.exports = {
  checkAdminRights,
  checkMatchStarted,
  getMatchResult,
  updateTeamStats,
  updatePlayerStats,
  updateTeamsMessage,
  updateMatchHistory,
};

