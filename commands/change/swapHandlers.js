const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const { getTeamName } = require('../../utils/getTeamName');
const { getTeamColor } = require('../../utils/getTeamColor');
const { swapPlayers } = require('../../utils/swapPlayers');

// Регистрация обработчиков для обмена игроков
const registerSwapHandlers = (bot, GlobalState) => {
  // Команда для обмена игроков: c1234
  bot.hears(/^c\d\d\d\d$/i, async (ctx) => {
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
      const message = await ctx.reply('⛔ Нельзя менять игроков во время матча!');
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
      console.error('Ошибка: некорректный ctx.message.text в команде c');
      return;
    }

    const userInput = ctx.message.text.trim().slice(1); // Убираем "c"
    const team1 = parseInt(userInput[0]) - 1;    // Номер первой команды (0-based)
    const player1 = parseInt(userInput[1]) - 1;  // Позиция игрока в первой команде (0-based)
    const team2 = parseInt(userInput[2]) - 1;
    const player2 = parseInt(userInput[3]) - 1;

    await swapPlayers(ctx, team1, player1, team2, player2, GlobalState);
  });

  // Обработчик кнопки "Сменить игрока"
  bot.action('change_player_callback', async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в change_player_callback');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в change_player_callback');
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
      await safeAnswerCallback(ctx, '⛔ Нельзя менять игроков во время матча!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Нельзя менять игроков во время матча!',
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

    // Показываем список всех команд для выбора первой команды
    const buttons = [];

    for (let i = 0; i < teams.length; i++) {
      const teamColor = getTeamColor(i);
      const teamName = getTeamName(i);
      buttons.push([
        Markup.button.callback(
          `${teamColor} ${teamName}`,
          `change_first_team_${i}`,
        ),
      ]);
    }

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_change_player')]);

    await safeAnswerCallback(ctx, 'Выберите первую команду');
    const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '🔄 <b>Выберите первую команду для замены игрока:</b>',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      },
    ]);
    deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
  });

  // Обработчик выбора первой команды для замены
  bot.action(/^change_first_team_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в change_first_team_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в change_first_team_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 2) {
      console.error('Ошибка: некорректный ctx.match в change_first_team_');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const teams = GlobalState.getTeams();
    const firstTeamIndex = parseInt(ctx.match[1], 10);

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

    if (!teams[firstTeamIndex]) {
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

    const firstTeamColor = getTeamColor(firstTeamIndex);

    // Показываем список игроков первой команды
    const buttons = [];
    teams[firstTeamIndex].forEach((player, index) => {
      const displayName = player.username ? player.username : player.name;
      buttons.push([
        Markup.button.callback(
          `${index + 1}. ${displayName}`,
          `change_first_player_${firstTeamIndex}_${index}`,
        ),
      ]);
    });

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_change_player')]);

    await safeAnswerCallback(ctx, 'Выбрана команда, выберите игрока');
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        `🔄 <b>Выбрана команда:</b> ${firstTeamColor} <b>${getTeamName(firstTeamIndex)}</b>\n\n<b>Выберите игрока из этой команды:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        `🔄 <b>Выбрана команда:</b> ${firstTeamColor} <b>${getTeamName(firstTeamIndex)}</b>\n\n<b>Выберите игрока из этой команды:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик выбора первого игрока
  bot.action(/^change_first_player_(\d+)_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в change_first_player_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в change_first_player_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 3) {
      console.error('Ошибка: некорректный ctx.match в change_first_player_');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const teams = GlobalState.getTeams();
    const firstTeamIndex = parseInt(ctx.match[1], 10);
    const firstPlayerIndex = parseInt(ctx.match[2], 10);

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

    if (!teams[firstTeamIndex] || !teams[firstTeamIndex][firstPlayerIndex]) {
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

    const firstTeamColor = getTeamColor(firstTeamIndex);
    const firstPlayer = teams[firstTeamIndex][firstPlayerIndex];
    const firstPlayerName = firstPlayer.username ? firstPlayer.username : firstPlayer.name;

    // Показываем список команд для выбора второй команды (исключая первую)
    const buttons = [];
    for (let i = 0; i < teams.length; i++) {
      if (i !== firstTeamIndex) {
        const teamColor = getTeamColor(i);
        buttons.push([
          Markup.button.callback(
            `${teamColor} ${getTeamName(i)}`,
            `change_second_team_${firstTeamIndex}_${firstPlayerIndex}_${i}`,
          ),
        ]);
      }
    }

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_change_player')]);

    await safeAnswerCallback(ctx, `Выбран игрок ${firstPlayerName}, выберите вторую команду`);
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        `🔄 <b>Выбрана команда:</b> ${firstTeamColor} <b>${getTeamName(firstTeamIndex)}</b>\n<b>Игрок:</b> ${firstPlayerName}\n\n<b>Выберите вторую команду:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        `🔄 <b>Выбрана команда:</b> ${firstTeamColor} <b>${getTeamName(firstTeamIndex)}</b>\n<b>Игрок:</b> ${firstPlayerName}\n\n<b>Выберите вторую команду:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик выбора второй команды для замены
  bot.action(/^change_second_team_(\d+)_(\d+)_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в change_second_team_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в change_second_team_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 4) {
      console.error('Ошибка: некорректный ctx.match в change_second_team_');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }
    const teams = GlobalState.getTeams();
    const firstTeamIndex = parseInt(ctx.match[1], 10);
    const firstPlayerIndex = parseInt(ctx.match[2], 10);
    const secondTeamIndex = parseInt(ctx.match[3], 10);

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

    if (!teams[secondTeamIndex]) {
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

    const secondTeamColor = getTeamColor(secondTeamIndex);
    const firstPlayer = teams[firstTeamIndex][firstPlayerIndex];
    const firstPlayerName = firstPlayer.username ? firstPlayer.username : firstPlayer.name;

    // Показываем список игроков второй команды
    const buttons = [];
    teams[secondTeamIndex].forEach((player, index) => {
      const displayName = player.username ? player.username : player.name;
      buttons.push([
        Markup.button.callback(
          `${index + 1}. ${displayName}`,
          `change_second_player_${firstTeamIndex}_${firstPlayerIndex}_${secondTeamIndex}_${index}`,
        ),
      ]);
    });

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_change_player')]);

    await safeAnswerCallback(ctx, 'Выбрана команда, выберите игрока');
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        `🔄 <b>Выбрана команда:</b> ${secondTeamColor} <b>${getTeamName(secondTeamIndex)}</b>\n<b>Игрок из ${getTeamName(firstTeamIndex)}:</b> ${firstPlayerName}\n\n<b>Выберите игрока из ${getTeamName(secondTeamIndex)}:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        `🔄 <b>Выбрана команда:</b> ${secondTeamColor} <b>${getTeamName(secondTeamIndex)}</b>\n<b>Игрок из ${getTeamName(firstTeamIndex)}:</b> ${firstPlayerName}\n\n<b>Выберите игрока из ${getTeamName(secondTeamIndex)}:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик выбора второго игрока и выполнение замены
  bot.action(/^change_second_player_(\d+)_(\d+)_(\d+)_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в change_second_player_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в change_second_player_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 5) {
      console.error('Ошибка: некорректный ctx.match в change_second_player_');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const firstTeamIndex = parseInt(ctx.match[1], 10);
    const firstPlayerIndex = parseInt(ctx.match[2], 10);
    const secondTeamIndex = parseInt(ctx.match[3], 10);
    const secondPlayerIndex = parseInt(ctx.match[4], 10);

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

    await safeAnswerCallback(ctx, 'Выполняю замену...');
    await swapPlayers(ctx, firstTeamIndex, firstPlayerIndex, secondTeamIndex, secondPlayerIndex, GlobalState);
  });

  // Обработчик кнопки "Отменить" при замене игрока
  bot.action('cancel_change_player', async (ctx) => {
    // Проверка на валидность ctx.from
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в cancel_change_player');
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

    await safeAnswerCallback(ctx, '❌ Замена игрока отменена');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '❌ Замена игрока отменена',
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

module.exports = { registerSwapHandlers };
