const { Markup } = require('telegraf');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { buildPlayingTeamsMessage } = require('../message/buildPlayingTeamsMessage');
const { buildTeamsMessage } = require('../message/buildTeamsMessage');
const { getTeamName } = require('../utils/getTeamName');
const { getTeamColor } = require('../utils/getTeamColor');

module.exports = (bot, GlobalState) => {
  // Обработчик заблокированной кнопки "Выбрать команды для матча"
  bot.action('select_teams_blocked', async (ctx) => {
    // Проверка на валидность ctx.chat
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в select_teams_blocked');
      return;
    }

    await safeAnswerCallback(ctx, '⚠️ Сначала объявите составы!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Сначала нужно объявить составы команд, нажав кнопку <b>«📢 Объявить составы»</b>.',
      { parse_mode: 'HTML' },
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик кнопки "🎯 Выбрать команды для матча"
  bot.action('select_teams_callback', async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в select_teams_callback');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в select_teams_callback');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const playingTeams = GlobalState.getPlayingTeams();
    const teams = GlobalState.getTeams();
    const isTableAllowed = GlobalState.getIsTableAllowed();

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }

    // Проверка на валидность teams
    if (!Array.isArray(teams)) {
      console.error('Ошибка: teams не является массивом');
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

    // Проверяем, объявлены ли составы
    if (!isTableAllowed) {
      await safeAnswerCallback(ctx, '⚠️ Сначала объявите составы!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Сначала нужно объявить составы команд, нажав кнопку <b>«📢 Объявить составы»</b>.',
        { parse_mode: 'HTML' },
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Если активный матч существует - показываем предупреждение
    if (playingTeams) {
      await safeAnswerCallback(ctx, '⛔ Идёт активный матч!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Идёт активный матч! Завершите текущий матч перед выбором новых команд.',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Проверяем, что команды сформированы
    if (!teams || teams.length < 2) {
      await safeAnswerCallback(ctx, '⚠️ Команды не сформированы!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⚠️ Команды ещё не сформированы! Используйте команду tm для создания команд.',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Показываем список всех команд для выбора первой команды
    const buttons = [];

    for (let i = 0; i < teams.length; i++) {
      const teamColor = getTeamColor(i);
      buttons.push([
        Markup.button.callback(
          `${teamColor} ${getTeamName(i)}`,
          `select_first_team_${i}`,
        ),
      ]);
    }

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_select_teams')]);

    await safeAnswerCallback(ctx, 'Выберите первую команду');

    const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '🎯 <b>Выберите первую команду для матча:</b>',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      },
    ]);

    // Удаляем сообщение меню через 30 секунд
    deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
  });

  // Обработчик выбора первой команды
  bot.action(/^select_first_team_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в select_first_team_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в select_first_team_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 2) {
      console.error('Ошибка: некорректный ctx.match в select_first_team_');
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

    // Проверка на валидность teams
    if (!Array.isArray(teams)) {
      console.error('Ошибка: teams не является массивом');
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

    // Показываем список команд для выбора второй команды (исключая первую)
    const buttons = [];
    for (let i = 0; i < teams.length; i++) {
      if (i !== firstTeamIndex) {
        const teamColor = getTeamColor(i);
        buttons.push([
          Markup.button.callback(
            `${teamColor} ${getTeamName(i)}`,
            `select_second_team_${firstTeamIndex}_${i}`,
          ),
        ]);
      }
    }

    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback('❌ Отменить', 'cancel_select_teams')]);

    await safeAnswerCallback(ctx, 'Выбрана команда, выберите вторую');

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        `🎯 <b>Выбрана команда:</b> ${firstTeamColor} <b>${getTeamName(firstTeamIndex)}</b>\n\n<b>Выберите вторую команду:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      // Если не удалось отредактировать, отправляем новое сообщение
      const menuMessage = await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        `🎯 <b>Выбрана команда:</b> ${firstTeamColor} <b>${getTeamName(firstTeamIndex)}</b>\n\n<b>Выберите вторую команду:</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик кнопки "Отменить" при выборе команд
  bot.action('cancel_select_teams', async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в cancel_select_teams');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в cancel_select_teams');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }

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

    await safeAnswerCallback(ctx, '❌ Выбор команд отменён');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '❌ Выбор команд отменён',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Удаляем сообщение выбора команд
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

  // Обработчик выбора второй команды и запуск матча
  bot.action(/^select_second_team_(\d+)_(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в select_second_team_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в select_second_team_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 3) {
      console.error('Ошибка: некорректный ctx.match в select_second_team_');
      return;
    }

    const firstTeamIndex = parseInt(ctx.match[1], 10);
    const secondTeamIndex = parseInt(ctx.match[2], 10);

    // Удаляем сообщение меню выбора команд
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    // Используем существующий обработчик play_teams_XX, передав ему индексы команд
    // Но индексы в play_teams_XX используются как 1-based, поэтому преобразуем
    ctx.match = [null, String(firstTeamIndex + 1), String(secondTeamIndex + 1)];

    // Вызываем логику запуска матча (используем код из play_teams_XX)
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const isStatsInitialized = GlobalState.getIsStatsInitialized();
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const playingTeams = GlobalState.getPlayingTeams();
    const teams = GlobalState.getTeams();
    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();

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

    if (!teams[firstTeamIndex] || !teams[secondTeamIndex]) {
      await safeAnswerCallback(ctx, '⛔ Команды не найдены!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Команды не найдены!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (firstTeamIndex === secondTeamIndex) {
      await safeAnswerCallback(ctx, '⛔ Команда не может играть сама с собой!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Команда не может играть сама с собой!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (ctx.chat.id < 0) {
      await safeAnswerCallback(ctx, 'Напишите мне в ЛС.');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        'Напиши мне в ЛС.',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (playingTeams && !isMatchFinished) {
      await safeAnswerCallback(ctx, '⛔ Уже идет матч!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Уже идет матч! Завершите текущий матч (fn) перед началом нового.',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const resetGoals = (team) => team.map(player => ({
      ...player,
      goals: 0,
      yellowCards: 0,
    }));

    const team1 = resetGoals(teams[firstTeamIndex]);
    const team2 = resetGoals(teams[secondTeamIndex]);

    if (!isStatsInitialized) {
      const clearPlayerStats = (team) => team.map(player => ({
        ...player,
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals: 0,
        rating: 0,
      }));
      const allTeams = [...GlobalState.getTeams()].map(clearPlayerStats);
      const allTeamsBase = [...GlobalState.getTeams()];

      GlobalState.setTeamsBase([...allTeamsBase]);
      GlobalState.setTeams(allTeams);
      GlobalState.setIsStatsInitialized(true);
    }

    const updatedTeams = GlobalState.getTeams();

    // Update the existing teams message if it exists
    if (lastTeamsMessage && lastTeamsMessage.chatId && lastTeamsMessage.messageId) {
      const teamsBase = GlobalState.getTeamsBase() || teams.map(team => [...team]);
      const teamStats = GlobalState.getTeamStats() || {};

      const teamsMessageWithButtons = buildTeamsMessage(
        teamsBase,
        'Таблица',
        teamStats,
        updatedTeams,
        null,
        false,
      );

      try {
        await safeTelegramCall(ctx, 'editMessageText', [
          lastTeamsMessage.chatId,
          lastTeamsMessage.messageId,
          null,
          teamsMessageWithButtons,
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              Markup.button.callback('🎯 Выбрать команды для матча', 'select_teams_callback'),
            ]).reply_markup,
          },
        ]);
      } catch (error) {
        const description = error?.response?.description || '';
        if (description.includes('message is not modified')) {
          // ничего не делаем
        } else {
          console.error('Ошибка при редактировании сообщения:', error);
        }
      }
    }

    // Вычисляем номер матча
    const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
    const matchNumber = matchHistoryLength + 1;

    // Send the playing teams message
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, firstTeamIndex, secondTeamIndex, 'playing', updatedTeams, matchNumber);

    await safeAnswerCallback(ctx, 'Матч начат!');

    const sentMessage = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      teamsMessage,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('⚽ голы', 'show_goals_menu')],
          [Markup.button.callback('🎯 ассисты', 'show_assists_menu')],
          [Markup.button.callback('🧤 сейвы', 'show_saves_menu')],
          [Markup.button.callback('⏭️ Следующий матч', 'ksk_confirm')],
          [Markup.button.callback('⚙️ Управление', 'management_menu')],
        ]).reply_markup,
      },
    ]);

    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
    // Сохраняем сообщение матча по номеру для возможности удаления при отмене
    GlobalState.setMatchMessageByNumber(matchNumber, sentMessage.chat.id, sentMessage.message_id);
    GlobalState.setPlayingTeams({
      team1,
      team2,
      teamIndex1: firstTeamIndex,
      teamIndex2: secondTeamIndex,
    });
    GlobalState.setIsEndCommandAllowed(true);
    GlobalState.setIsTeamCommandAllowed(false);
    GlobalState.setIsMatchFinished(false);
  });

  // Обработчик выбора комбинации команд (play_teams_XX, например play_teams_12)
  bot.action(/^play_teams_(\d+)(\d+)$/, async (ctx) => {
    // Проверка на валидность ctx.from и ctx.chat
    if (!ctx.from || typeof ctx.from.id !== 'number') {
      console.error('Ошибка: некорректный ctx.from в play_teams_');
      return;
    }
    if (!ctx.chat || typeof ctx.chat.id !== 'number') {
      console.error('Ошибка: некорректный ctx.chat в play_teams_');
      return;
    }

    // Проверка на валидность ctx.match
    if (!ctx.match || ctx.match.length < 3) {
      console.error('Ошибка: некорректный ctx.match в play_teams_');
      return;
    }

    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const isStatsInitialized = GlobalState.getIsStatsInitialized();
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const playingTeams = GlobalState.getPlayingTeams();
    const teamIndex1 = parseInt(ctx.match[1], 10) - 1;
    const teamIndex2 = parseInt(ctx.match[2], 10) - 1;

    // Проверка на валидность ADMIN_ID
    if (!Array.isArray(ADMIN_ID)) {
      console.error('Ошибка: ADMIN_ID не является массивом');
      return;
    }
    const teams = GlobalState.getTeams();
    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();

    // Удаляем сообщение меню выбора команд
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (error) {
      // Игнорируем ошибки удаления
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

    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      await safeAnswerCallback(ctx, '⛔ Команды не найдены!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Команды не найдены!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (teamIndex1 === teamIndex2) {
      await safeAnswerCallback(ctx, '⛔ Команда не может играть сама с собой!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Команда не может играть сама с собой!',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (ctx.chat.id < 0) {
      await safeAnswerCallback(ctx, 'Напишите мне в ЛС.');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        'Напиши мне в ЛС.',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (playingTeams && !isMatchFinished) {
      await safeAnswerCallback(ctx, '⛔ Уже идет матч!');
      const message = await safeTelegramCall(ctx, 'sendMessage', [
        ctx.chat.id,
        '⛔ Уже идет матч! Завершите текущий матч (fn) перед началом нового.',
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const resetGoals = (team) => team.map(player => ({
      ...player,
      goals: 0,
      yellowCards: 0,
    }));

    const team1 = resetGoals(teams[teamIndex1]);
    const team2 = resetGoals(teams[teamIndex2]);

    if (!isStatsInitialized) {
      const clearPlayerStats = (team) => team.map(player => ({
        ...player,
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals: 0,
        rating: 0,
      }));
      const allTeams = [...GlobalState.getTeams()].map(clearPlayerStats);
      const allTeamsBase = [...GlobalState.getTeams()];

      GlobalState.setTeamsBase([...allTeamsBase]);
      GlobalState.setTeams(allTeams);
      GlobalState.setIsStatsInitialized(true);
    }

    const updatedTeams = GlobalState.getTeams();

    // Update the existing teams message if it exists
    if (lastTeamsMessage && lastTeamsMessage.chatId && lastTeamsMessage.messageId) {
      const teamsBase = GlobalState.getTeamsBase() || teams.map(team => [...team]);
      const teamStats = GlobalState.getTeamStats() || {};

      const teamsMessageWithButtons = buildTeamsMessage(
        teamsBase,
        'Таблица',
        teamStats,
        updatedTeams,
        null,
        false,
      );

      try {
        await safeTelegramCall(ctx, 'editMessageText', [
          lastTeamsMessage.chatId,
          lastTeamsMessage.messageId,
          null,
          teamsMessageWithButtons,
          {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              Markup.button.callback('🎯 Выбрать команды для матча', 'select_teams_callback'),
            ]).reply_markup,
          },
        ]);
      } catch (error) {
        const description = error?.response?.description || '';
        if (description.includes('message is not modified')) {
          // ничего не делаем
        } else {
          console.error('Ошибка при редактировании сообщения:', error);
        }
      }
    }

    // Вычисляем номер матча
    const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
    const matchNumber = matchHistoryLength + 1;

    // Send the playing teams message
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, 'playing', updatedTeams, matchNumber);

    await safeAnswerCallback(ctx, 'Матч начат!');

    const sentMessage = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      teamsMessage,
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('⚽ голы', 'show_goals_menu')],
          [Markup.button.callback('🎯 ассисты', 'show_assists_menu')],
          [Markup.button.callback('🧤 сейвы', 'show_saves_menu')],
          [Markup.button.callback('⏭️ Следующий матч', 'ksk_confirm')],
          [Markup.button.callback('⚙️ Управление', 'management_menu')],
        ]).reply_markup,
      },
    ]);

    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
    // Сохраняем сообщение матча по номеру для возможности удаления при отмене
    GlobalState.setMatchMessageByNumber(matchNumber, sentMessage.chat.id, sentMessage.message_id);
    GlobalState.setPlayingTeams({
      team1,
      team2,
      teamIndex1,
      teamIndex2,
    });
    GlobalState.setIsEndCommandAllowed(true);
    GlobalState.setIsTeamCommandAllowed(false);
    GlobalState.setIsMatchFinished(false);
  });
};

