const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const { updatePlayingTeamsMessage } = require('../../message/updatePlayingTeamsMessage');

// Обработчик команды "a <team> <player>" для добавления ассиста
const handleAssistCommand = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в команде a');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в команде a');
    return;
  }

  const args = ctx.message?.text?.match(/^a(\d+)(\d+)$/i);
  if (!args || args.length < 3) {
    console.error('Ошибка: некорректный формат команды a');
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

  team[playerIndex].assists = (team[playerIndex].assists || 0) + 1;
  GlobalState.setPlayingTeams(playingTeams);

  await updatePlayingTeamsMessage(ctx);
};

// Обработчик команды "ua <team> <player>" для удаления ассиста
const handleUndoAssistCommand = async (ctx, GlobalState) => {
  const args = ctx.message.text.match(/^ua(\d+)(\d+)$/i);
  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();
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

  if (!(team[playerIndex].assists > 0)) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ У игрока нет ассистов для удаления.',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 4000);
  }

  team[playerIndex].assists -= 1;
  GlobalState.setPlayingTeams(playingTeams);

  await updatePlayingTeamsMessage(ctx);
};

// Обработчик отмены ассиста у конкретного игрока
const handleCancelAssistAction = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в cancel_assist');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в cancel_assist');
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
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ У вас нет прав для этой команды.',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!isMatchStarted) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const teamIndex = parseInt(ctx.match[1], 10);
  const playerIndex = parseInt(ctx.match[2], 10);

  const team =
    teamIndex === playingTeams.teamIndex1
      ? playingTeams.team1
      : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

  if (!team) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Команда не найдена!',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!team[playerIndex]) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Игрок не найден!',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (team[playerIndex].assists && team[playerIndex].assists > 0) {
    team[playerIndex].assists -= 1;
  } else {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `⚠️ У ${team[playerIndex].name || team[playerIndex].username} уже 0 ассистов.`,
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  GlobalState.setPlayingTeams(playingTeams);
  await updatePlayingTeamsMessage(ctx);
  await safeAnswerCallback(ctx);
};

// Обработчик нажатия кнопки "assist_<team>_<player>" для добавления ассиста
const handleAssistAction = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в assist_');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в assist_');
    return;
  }

  const ADMIN_ID = GlobalState.getAdminId();
  const isMatchStarted = GlobalState.getStart();

  // Проверка на валидность ADMIN_ID
  if (!Array.isArray(ADMIN_ID)) {
    console.error('Ошибка: ADMIN_ID не является массивом');
    return;
  }

  if (!ADMIN_ID.includes(ctx.from.id)) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ У вас нет прав для этой команды.',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!isMatchStarted) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⚠️ Матч не начат!',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const teamIndex = parseInt(ctx.match[1], 10);
  const playerIndex = parseInt(ctx.match[2], 10);
  const playingTeams = GlobalState.getPlayingTeams();

  if (!playingTeams) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Нет активного матча!',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  const team =
    teamIndex === playingTeams.teamIndex1
      ? playingTeams.team1
      : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

  if (!team) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Команда не найдена!',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!team[playerIndex]) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Игрок не найден!',
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  team[playerIndex].assists = (team[playerIndex].assists || 0) + 1;
  GlobalState.setPlayingTeams(playingTeams);

  await updatePlayingTeamsMessage(ctx);
  await safeAnswerCallback(ctx);
};

module.exports = {
  handleAssistCommand,
  handleUndoAssistCommand,
  handleCancelAssistAction,
  handleAssistAction,
};
