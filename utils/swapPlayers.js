const { deleteMessageAfterDelay } = require('./deleteMessageAfterDelay');
const { buildTeamsMessage } = require('../message/buildTeamsMessage');
const { safeTelegramCall } = require('./telegramUtils');
const { getTeamName } = require('./getTeamName');
const { createTeamManagementButtons } = require('./createTeamManagementButtons');

// Функция для выполнения замены игроков (общая логика для команды и кнопки)
const swapPlayers = async (ctx, team1, player1, team2, player2, GlobalState) => {
  // Проверка на валидность ctx.chat
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в swapPlayers');
    return;
  }

  const teams = GlobalState.getTeams();

  // Проверка на валидность teams
  if (!Array.isArray(teams) || teams.length === 0) {
    const message = await ctx.reply('⚠️ Команды еще не сформированы!');
    if (message && message.message_id) {
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  // Проверка валидности введенных данных
  if (team1 < 0 || team1 >= teams.length ||
      team2 < 0 || team2 >= teams.length) {
    const message = await ctx.reply(
      `⚠️ Неверный номер команды! Доступно команд: ${teams.length}`,
    );
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (player1 < 0 || player1 >= teams[team1].length ||
      player2 < 0 || player2 >= teams[team2].length) {
    const message = await ctx.reply(
      `⚠️ Неверная позиция игрока! В команде ${team1 + 1}: ${teams[team1].length} игроков, в команде ${team2 + 1}: ${teams[team2].length} игроков`,
    );
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  // Создаем копию текущих команд для изменений
  const updatedTeams = teams.map(team => [...team]);

  // Меняем игроков местами
  const temp = updatedTeams[team1][player1];
  updatedTeams[team1][player1] = updatedTeams[team2][player2];
  updatedTeams[team2][player2] = temp;

  // Обновляем текущие команды в глобальном состоянии
  GlobalState.setTeams(updatedTeams);
  // Флаг isTableAllowed не сбрасываем - после объявления составов они остаются объявленными даже при замене игроков

  // Получаем базовые команды и статистику
  let teamsBase = GlobalState.getTeamsBase();
  let teamStats = GlobalState.getTeamStats();

  // Обновляем teamsBase после замены игрока, чтобы таблица отображала актуальные составы
  // Если teamsBase пустой, используем текущие команды как базовые
  teamsBase = updatedTeams.map(team => [...team]);
  GlobalState.setTeamsBase(teamsBase);

  // Если teamStats пустой, инициализируем его с нулями
  if (!teamStats || Object.keys(teamStats).length === 0) {
    teamStats = {};
    teamsBase.forEach((_, index) => {
      const teamKey = `team${index + 1}`;
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
    });
  }

  // Сбрасываем серию побед и список оппонентов для затронутых команд
  const team1Key = `team${team1 + 1}`;
  const team2Key = `team${team2 + 1}`;
  if (teamStats[team1Key]) {
    teamStats[team1Key].consecutiveWins = 0;
    teamStats[team1Key].opponentsInCurrentStreak = [];
  }
  if (teamStats[team2Key]) {
    teamStats[team2Key].consecutiveWins = 0;
    teamStats[team2Key].opponentsInCurrentStreak = [];
  }

  // Сохраняем обновленную статистику
  GlobalState.setTeamStats(teamStats);

  // Определяем, показывать ли иконки рейтинга
  // Показываем иконки только если команды еще не выбраны И матчи еще не начались И матч не завершен
  const playingTeams = GlobalState.getPlayingTeams();
  const isMatchFinished = GlobalState.getIsMatchFinished();
  const isStatsInitialized = GlobalState.getIsStatsInitialized();
  const showRatings = !playingTeams && !isStatsInitialized && !isMatchFinished;
  const teamsForDisplay = !playingTeams && !isStatsInitialized && !isMatchFinished ? teamsBase : updatedTeams;

  // Формируем сообщение с обновленными составами
  const teamsMessage = buildTeamsMessage(
    teamsBase,
    'Составы команд (после замены)',
    teamStats,
    teamsForDisplay,
    null,
    showRatings,
  );

  // Получаем ID последнего сообщения о командах
  const lastTeamsMessage = GlobalState.getLastTeamsMessageId();

  try {
    if (lastTeamsMessage && lastTeamsMessage.chatId && lastTeamsMessage.messageId) {
      // Редактируем существующее сообщение
      await safeTelegramCall(ctx, 'editMessageText', [
        lastTeamsMessage.chatId,
        lastTeamsMessage.messageId,
        null,
        teamsMessage,
        {
          parse_mode: 'HTML',
          reply_markup: createTeamManagementButtons(GlobalState),
        },
      ]);
    } else {
      // Если предыдущего сообщения нет, отправляем новое
      const message = await ctx.reply(teamsMessage, {
        parse_mode: 'HTML',
        reply_markup: createTeamManagementButtons(GlobalState),
      });
      GlobalState.setLastTeamsMessageId(ctx.chat.id, message.message_id);
    }

    // Уведомляем об успешной замене
    const team1Name = getTeamName(team1);
    const team2Name = getTeamName(team2);
    const successMessage = await ctx.reply(
      `✅ Игроки заменены: ${updatedTeams[team1][player1].name} (${team1Name}) ↔ ${updatedTeams[team2][player2].name} (${team2Name})`,
    );
    deleteMessageAfterDelay(ctx, successMessage.message_id, 3000);

  } catch (error) {
    console.error('Ошибка при редактировании сообщения:', error);
    const errorMessage = await ctx.reply('⚠️ Ошибка при обновлении составов!');
    deleteMessageAfterDelay(ctx, errorMessage.message_id, 3000);
  }
};

module.exports = { swapPlayers };
