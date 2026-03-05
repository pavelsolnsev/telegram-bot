const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const { updatePlayingTeamsMessage } = require('../../message/updatePlayingTeamsMessage');
const { buildPlayingTeamsMessage } = require('../../message/buildPlayingTeamsMessage');
const { createSaveButtons } = require('../../buttons/createTeamButtons');
const { createCancelSaveButtons } = require('./buttons');
const { getTeamColor } = require('../../utils/getTeamColor');

// Обработчик команды "sv <team> <player>" для добавления сейва
const handleSaveCommand = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в команде sv');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в команде sv');
    return;
  }

  const args = ctx.message?.text?.match(/^sv(\d+)(\d+)$/i);
  if (!args || args.length < 3) {
    console.error('Ошибка: некорректный формат команды sv');
    return;
  }

  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();

  // Проверка на валидность ADMIN_ID
  if (!Array.isArray(ADMIN_ID)) {
    console.error('Ошибка: ADMIN_ID не является массивом');
    return;
  }

  await ctx.deleteMessage().catch(() => {});

  if (!ADMIN_ID.includes(ctx.from.id)) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ У вас нет прав для этой команды.',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!isMatchStarted) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const teamIndex = parseInt(args[1], 10) - 1;
  const playerIndex = parseInt(args[2], 10) - 1;
  const playingTeams = GlobalState.getPlayingTeams();

  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const team =
    teamIndex === playingTeams.teamIndex1
      ? playingTeams.team1
      : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

  if (!team || !team[playerIndex]) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Игрок не найден!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  team[playerIndex].saves = (team[playerIndex].saves || 0) + 1;
  GlobalState.setPlayingTeams(playingTeams);

  await updatePlayingTeamsMessage(ctx);
  const message = await safeTelegramCall(ctx, 'sendMessage', [
    ctx.chat.id,
    `🧤 Сэйв у ${team[playerIndex].username || team[playerIndex].name}!`,
  ]);
  return deleteMessageAfterDelay(ctx, message.message_id, 6000);
};

// Обработчик команды "usv <team> <player>" для удаления сейва
const handleUndoSaveCommand = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в команде usv');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в команде usv');
    return;
  }

  const args = ctx.message?.text?.match(/^usv(\d+)(\d+)$/i);
  if (!args || args.length < 3) {
    console.error('Ошибка: некорректный формат команды usv');
    return;
  }

  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();

  // Проверка на валидность ADMIN_ID
  if (!Array.isArray(ADMIN_ID)) {
    console.error('Ошибка: ADMIN_ID не является массивом');
    return;
  }

  await ctx.deleteMessage().catch(() => {});

  if (!ADMIN_ID.includes(ctx.from.id)) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ У вас нет прав для этой команды.',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!isMatchStarted) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const teamIndex = parseInt(args[1], 10) - 1;
  const playerIndex = parseInt(args[2], 10) - 1;
  const playingTeams = GlobalState.getPlayingTeams();

  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const team =
    teamIndex === playingTeams.teamIndex1
      ? playingTeams.team1
      : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

  if (!team || !team[playerIndex]) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Игрок не найден!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!(team[playerIndex].saves > 0)) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ У игрока нет сейвов для удаления.',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 4000);
  }

  team[playerIndex].saves -= 1;
  GlobalState.setPlayingTeams(playingTeams);

  await updatePlayingTeamsMessage(ctx);
};

// Показать меню отмены сейва
const handleShowSavesMenu = async (ctx, GlobalState, { skipAnswerCallback = false } = {}) => {
  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    if (message) deleteMessageAfterDelay(ctx, message.message_id, 6000);
    return;
  }
  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    if (message) deleteMessageAfterDelay(ctx, message.message_id, 6000);
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const team1Buttons = createSaveButtons(team1, teamIndex1);
  const team2Buttons = createSaveButtons(team2, teamIndex2);
  const allButtons = [
    ...team1Buttons,
    [Markup.button.callback('—', 'noop')],
    ...team2Buttons,
    [],
    [Markup.button.callback('❌ Отменить сейв', 'cancel_save_menu')],
    [Markup.button.callback('⬅️ Назад', 'saves_menu_back')],
  ];

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;
  const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
  const matchNumber = matchHistoryLength + 1;
  const savesMenuMessage = buildPlayingTeamsMessage(
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
        savesMenuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    if (!skipAnswerCallback) {
      await safeAnswerCallback(ctx, '🧤 Выберите игрока');
    }
  } catch (error) {
    if (chatId) {
      await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        savesMenuMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    if (!skipAnswerCallback) {
      await safeAnswerCallback(ctx, '🧤 Выберите игрока');
    }
  }
};

// Добавление сейва через кнопку
const handleSaveAction = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в save_');
    return;
  }

  // Проверка на валидность ctx.match
  if (!ctx.match || ctx.match.length < 3) {
    console.error('Ошибка: некорректный ctx.match в save_');
    return;
  }

  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const teamIndex = parseInt(ctx.match[1], 10);
  const playerIndex = parseInt(ctx.match[2], 10);
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка на валидность ADMIN_ID
  if (!Array.isArray(ADMIN_ID)) {
    console.error('Ошибка: ADMIN_ID не является массивом');
    return;
  }

  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    return;
  }
  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    return;
  }

  const team =
    teamIndex === playingTeams.teamIndex1
      ? playingTeams.team1
      : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

  if (!team || !team[playerIndex]) {
    await safeAnswerCallback(ctx, '⛔ Игрок не найден!');
    return;
  }

  team[playerIndex].saves = (team[playerIndex].saves || 0) + 1;
  GlobalState.setPlayingTeams(playingTeams);
  await updatePlayingTeamsMessage(ctx);
  await safeAnswerCallback(ctx);
};

// Показать меню отмены сейва
const handleCancelSaveMenu = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в cancel_save_menu');
    return;
  }

  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка на валидность ADMIN_ID
  if (!Array.isArray(ADMIN_ID)) {
    console.error('Ошибка: ADMIN_ID не является массивом');
    return;
  }

  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    return;
  }
  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    return;
  }

  const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
  const color1 = getTeamColor(teamIndex1);
  const color2 = getTeamColor(teamIndex2);
  const team1Buttons = createCancelSaveButtons(team1, teamIndex1, color1);
  const team2Buttons = createCancelSaveButtons(team2, teamIndex2, color2);
  const allButtons = [...team1Buttons, ...team2Buttons];
  if (allButtons.length === 0) {
    allButtons.push([Markup.button.callback('⚠️ Нет игроков с сейвами', 'noop')]);
  }
  allButtons.push([Markup.button.callback('⬅️ Назад к сейвам', 'show_saves_menu')]);

  const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;
  const cancelSaveMessage = '❌ <b>Отменить сейв</b>\n\nВыберите игрока:';

  try {
    if (chatId && messageId) {
      await safeTelegramCall(ctx, 'editMessageText', [
        chatId,
        messageId,
        null,
        cancelSaveMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx);
  } catch (error) {
    if (chatId) {
      await safeTelegramCall(ctx, 'sendMessage', [
        chatId,
        cancelSaveMessage,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
        },
      ]);
    }
    await safeAnswerCallback(ctx);
  }
};

// Отмена сейва
const handleCancelSaveAction = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в cancel_save_');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в cancel_save_');
    return;
  }

  // Проверка на валидность ctx.match
  if (!ctx.match || ctx.match.length < 3) {
    console.error('Ошибка: некорректный ctx.match в cancel_save_');
    return;
  }

  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка на валидность ADMIN_ID
  if (!Array.isArray(ADMIN_ID)) {
    console.error('Ошибка: ADMIN_ID не является массивом');
    return;
  }

  if (!ADMIN_ID.includes(ctx.from.id)) {
    await safeAnswerCallback(ctx, '⛔ У вас нет прав для этой команды.');
    return;
  }
  if (!isMatchStarted) {
    await safeAnswerCallback(ctx, '⚠️ Матч не начат!');
    return;
  }
  if (!playingTeams) {
    await safeAnswerCallback(ctx, '⛔ Нет активного матча!');
    return;
  }

  const teamIndex = parseInt(ctx.match[1], 10);
  const playerIndex = parseInt(ctx.match[2], 10);
  const team =
    teamIndex === playingTeams.teamIndex1
      ? playingTeams.team1
      : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

  if (!team || !team[playerIndex] || !(team[playerIndex].saves > 0)) {
    await safeAnswerCallback(ctx, '⛔ Нет сейвов для отмены');
    return;
  }

  team[playerIndex].saves -= 1;
  GlobalState.setPlayingTeams(playingTeams);
  await updatePlayingTeamsMessage(ctx);
  await safeAnswerCallback(ctx);
};

// Кнопка "Назад" из меню сейвов - возвращает к основному виду
const handleSavesMenuBack = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в saves_menu_back');
    return;
  }

  const ADMIN_ID = GlobalState.getAdminId();
  const playingTeams = GlobalState.getPlayingTeams();

  // Проверка на валидность ADMIN_ID
  if (!Array.isArray(ADMIN_ID)) {
    console.error('Ошибка: ADMIN_ID не является массивом');
    return;
  }

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

module.exports = {
  handleSaveCommand,
  handleUndoSaveCommand,
  handleShowSavesMenu,
  handleSaveAction,
  handleCancelSaveMenu,
  handleCancelSaveAction,
  handleSavesMenuBack,
};
