const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const { getTeamName } = require('../../utils/getTeamName');
const { checkUnevenDistribution } = require('../../utils/checkUnevenDistribution');
const { movePlayer } = require('../../utils/movePlayer');

// Регистрация обработчиков для перемещения игроков
const registerMoveHandlers = (bot, GlobalState) => {
  // Команда для перемещения игрока: m123 (команда-источник, позиция игрока, команда-цель)
  bot.hears(/^m\d\d\d$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();

    await ctx.deleteMessage().catch(() => {});

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply('⛔ Нет прав!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply('⚠️ Матч не начат!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (playingTeams) {
      const message = await ctx.reply('⛔ Нельзя перемещать игроков во время матча!');
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teams = GlobalState.getTeams();
    if (!Array.isArray(teams) || teams.length === 0) {
      const message = await ctx.reply('⚠️ Команды еще не сформированы!');
      if (message && message.message_id) {
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    // Проверка на валидность ctx.message.text
    if (!ctx.message || !ctx.message.text || typeof ctx.message.text !== 'string') {
      console.error('Ошибка: некорректный ctx.message.text в команде m');
      return;
    }

    const userInput = ctx.message.text.trim().slice(1); // Убираем "m"
    const fromTeam = parseInt(userInput[0]) - 1;    // Номер команды-источника (0-based)
    const playerIndex = parseInt(userInput[1]) - 1;  // Позиция игрока в команде-источнике (0-based)
    const toTeam = parseInt(userInput[2]) - 1;      // Номер команды-цели (0-based)

    await movePlayer(ctx, fromTeam, playerIndex, toTeam, GlobalState);
  });

  // Обработчик кнопки "Переместить игрока"
  bot.action('move_player_callback', async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в move_player_callback');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в move_player_callback');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();
    const teams = GlobalState.getTeams();

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ У вас нет прав для этой команды.',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Матч не начат!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (playingTeams) {
      await safeAnswerCallback(ctx, '⛔ Нельзя перемещать игроков во время матча!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Нельзя перемещать игроков во время матча!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!teams || teams.length === 0) {
      await safeAnswerCallback(ctx, '⚠️ Команды еще не сформированы!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Команды еще не сформированы!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Проверяем неравномерное распределение
    const distribution = checkUnevenDistribution(teams);
    if (!distribution.isUneven) {
      await safeAnswerCallback(ctx, '✅ Распределение равномерное, перемещение не требуется');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '✅ Распределение игроков равномерное, перемещение не требуется',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Показываем список команд с большим количеством игроков для выбора
    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const buttons = [];

    // Показываем только команду с максимальным количеством игроков
    const maxTeamIndex = distribution.maxTeamIndex;
    const maxTeamColor = teamColors[maxTeamIndex] || '⚽';
    const maxTeamName = getTeamName(maxTeamIndex);
    buttons.push([
      Markup.button.callback(
        `${maxTeamColor} ${maxTeamName} (${distribution.maxTeamSize} игроков)`,
        `move_from_team_${maxTeamIndex}`,
      ),
    ]);

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_move_player')]);

    await safeAnswerCallback(ctx, 'Выберите команду с лишним игроком');
    const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `↔️ <b>Перемещение игрока</b>\n\n<b>Выберите команду с лишним игроком:</b>\n${maxTeamColor} ${maxTeamName} (${distribution.maxTeamSize} игроков)`,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      },
    ]);
    deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
  });

  // Обработчик выбора команды с лишним игроком
  bot.action(/^move_from_team_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в move_from_team_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в move_from_team_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 2) {
      console.error('Ошибка: некорректный ctx.match в move_from_team_');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const teams = GlobalState.getTeams();
    const fromTeamIndex = parseInt(ctx.match[1], 10);

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Нет прав!',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    if (!teams[fromTeamIndex]) {
      await safeAnswerCallback(ctx, '⛔ Команда не найдена!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Команда не найдена!',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const fromTeamColor = teamColors[fromTeamIndex] || '⚽';

    // Показываем список игроков команды
    const buttons = [];
    teams[fromTeamIndex].forEach((player, index) => {
      const displayName = player.username ? player.username : player.name;
      buttons.push([
        Markup.button.callback(
          `${index + 1}. ${displayName}`,
          `move_player_${fromTeamIndex}_${index}`,
        ),
      ]);
    });

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_move_player')]);

    await safeAnswerCallback(ctx, 'Выбрана команда, выберите игрока');
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        `↔️ <b>Перемещение игрока</b>\n\n<b>Выбрана команда:</b> ${fromTeamColor} <b>${getTeamName(fromTeamIndex)}</b>\n\n<b>Выберите игрока для перемещения:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        `↔️ <b>Перемещение игрока</b>\n\n<b>Выбрана команда:</b> ${fromTeamColor} <b>${getTeamName(fromTeamIndex)}</b>\n\n<b>Выберите игрока для перемещения:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик выбора игрока для перемещения
  bot.action(/^move_player_(\d+)_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в move_player_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в move_player_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 3) {
      console.error('Ошибка: некорректный ctx.match в move_player_');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const teams = GlobalState.getTeams();
    const fromTeamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Нет прав!',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    if (!teams[fromTeamIndex] || !teams[fromTeamIndex][playerIndex]) {
      await safeAnswerCallback(ctx, '⛔ Игрок не найден!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Игрок не найден!',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const fromTeamColor = teamColors[fromTeamIndex] || '⚽';
    const player = teams[fromTeamIndex][playerIndex];
    const playerName = player.username ? player.username : player.name;

    // Получаем информацию о неравномерном распределении
    const distribution = checkUnevenDistribution(teams);
    
    // Показываем список команд с меньшим количеством игроков (исключая исходную)
    const buttons = [];
    for (let i = 0; i < teams.length; i++) {
      if (i !== fromTeamIndex && teams[i].length === distribution.minTeamSize) {
        const teamColor = teamColors[i] || '⚽';
        buttons.push([
          Markup.button.callback(
            `${teamColor} ${getTeamName(i)} (${teams[i].length} игроков)`,
            `move_to_team_${fromTeamIndex}_${playerIndex}_${i}`,
          ),
        ]);
      }
    }

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_move_player')]);

    await safeAnswerCallback(ctx, `Выбран игрок ${playerName}, выберите целевую команду`);
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        `↔️ <b>Перемещение игрока</b>\n\n<b>Игрок:</b> ${playerName}\n<b>Из команды:</b> ${fromTeamColor} ${getTeamName(fromTeamIndex)}\n\n<b>Выберите целевую команду:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        `↔️ <b>Перемещение игрока</b>\n\n<b>Игрок:</b> ${playerName}\n<b>Из команды:</b> ${fromTeamColor} ${getTeamName(fromTeamIndex)}\n\n<b>Выберите целевую команду:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик выбора целевой команды и выполнение перемещения
  bot.action(/^move_to_team_(\d+)_(\d+)_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в move_to_team_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в move_to_team_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 4) {
      console.error('Ошибка: некорректный ctx.match в move_to_team_');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const fromTeamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const toTeamIndex = parseInt(ctx.match[3], 10);

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ Нет прав!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Нет прав!',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    // Удаляем сообщение меню
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    await safeAnswerCallback(ctx, 'Выполняю перемещение...');
    await movePlayer(ctx, fromTeamIndex, playerIndex, toTeamIndex, GlobalState);
  });

  // Обработчик кнопки "Отменить" при перемещении игрока
  bot.action('cancel_move_player', async (ctx) => {
    // Проверка на валидность ctx.from
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в cancel_move_player');
      return;
    }
    const ADMIN_ID = GlobalState.getAdminId();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ У вас нет прав для этой команды.',
      ]);
      if (message) {
        deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }
      return;
    }

    await safeAnswerCallback(ctx, '❌ Перемещение игрока отменено');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '❌ Перемещение игрока отменено',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Удаляем сообщение выбора
    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, 'deleteMessage', [
          chatId,
          messageId,
        ]);
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }
  });
};

module.exports = { registerMoveHandlers };
