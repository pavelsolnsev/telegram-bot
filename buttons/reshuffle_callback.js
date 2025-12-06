const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { buildTeamsMessage } = require('../message/buildTeamsMessage');
const { reshuffleArray } = require('../utils/reshuffleArray');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');


module.exports = (bot, GlobalState) => {
  bot.action('reshuffle_callback', async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const playingTeams = GlobalState.getPlayingTeams();
    const isTeamCommandAllowed = GlobalState.getIsTeamCommandAllowed();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ У вас нет прав для этой команды.',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Проверка, разрешена ли команда tm (та же проверка, что и в команде tm)
    if (!isTeamCommandAllowed) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Команда tm запрещена, пока матчи между командами не завершён (используйте e!).',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Проверка, начат ли матч между командами (та же проверка, что и в команде tm)
    if (playingTeams) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Нельзя менять составы команд во время матча!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const numTeams = GlobalState.getLastTeamCount();
    let players = [...GlobalState.getPlayers()];

    if (!players || players.length === 0) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Нет игроков для создания команд!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (players.length < numTeams) {
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Недостаточно игроков для создания команд!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Перемешиваем игроков случайным образом
    players = reshuffleArray(players);

    // Распределяем игроков по командам случайным образом
    const teams = Array.from({ length: numTeams }, () => []);
    players.forEach((player, index) => {
      teams[index % numTeams].push(player);
    });

    GlobalState.setTeams(teams);

    const randomSymbols = ['⚽', '🏀', '🏈', '🎾', '🏐', '🥅', '🎯'];
    const randomSymbol = randomSymbols[Math.floor(Math.random() * randomSymbols.length)];

    const teamsMessage = buildTeamsMessage(teams, `Составы команд (перемешаны) ${randomSymbol}`);

    // Сначала отвечаем на callback, чтобы избежать устаревания
    await safeAnswerCallback(ctx, 'Команды перемешаны!');

    try {
      // Получаем ID сообщения из callback_query
      const messageId = ctx.callbackQuery.message.message_id;
      await safeTelegramCall(ctx, 'editMessageText', [
        ctx.chat.id,
        messageId,
        null,
        teamsMessage,
        {
          parse_mode: 'HTML',
          reply_markup: (() => {
            const isTableAllowed = GlobalState.getIsTableAllowed();
            const playingTeams = GlobalState.getPlayingTeams();
            const buttons = [];
            if (isTableAllowed) {
              // Если составы объявлены - показываем кнопку выбора команд
              buttons.push([Markup.button.callback('🎯 Выбрать команды для матча', 'select_teams_callback')]);
            } else {
              // Если составы не объявлены - показываем кнопку выбора команд (заблокированную) и кнопку объявления
              buttons.push([Markup.button.callback('🎯 Выбрать команды для матча', 'select_teams_blocked')]);
              buttons.push([Markup.button.callback('📢 Объявить составы', 'announce_teams')]);
            }
            // Кнопка "Сменить игрока" показывается всегда, когда матч не идет (независимо от isTableAllowed)
            if (!playingTeams) {
              buttons.push([Markup.button.callback('🔄 Сменить игрока', 'change_player_callback')]);
            }
            return Markup.inlineKeyboard(buttons).reply_markup;
          })(),
        },
      ]);
    } catch (error) {
      console.error('Ошибка при обновлении сообщения:', error);
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Произошла ошибка при обновлении сообщения!',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
    }
  });
};
