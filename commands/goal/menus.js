const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const { buildPlayingTeamsMessage } = require('../../message/buildPlayingTeamsMessage');
const { createTeamButtons, createAssistButtons, createYellowCardButtons } = require('../../buttons/createTeamButtons');
const { createCancelGoalButtons, createCancelAssistButtons } = require('./buttons');
const { getTeamColor } = require('../../utils/getTeamColor');

// Обработчик кнопки "Управление"
const handleManagementMenu = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка прав админа
  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  // Проверка условий
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  // Показываем меню управления
  const menuMessage = '⚙️ <b>Меню управления</b>\n\nВыберите действие:';
  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;

  // Определяем текст кнопки в зависимости от состояния
  const isMatchFinished = GlobalState.getIsMatchFinished();
  let endButtonText = '';

  if (isMatchFinished) {
    endButtonText = '⏪ Вернуться в прошлый матч';
  } else if (playingTeams) {
    endButtonText = '🚫 Отменить текущий матч';
  } else {
    endButtonText = '⏪ Управление матчами';
  }

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        menuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback(endButtonText, 'end_match')],
            [Markup.button.callback('🏁 Завершить матч', 'finish_match')],
            [Markup.button.callback('🟨 Отметить карточку', 'show_yellow_cards_menu')],
            [Markup.button.callback('⬅️ Назад', 'management_back')],
          ]).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx, '⚙️ Меню управления');
  } catch (error) {
    // Если не удалось отредактировать сообщение, отправляем новое
    if (chatId) {
      await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        menuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback(endButtonText, 'end_match')],
            [Markup.button.callback('🏁 Завершить матч', 'finish_match')],
            [Markup.button.callback('⬅️ Назад', 'management_back')],
          ]).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx, '⚙️ Меню управления');
  }
};

// Обработчик кнопки "Отменить гол" - показывает список игроков
const handleCancelGoalMenu = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка прав админа
  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  // Проверка условий
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const color1 = getTeamColor(teamIndex1);
  const color2 = getTeamColor(teamIndex2);

  // Создаем кнопки для игроков с голами
  const team1Buttons = createCancelGoalButtons(team1, teamIndex1, color1);
  const team2Buttons = createCancelGoalButtons(team2, teamIndex2, color2);

  // Объединяем кнопки
  const allButtons = [...team1Buttons, ...team2Buttons];

  // Добавляем кнопку "Назад"
  if (allButtons.length === 0) {
    allButtons.push([Markup.button.callback('⚠️ Нет игроков с голами', 'noop')]);
  }
  allButtons.push([Markup.button.callback('⬅️ Назад к управлению', 'management_menu')]);

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;
  const cancelGoalMessage = '❌ <b>Отменить гол</b>\n\nВыберите игрока:';

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        cancelGoalMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx);
  } catch (error) {
    // Если не удалось отредактировать сообщение, отправляем новое
    if (chatId) {
      await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        cancelGoalMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx);
  }
};

// Обработчик кнопки "Отметить голы" - показывает список игроков для добавления голов
const handleShowGoalsMenu = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка прав админа
  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  // Проверка условий
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const team1Buttons = createTeamButtons(team1, teamIndex1);
  const team2Buttons = createTeamButtons(team2, teamIndex2);

  // Объединяем кнопки с разделителем
  const allButtons = [
    ...team1Buttons,
    [Markup.button.callback('—', 'noop')],
    ...team2Buttons,
    [],
    [Markup.button.callback('❌ Отменить гол', 'cancel_goal_menu')],
    [Markup.button.callback('⬅️ Назад', 'goals_menu_back')],
  ];

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;

  // Вычисляем номер матча для заголовка
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;

  const goalsMenuMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    teamIndex1,
    teamIndex2,
    'playing',
    undefined,
    matchNumber,
  );

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        goalsMenuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx, '⚽ Выберите игрока');
  } catch (error) {
    // Если не удалось отредактировать сообщение, отправляем новое
    if (chatId) {
      await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        goalsMenuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx, '⚽ Выберите игрока');
  }
};

// Обработчик кнопки "Отметить ассист" - показывает список игроков для добавления ассистов
const handleShowAssistsMenu = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка прав админа
  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  // Проверка условий
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const team1Buttons = createAssistButtons(team1, teamIndex1);
  const team2Buttons = createAssistButtons(team2, teamIndex2);

  // Объединяем кнопки с разделителем
  const allButtons = [
    ...team1Buttons,
    [Markup.button.callback('—', 'noop')],
    ...team2Buttons,
    [],
    [Markup.button.callback('❌ Отменить ассист', 'cancel_assist_menu')],
    [Markup.button.callback('⬅️ Назад', 'assists_menu_back')],
  ];

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;

  // Вычисляем номер матча для заголовка
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;

  const assistsMenuMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    teamIndex1,
    teamIndex2,
    'playing',
    undefined,
    matchNumber,
  );

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        assistsMenuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx, '🎯 Выберите игрока');
  } catch (error) {
    // Если не удалось отредактировать сообщение, отправляем новое
    if (chatId) {
      await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        assistsMenuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx, '🎯 Выберите игрока');
  }
};

// Обработчик кнопки "Отменить ассист" - показывает список игроков с ассистами
const handleCancelAssistMenu = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка прав админа
  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  // Проверка условий
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const color1 = getTeamColor(teamIndex1);
  const color2 = getTeamColor(teamIndex2);

  // Создаем кнопки для игроков с ассистами
  const team1Buttons = createCancelAssistButtons(team1, teamIndex1, color1);
  const team2Buttons = createCancelAssistButtons(team2, teamIndex2, color2);

  // Объединяем кнопки
  const allButtons = [...team1Buttons, ...team2Buttons];

  // Добавляем кнопку "Назад"
  if (allButtons.length === 0) {
    allButtons.push([Markup.button.callback('⚠️ Нет игроков с ассистами', 'noop')]);
  }
  allButtons.push([Markup.button.callback('⬅️ Назад к ассистам', 'show_assists_menu')]);

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;
  const cancelAssistMessage = '❌ <b>Отменить ассист</b>\n\nВыберите игрока:';

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        cancelAssistMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx);
  } catch (error) {
    // Если не удалось отредактировать сообщение, отправляем новое
    if (chatId) {
      await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        cancelAssistMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx);
  }
};

// Обработчик кнопки "Назад" из меню ассистов - возвращает к основному виду
const handleAssistsMenuBack = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const playingTeams = GlobalState.getPlayingTeams();

  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  // Вычисляем номер матча
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;

  const teamsMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    teamIndex1,
    teamIndex2,
    'playing',
    undefined,
    matchNumber,
  );

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
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
    }
    await safeAnswerCallback(ctx, '⬅️ Назад');
  } catch (error) {
    await safeAnswerCallback(ctx, '⬅️ Назад');
  }
};

// Обработчик кнопки "Назад" из меню голов - возвращает к основному виду
const handleGoalsMenuBack = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const playingTeams = GlobalState.getPlayingTeams();

  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  // Вычисляем номер матча
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;

  const teamsMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    teamIndex1,
    teamIndex2,
    'playing',
    undefined,
    matchNumber,
  );

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
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
    }
    await safeAnswerCallback(ctx, '⬅️ Назад');
  } catch (error) {
    await safeAnswerCallback(ctx, '⬅️ Назад');
  }
};

// Обработчик кнопки "Отметить желтую карточку" - показывает список игроков
const handleShowYellowCardsMenu = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка прав админа
  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  // Проверка условий
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const team1Buttons = createYellowCardButtons(team1, teamIndex1);
  const team2Buttons = createYellowCardButtons(team2, teamIndex2);

  // Объединяем кнопки с разделителем
  const allButtons = [
    ...team1Buttons,
    [Markup.button.callback('—', 'noop')],
    ...team2Buttons,
    [],
    [Markup.button.callback('⬅️ Назад к управлению', 'management_menu')],
  ];

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;

  // Вычисляем номер матча для заголовка
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;

  const yellowCardsMenuMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    teamIndex1,
    teamIndex2,
    'playing',
    undefined,
    matchNumber,
  );

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        yellowCardsMenuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx, '🟨 Выберите игрока');
  } catch (error) {
    // Если не удалось отредактировать сообщение, отправляем новое
    if (chatId) {
      await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        yellowCardsMenuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx, '🟨 Выберите игрока');
  }
};

// Обработчик выбора игрока для желтой карточки
const handleYellowCardAction = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();

  // Проверка прав админа
  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  // Проверка на валидность ctx.match
  if (!ctx.match || ctx.match.length < 3) {
    console.error('Ошибка: некорректный ctx.match в handleYellowCardAction');
    return;
  }

  const teamIndex = parseInt(ctx.match[1], 10);
  const playerIndex = parseInt(ctx.match[2], 10);
  const playingTeams = GlobalState.getPlayingTeams();

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    return;
  }

  const { team1, team2 } = playingTeams;
  const team = teamIndex === playingTeams.teamIndex1 ? team1 : team2;
  const player = team[playerIndex];

  if (!player) {
    await safeAnswerCallback(ctx, '⛔ Игрок не найден!');
    return;
  }

  // Добавляем желтую карточку игроку в памяти
  player.yellowCards = (player.yellowCards || 0) + 1;
  GlobalState.setPlayingTeams(playingTeams);

  // Возвращаемся к основному меню матча
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;

  const teamsMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    playingTeams.teamIndex1,
    playingTeams.teamIndex2,
    'playing',
    undefined,
    matchNumber,
  );

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
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
    }
  } catch (error) {
    console.error('Ошибка при обновлении сообщения:', error);
  }

  const displayName = player.username ? player.username : player.name;
  await safeAnswerCallback(ctx, `🟨 ${displayName} получил желтую карточку!`);

  const message = await safeTelegramCall(ctx, 'sendMessage', [
    ctx.chat.id,
    `🟨 Игрок <b>${displayName}</b> получил желтую карточку!`,
    { parse_mode: 'HTML' },
  ]);
  if (message) {
    deleteMessageAfterDelay(ctx, message.message_id, 3000);
  }
};

// Обработчик кнопки "Назад" - возвращает к основному меню
const handleManagementBack = async (ctx, GlobalState) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const playingTeams = GlobalState.getPlayingTeams();

  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }

  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) {
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  // Вычисляем номер матча
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;

  const teamsMessage = buildPlayingTeamsMessage(
    team1,
    team2,
    teamIndex1,
    teamIndex2,
    'playing',
    undefined,
    matchNumber,
  );

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
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
    }
    await safeAnswerCallback(ctx, '⬅️ Возврат к основному меню');
  } catch (error) {
    await safeAnswerCallback(ctx, '⬅️ Возврат к основному меню');
  }
};

module.exports = {
  handleManagementMenu,
  handleCancelGoalMenu,
  handleShowGoalsMenu,
  handleShowAssistsMenu,
  handleCancelAssistMenu,
  handleAssistsMenuBack,
  handleGoalsMenuBack,
  handleManagementBack,
  handleShowYellowCardsMenu,
  handleYellowCardAction,
};
