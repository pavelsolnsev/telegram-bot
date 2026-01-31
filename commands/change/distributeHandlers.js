const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const { getTeamName } = require('../../utils/getTeamName');
const { buildTeamsMessage } = require('../../message/buildTeamsMessage');
const { createTeamManagementButtons } = require('../../utils/createTeamManagementButtons');

// Получить всех игроков, которых можно добавить в команду (не в этой команде)
const getPlayersAvailableForTeam = (teams, queue, targetTeamIndex) => {
  const result = [];
  const seenIds = new Set();

  // Добавляем игроков из очереди
  if (Array.isArray(queue)) {
    queue.forEach((player) => {
      if (player && player.id && !seenIds.has(player.id)) {
        seenIds.add(player.id);
        result.push({ player, source: 'queue' });
      }
    });
  }

  // Добавляем игроков из других команд
  if (Array.isArray(teams)) {
    teams.forEach((team, teamIndex) => {
      if (teamIndex !== targetTeamIndex && Array.isArray(team)) {
        team.forEach((player) => {
          if (player && player.id && !seenIds.has(player.id)) {
            seenIds.add(player.id);
            result.push({ player, source: 'team', teamIndex });
          }
        });
      }
    });
  }

  return result;
};

// Добавить игрока в команду (из очереди или другой команды)
const addPlayerToTeam = (playerId, toTeamIndex, GlobalState) => {
  const teams = GlobalState.getTeams();
  const queue = GlobalState.getQueue();

  if (!Array.isArray(teams) || toTeamIndex < 0 || toTeamIndex >= teams.length) {
    return { success: false, error: 'Неверная команда' };
  }

  // Ищем игрока в очереди
  const queueIndex = Array.isArray(queue) ? queue.findIndex((p) => p && p.id === playerId) : -1;
  if (queueIndex >= 0) {
    const player = queue[queueIndex];
    const newQueue = [...queue];
    newQueue.splice(queueIndex, 1);
    const updatedTeams = teams.map((t, i) => (i === toTeamIndex ? [...t, player] : [...t]));
    GlobalState.setQueue(newQueue);
    GlobalState.setTeams(updatedTeams);
    GlobalState.setTeamsBase(updatedTeams);
    return { success: true, player, source: 'queue' };
  }

  // Ищем игрока в других командах
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
    if (teamIndex === toTeamIndex) continue;
    const playerIndex = teams[teamIndex].findIndex((p) => p && p.id === playerId);
    if (playerIndex >= 0) {
      const player = teams[teamIndex][playerIndex];
      const updatedTeams = teams.map((t, i) => {
        if (i === teamIndex) {
          const copy = [...t];
          copy.splice(playerIndex, 1);
          return copy;
        }
        if (i === toTeamIndex) return [...t, player];
        return t;
      });
      GlobalState.setTeams(updatedTeams);
      GlobalState.setTeamsBase(updatedTeams);
      return { success: true, player, source: 'team' };
    }
  }

  return { success: false, error: 'Игрок не найден' };
};

// Регистрация обработчиков для распределения игроков
const registerDistributeHandlers = (bot, GlobalState) => {
  bot.action('distribute_players_callback', async (ctx) => {
    if (!ctx.from || typeof ctx.from.id !== 'number') return;
    if (!ctx.chat || typeof ctx.chat.id !== 'number') return;

    const ADMIN_ID = GlobalState.getAdminId();
    const playingTeams = GlobalState.getPlayingTeams();
    const teams = GlobalState.getTeams();

    if (!Array.isArray(ADMIN_ID) || !ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      return;
    }

    if (playingTeams) {
      await safeAnswerCallback(ctx, '⛔ Нельзя распределять игроков во время матча!');
      return;
    }

    if (!teams || teams.length === 0) {
      await safeAnswerCallback(ctx, '⚠️ Команды еще не сформированы!');
      return;
    }

    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const buttons = [];

    for (let i = 0; i < teams.length; i++) {
      if (teams[i]) {
        const teamColor = teamColors[i] || '⚽';
        const teamName = getTeamName(i);
        buttons.push([
          Markup.button.callback(
            `${teamColor} ${teamName} (${teams[i].length} игроков)`,
            `distribute_to_team_${i}`,
          ),
        ]);
      }
    }

    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_distribute')]);

    await safeAnswerCallback(ctx, 'Выберите команду');
    const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '👥 <b>Распределить игроков</b>\n\n<b>Выберите команду, в которую добавить игроков:</b>',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      },
    ]);
    deleteMessageAfterDelay(ctx, menuMessage.message_id, 60000);
  });

  bot.action(/^distribute_to_team_(\d+)$/, async (ctx) => {
    if (!ctx.from || typeof ctx.from.id !== 'number') return;
    if (!ctx.chat || typeof ctx.chat.id !== 'number') return;
    if (!ctx.match || ctx.match.length < 2) return;

    const ADMIN_ID = GlobalState.getAdminId();
    const teams = GlobalState.getTeams();
    const queue = GlobalState.getQueue();
    const targetTeamIndex = parseInt(ctx.match[1], 10);

    if (!Array.isArray(ADMIN_ID) || !ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      return;
    }

    if (!teams[targetTeamIndex]) {
      await safeAnswerCallback(ctx, '⛔ Команда не найдена!');
      return;
    }

    const available = getPlayersAvailableForTeam(teams, queue, targetTeamIndex);

    if (available.length === 0) {
      await safeAnswerCallback(ctx, 'Нет игроков для добавления');
      const msg = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Нет игроков для добавления в эту команду.\nВсе игроки уже распределены.',
      ]);
      deleteMessageAfterDelay(ctx, msg.message_id, 5000);
      return;
    }

    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const targetTeamColor = teamColors[targetTeamIndex] || '⚽';
    const targetTeamName = getTeamName(targetTeamIndex);
    const buttons = [];

    available.forEach(({ player }) => {
      const displayName = player.username || player.name || `ID:${player.id}`;
      buttons.push([
        Markup.button.callback(
          `➕ ${displayName}`,
          `distribute_add_${targetTeamIndex}_${player.id}`,
        ),
      ]);
    });

    buttons.push([Markup.button.callback('◀️ Назад к командам', 'distribute_players_callback')]);
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_distribute')]);

    await safeAnswerCallback(ctx, 'Выберите игрока');
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        `👥 <b>Распределить игроков</b>\n\n<b>Команда:</b> ${targetTeamColor} ${targetTeamName}\n\n<b>Выберите игрока для добавления:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch {
      const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        `👥 <b>Распределить игроков</b>\n\n<b>Команда:</b> ${targetTeamColor} ${targetTeamName}\n\n<b>Выберите игрока для добавления:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 60000);
    }
  });

  bot.action(/^distribute_add_(\d+)_(\d+)$/, async (ctx) => {
    if (!ctx.from || typeof ctx.from.id !== 'number') return;
    if (!ctx.chat || typeof ctx.chat.id !== 'number') return;
    if (!ctx.match || ctx.match.length < 3) return;

    const ADMIN_ID = GlobalState.getAdminId();
    const toTeamIndex = parseInt(ctx.match[1], 10);
    const playerId = parseInt(ctx.match[2], 10);

    if (!Array.isArray(ADMIN_ID) || !ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      return;
    }

    const result = addPlayerToTeam(playerId, toTeamIndex, GlobalState);

    if (!result.success) {
      await safeAnswerCallback(ctx, `⚠️ ${result.error}`);
      return;
    }

    const playerName = result.player.username || result.player.name || 'Игрок';
    const teamName = getTeamName(toTeamIndex);
    await safeAnswerCallback(ctx, `✅ ${playerName} добавлен в ${teamName}`);

    // Обновляем сообщение о составах
    const teamStats = GlobalState.getTeamStats() || {};
    const teamsBase = GlobalState.getTeamsBase() || GlobalState.getTeams();
    const teams = GlobalState.getTeams();
    const playingTeams = GlobalState.getPlayingTeams();
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const isStatsInitialized = GlobalState.getIsStatsInitialized();
    const showRatings = !playingTeams && !isStatsInitialized && !isMatchFinished;
    const teamsForDisplay = !playingTeams && !isStatsInitialized && !isMatchFinished ? teamsBase : teams;

    const teamsMessage = buildTeamsMessage(
      teamsBase,
      'Составы команд (после распределения)',
      teamStats,
      teamsForDisplay,
      null,
      showRatings,
    );

    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
    try {
      if (lastTeamsMessage?.chatId && lastTeamsMessage?.messageId) {
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
      }
    } catch (err) {
      console.error('Ошибка обновления сообщения о командах:', err);
    }

    // Показываем обновлённый список игроков для добавления (или возврат к командам)
    const queue = GlobalState.getQueue();
    const available = getPlayersAvailableForTeam(teams, queue, toTeamIndex);

    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const targetTeamColor = teamColors[toTeamIndex] || '⚽';
    const targetTeamName = getTeamName(toTeamIndex);
    const buttons = [];

    if (available.length > 0) {
      available.forEach(({ player }) => {
        const displayName = player.username || player.name || `ID:${player.id}`;
        buttons.push([
          Markup.button.callback(
            `➕ ${displayName}`,
            `distribute_add_${toTeamIndex}_${player.id}`,
          ),
        ]);
      });
    }

    buttons.push([Markup.button.callback('◀️ Назад к командам', 'distribute_players_callback')]);
    buttons.push([Markup.button.callback('✅ Готово', 'distribute_done')]);

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    const statusText = available.length > 0
      ? '<b>Выберите игрока для добавления:</b>'
      : '✅ Все игроки распределены.';

    try {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        `👥 <b>Распределить игроков</b>\n\n<b>Команда:</b> ${targetTeamColor} ${targetTeamName}\n\n${playerName} добавлен в команду!\n\n${statusText}`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch {
      const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        `👥 <b>Распределить игроков</b>\n\n<b>Команда:</b> ${targetTeamColor} ${targetTeamName}\n\n${playerName} добавлен в команду!\n\n${statusText}`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 60000);
    }
  });

  bot.action('cancel_distribute', async (ctx) => {
    if (!ctx.from || typeof ctx.from.id !== 'number') return;

    const ADMIN_ID = GlobalState.getAdminId();
    if (!Array.isArray(ADMIN_ID) || !ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      return;
    }

    await safeAnswerCallback(ctx, '❌ Распределение отменено');
    const msg = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '❌ Распределение игроков отменено',
    ]);
    if (msg) deleteMessageAfterDelay(ctx, msg.message_id, 4000);

    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]);
      }
    } catch {
      // ignore
    }
  });

  bot.action('distribute_done', async (ctx) => {
    if (!ctx.from || typeof ctx.from.id !== 'number') return;

    const ADMIN_ID = GlobalState.getAdminId();
    if (!Array.isArray(ADMIN_ID) || !ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      return;
    }

    await safeAnswerCallback(ctx, '✅ Готово');
    const msg = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '✅ Распределение завершено',
    ]);
    if (msg) deleteMessageAfterDelay(ctx, msg.message_id, 3000);

    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [chatId, messageId]);
      }
    } catch {
      // ignore
    }
  });
};

module.exports = { registerDistributeHandlers };
