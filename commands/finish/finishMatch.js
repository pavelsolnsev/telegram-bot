const { Markup } = require('telegraf');
const {
  buildPlayingTeamsMessage,
} = require('../../message/buildPlayingTeamsMessage');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const {
  getMatchResult,
  updateTeamStats,
  updatePlayerStats,
  updateTeamsMessage,
} = require('../../utils/matchHelpers');

// Функция завершения матча
const finishMatch = async (ctx, GlobalState) => {
  const playingTeams = GlobalState.getPlayingTeams();
  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  // Сохраняем текущее состояние перед изменениями
  GlobalState.pushMatchHistory({
    teams: JSON.parse(JSON.stringify(GlobalState.getTeams())),
    teamStats: JSON.parse(JSON.stringify(GlobalState.getTeamStats())),
    matchHistory: JSON.parse(JSON.stringify(GlobalState.getMatchHistory())),
    lastMatchIndex: JSON.parse(JSON.stringify(GlobalState.getLastMatchIndex())),
    consecutiveGames: JSON.parse(
      JSON.stringify(GlobalState.getConsecutiveGames()),
    ),
    playingTeams: JSON.parse(JSON.stringify(GlobalState.getPlayingTeams())),
  });

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const allTeams = GlobalState.getTeams();
  const teamStats = GlobalState.getTeamStats();
  const allTeamsBase = GlobalState.getTeamsBase();
  const result = getMatchResult(team1, team2);

  const team1Goals = team1.reduce(
    (sum, player) => sum + (player.goals || 0),
    0,
  );
  const team2Goals = team2.reduce(
    (sum, player) => sum + (player.goals || 0),
    0,
  );

  GlobalState.addMatchResult({
    teamIndex1,
    teamIndex2,
    score1: team1Goals,
    score2: team2Goals,
    players1: team1.map((p) => ({
      name: p.username || p.name,
      goals: p.goals || 0,
      assists: p.assists || 0,
      saves: p.saves || 0,
    })),
    players2: team2.map((p) => ({
      name: p.username || p.name,
      goals: p.goals || 0,
      assists: p.assists || 0,
      saves: p.saves || 0,
    })),
  });

  updateTeamStats(
    teamStats,
    `team${teamIndex1 + 1}`,
    result === 'team1',
    result === 'draw',
    team1Goals,
    team2Goals,
  );
  updateTeamStats(
    teamStats,
    `team${teamIndex2 + 1}`,
    result === 'team2',
    result === 'draw',
    team2Goals,
    team1Goals,
  );

  allTeams[teamIndex1] = updatePlayerStats(
    team1,
    allTeams[teamIndex1],
    result === 'team1',
    result === 'draw',
    result === 'team2',
    allTeamsBase,
    teamIndex1,
    team1Goals,
    team2Goals,
  );
  allTeams[teamIndex2] = updatePlayerStats(
    team2,
    allTeams[teamIndex2],
    result === 'team2',
    result === 'draw',
    result === 'team1',
    allTeamsBase,
    teamIndex2,
    team2Goals,
    team1Goals,
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
    'finished',
    undefined,
    finishedMatchNumber,
  );
  const playingTeamsMessage = GlobalState.getPlayingTeamsMessageId();
  if (playingTeamsMessage) {
    await safeTelegramCall(ctx, 'editMessageText', [
      playingTeamsMessage.chatId,
      playingTeamsMessage.messageId,
      null,
      finishedMessage,
      { parse_mode: 'HTML' },
    ]);
  }

  await updateTeamsMessage(ctx, GlobalState, allTeamsBase, teamStats);

  const notificationMessage = await safeTelegramCall(ctx, 'sendMessage', [
    ctx.chat.id,
    '✅ Матч завершен, статистика обновлена!',
  ]);
  deleteMessageAfterDelay(ctx, notificationMessage.message_id);
};

// Функция выполнения команды ksk (переход к следующему матчу)
const executeKskCommand = async (ctx, GlobalState, checkAdminRights, checkMatchStarted) => {
  if (!(await checkAdminRights(ctx, GlobalState.getAdminId()))) return false;
  if (!(await checkMatchStarted(ctx, GlobalState.getStart()))) return false;

  if (ctx.chat.id < 0) {
    const msg = await ctx.reply('Напиши мне в ЛС.');
    deleteMessageAfterDelay(ctx, msg.message_id);
    return false;
  }

  const playingTeams = GlobalState.getPlayingTeams();
  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча для продолжения!',
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
      JSON.stringify(GlobalState.getConsecutiveGames()),
    ),
    playingTeams: JSON.parse(JSON.stringify(GlobalState.getPlayingTeams())),
  });

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const allTeams = GlobalState.getTeams();
  const teamStats = GlobalState.getTeamStats();
  const allTeamsBase = GlobalState.getTeamsBase();
  const result = getMatchResult(team1, team2);

  const team1Goals = team1.reduce(
    (sum, player) => sum + (player.goals || 0),
    0,
  );
  const team2Goals = team2.reduce(
    (sum, player) => sum + (player.goals || 0),
    0,
  );

  GlobalState.addMatchResult({
    teamIndex1,
    teamIndex2,
    score1: team1Goals,
    score2: team2Goals,
    players1: team1.map((p) => ({
      name: p.username || p.name,
      goals: p.goals || 0,
      assists: p.assists || 0,
      saves: p.saves || 0,
    })),
    players2: team2.map((p) => ({
      name: p.username || p.name,
      goals: p.goals || 0,
      assists: p.assists || 0,
      saves: p.saves || 0,
    })),
  });

  updateTeamStats(
    teamStats,
    `team${teamIndex1 + 1}`,
    result === 'team1',
    result === 'draw',
    team1Goals,
    team2Goals,
  );
  updateTeamStats(
    teamStats,
    `team${teamIndex2 + 1}`,
    result === 'team2',
    result === 'draw',
    team2Goals,
    team1Goals,
  );

  allTeams[teamIndex1] = updatePlayerStats(
    team1,
    allTeams[teamIndex1],
    result === 'team1',
    result === 'draw',
    result === 'team2',
    allTeamsBase,
    teamIndex1,
    team1Goals,
    team2Goals,
  );
  allTeams[teamIndex2] = updatePlayerStats(
    team2,
    allTeams[teamIndex2],
    result === 'team2',
    result === 'draw',
    result === 'team1',
    allTeamsBase,
    teamIndex2,
    team2Goals,
    team1Goals,
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
    'finished',
    undefined,
    finishedMatchNumberAfterKsk,
  );
  const playingTeamsMessage = GlobalState.getPlayingTeamsMessageId();
  if (playingTeamsMessage) {
    await safeTelegramCall(ctx, 'editMessageText', [
      playingTeamsMessage.chatId,
      playingTeamsMessage.messageId,
      null,
      finishedMessage,
      { parse_mode: 'HTML' },
    ]);
  }

  await updateTeamsMessage(ctx, GlobalState, allTeamsBase, teamStats);

  const totalTeams = allTeams.length;
  if (totalTeams <= 2) {
    GlobalState.setPlayingTeams(null);
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Недостаточно команд для следующего матча!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const previousTeamCount = GlobalState.getTeamCount();
  if (previousTeamCount !== totalTeams) {
    GlobalState.setMatchHistory({});
    GlobalState.setLastMatchIndex({});
    GlobalState.setTeamCount(totalTeams);
    GlobalState.setConsecutiveGames({});
  }

  const resetGoals = (team) =>
    team.map((player) => ({ ...player, goals: 0 }));

  let matchHistory = GlobalState.getMatchHistory();
  let lastMatchIndex = GlobalState.getLastMatchIndex();

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
  const currentMatchIndex = matchResultsAfterKsk.length;
  lastMatchIndex[teamIndex1][teamIndex2] = currentMatchIndex;
  lastMatchIndex[teamIndex2][teamIndex1] = currentMatchIndex;

  const consecutiveGames = GlobalState.getConsecutiveGames() || {};
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
    GlobalState.setMatchHistory(matchHistory);
    GlobalState.setLastMatchIndex(lastMatchIndex);
  }

  // Вычисляем количество игр и отдыхов для каждой команды
  const totalMatches = matchResultsAfterKsk.length;
  const teamGamesCount = {}; // Количество игр каждой команды
  const teamRestCount = {}; // Количество отдыхов каждой команды

  // Инициализируем счетчики
  for (let i = 0; i < totalTeams; i++) {
    teamGamesCount[i] = 0;
    teamRestCount[i] = 0;
  }

  // Подсчитываем игры каждой команды из истории матчей
  for (const result of matchResultsAfterKsk) {
    if (result.teamIndex1 !== undefined && result.teamIndex2 !== undefined) {
      teamGamesCount[result.teamIndex1] = (teamGamesCount[result.teamIndex1] || 0) + 1;
      teamGamesCount[result.teamIndex2] = (teamGamesCount[result.teamIndex2] || 0) + 1;
    }
  }

  // Подсчитываем отдыхи (команды, которые не играли в последних матчах)
  // Команды с consecutiveGames[i] === 0 отдыхали в последнем матче
  // Но нам нужно более точное вычисление - сколько раз команда отдыхала относительно других
  for (let i = 0; i < totalTeams; i++) {
    const games = teamGamesCount[i] || 0;
    teamRestCount[i] = totalMatches - games;
  }

  // Вычисляем среднее значение игр и отдыхов для более точного баланса (один раз, не в цикле)
  const gamesCountValues = Object.values(teamGamesCount);
  const restCountValues = Object.values(teamRestCount);
  const avgGames = gamesCountValues.length > 0
    ? gamesCountValues.reduce((sum, val) => sum + val, 0) / gamesCountValues.length
    : 0;
  const avgRests = restCountValues.length > 0
    ? restCountValues.reduce((sum, val) => sum + val, 0) / restCountValues.length
    : 0;

  let nextTeamIndex1 = null;
  let nextTeamIndex2 = null;
  let bestScore = -Infinity; // Чем выше, тем лучше

  // Функция для вычисления приоритета пары команд
  const calculatePairScore = (i, j, gamesPlayed) => {
    let score = 0;

    // Приоритет 1: команда не должна играть более 2 раз подряд
    if (consecutiveGames[i] >= 2 || consecutiveGames[j] >= 2) {
      return -Infinity; // Исключаем такие пары
    }

    // Приоритет 2 (ГЛАВНЫЙ): максимизируем расстояние от последнего матча между этими командами
    // Чем больше прошло матчей с последней встречи, тем выше приоритет
    const lastMatch = lastMatchIndex[i]?.[j];
    if (lastMatch !== undefined && lastMatch !== null) {
      const distanceFromLastMatch = totalMatches - lastMatch;
      // Максимизируем расстояние - чем больше расстояние, тем выше приоритет
      score += distanceFromLastMatch * 2000;
    } else {
      // Если команды еще не играли друг с другом, даем максимальный приоритет
      score += 100000;
    }

    // Приоритет 3: минимальное количество игр между этими двумя командами (вторичный фактор)
    score -= gamesPlayed * 100;

    // Приоритет 4: баланс отдыхов - команды с меньшим количеством игр
    // или большим количеством отдыхов получают приоритет
    const iGames = teamGamesCount[i] || 0;
    const jGames = teamGamesCount[j] || 0;
    const iRests = teamRestCount[i] || 0;
    const jRests = teamRestCount[j] || 0;

    // Бонус за то, что команда играла меньше среднего
    const iGamesDiff = avgGames - iGames;
    const jGamesDiff = avgGames - jGames;
    score += (iGamesDiff + jGamesDiff) * 50;

    // Бонус за то, что команда отдыхала больше среднего
    const iRestsDiff = iRests - avgRests;
    const jRestsDiff = jRests - avgRests;
    score += (iRestsDiff + jRestsDiff) * 50;

    // Приоритет 5: если команда отдыхала в последнем матче (consecutiveGames === 0)
    // и при этом имеет баланс отдыхов/игр, даем ей небольшой бонус
    if (consecutiveGames[i] === 0 && iRests >= avgRests) {
      score += 10;
    }
    if (consecutiveGames[j] === 0 && jRests >= avgRests) {
      score += 10;
    }

    // Приоритет 6: избегаем ситуаций, когда одна команда играет значительно больше другой
    const gamesDiff = Math.abs(iGames - jGames);
    score -= gamesDiff * 25;

    return score;
  };

  // Ищем лучшую пару
  for (const [i, j] of allMatchups) {
    const gamesPlayed = matchHistory[i]?.[j] || 0;
    const score = calculatePairScore(i, j, gamesPlayed);

    if (score > bestScore) {
      bestScore = score;
      nextTeamIndex1 = i;
      nextTeamIndex2 = j;
    }
  }

  // Сохраняем обновленные структуры
  GlobalState.setLastMatchIndex(lastMatchIndex);

  if (nextTeamIndex1 === null || nextTeamIndex2 === null) {
    const msg = await ctx.reply(
      '⛔ Не удалось подобрать команды, которые не играли 3 раза подряд.',
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
    'playing',
    undefined,
    nextMatchNumber,
  );
  const sentMessage = await safeTelegramCall(ctx, 'sendMessage', [
    ctx.chat.id,
    teamsMessage,
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('⚽ Отметить голы', 'show_goals_menu')],
        [Markup.button.callback('🅰️ Отметить ассист', 'show_assists_menu')],
        [Markup.button.callback('🧤 Отметить сейв', 'show_saves_menu')],
        [Markup.button.callback('⏭️ Следующий матч', 'ksk_confirm')],
        [Markup.button.callback('⚙️ Управление', 'management_menu')],
      ]).reply_markup,
    },
  ]);

  GlobalState.setPlayingTeamsMessageId(
    sentMessage.chat.id,
    sentMessage.message_id,
  );
  // Сохраняем сообщение матча по номеру для возможности удаления при отмене
  GlobalState.setMatchMessageByNumber(nextMatchNumber, sentMessage.chat.id, sentMessage.message_id);
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

