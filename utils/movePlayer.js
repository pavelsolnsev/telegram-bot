const { deleteMessageAfterDelay } = require('./deleteMessageAfterDelay');
const { buildTeamsMessage } = require('../message/buildTeamsMessage');
const { safeTelegramCall } = require('./telegramUtils');
const { getTeamName } = require('./getTeamName');
const { createTeamManagementButtons } = require('./createTeamManagementButtons');

// Функция для перемещения игрока из одной команды в другую (не обмен)
const movePlayer = async (ctx, fromTeamIndex, playerIndex, toTeamIndex, GlobalState) => {
  // Проверка на валидность ctx.chat
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в movePlayer');
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
  if (fromTeamIndex < 0 || fromTeamIndex >= teams.length ||
      toTeamIndex < 0 || toTeamIndex >= teams.length) {
    const message = await ctx.reply(
      `⚠️ Неверный номер команды! Доступно команд: ${teams.length}`,
    );
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (fromTeamIndex === toTeamIndex) {
    const message = await ctx.reply('⚠️ Нельзя переместить игрока в ту же команду!');
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (playerIndex < 0 || playerIndex >= teams[fromTeamIndex].length) {
    const message = await ctx.reply(
      `⚠️ Неверная позиция игрока! В команде ${fromTeamIndex + 1}: ${teams[fromTeamIndex].length} игроков`,
    );
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  // Создаем копию текущих команд для изменений
  const updatedTeams = teams.map(team => [...team]);

  // Перемещаем игрока
  const player = updatedTeams[fromTeamIndex][playerIndex];
  updatedTeams[fromTeamIndex].splice(playerIndex, 1); // Удаляем из исходной команды
  updatedTeams[toTeamIndex].push(player); // Добавляем в целевую команду

  // Обновляем текущие команды в глобальном состоянии
  GlobalState.setTeams(updatedTeams);

  // Получаем базовые команды и статистику
  let teamsBase = GlobalState.getTeamsBase();
  let teamStats = GlobalState.getTeamStats();

  // Обновляем teamsBase после перемещения игрока
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
  const fromTeamKey = `team${fromTeamIndex + 1}`;
  const toTeamKey = `team${toTeamIndex + 1}`;
  if (teamStats[fromTeamKey]) {
    teamStats[fromTeamKey].consecutiveWins = 0;
    teamStats[fromTeamKey].opponentsInCurrentStreak = [];
  }
  if (teamStats[toTeamKey]) {
    teamStats[toTeamKey].consecutiveWins = 0;
    teamStats[toTeamKey].opponentsInCurrentStreak = [];
  }

  // Сохраняем обновленную статистику
  GlobalState.setTeamStats(teamStats);

  // Определяем, показывать ли иконки рейтинга
  const playingTeams = GlobalState.getPlayingTeams();
  const isMatchFinished = GlobalState.getIsMatchFinished();
  const isStatsInitialized = GlobalState.getIsStatsInitialized();
  const showRatings = !playingTeams && !isStatsInitialized && !isMatchFinished;
  const teamsForDisplay = !playingTeams && !isStatsInitialized && !isMatchFinished ? teamsBase : updatedTeams;

  // Формируем сообщение с обновленными составами
  const teamsMessage = buildTeamsMessage(
    teamsBase,
    'Составы команд (после перемещения)',
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

    // Уведомляем об успешном перемещении
    const fromTeamName = getTeamName(fromTeamIndex);
    const toTeamName = getTeamName(toTeamIndex);
    const playerName = player.username || player.name || 'Игрок';
    const successMessage = await ctx.reply(
      `✅ Игрок перемещен: ${playerName} из ${fromTeamName} → ${toTeamName}`,
    );
    deleteMessageAfterDelay(ctx, successMessage.message_id, 3000);

  } catch (error) {
    console.error('Ошибка при редактировании сообщения:', error);
    const errorMessage = await ctx.reply('⚠️ Ошибка при обновлении составов!');
    deleteMessageAfterDelay(ctx, errorMessage.message_id, 3000);
  }
};

module.exports = { movePlayer };
