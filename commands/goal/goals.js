const { deleteMessageAfterDelay } = require('../../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../../utils/telegramUtils');
const { safeAnswerCallback } = require('../../utils/safeAnswerCallback');
const { updatePlayingTeamsMessage } = require('../../message/updatePlayingTeamsMessage');

// Обработчик команды "g <team> <player>" для добавления гола
const handleGoalCommand = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в команде g');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в команде g');
    return;
  }

  const args = ctx.message?.text?.match(/^g(\d+)(\d+)$/i);
  if (!args || args.length < 3) {
    console.error('Ошибка: некорректный формат команды g');
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
    if (message && message.message_id) {
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
    return;
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

  if (!team) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Команда не найдена!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!team[playerIndex]) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Игрок не найден!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
  GlobalState.setPlayingTeams(playingTeams);

  await updatePlayingTeamsMessage(ctx);
};

// Обработчик команды "ug <team> <player>" для удаления гола
const handleUndoGoalCommand = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в команде ug');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в команде ug');
    return;
  }

  const args = ctx.message?.text?.match(/^ug(\d+)(\d+)$/i);
  if (!args || args.length < 3) {
    console.error('Ошибка: некорректный формат команды ug');
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

  if (!team) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Команда не найдена!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (!team[playerIndex]) {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      '⛔ Игрок не найден!',
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  if (team[playerIndex].goals && team[playerIndex].goals > 0) {
    team[playerIndex].goals -= 1;
  } else {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `⚠️ У ${team[playerIndex].name} уже 0 голов.`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  GlobalState.setPlayingTeams(playingTeams);
  await updatePlayingTeamsMessage(ctx);
};

// Обработчик отмены гола у конкретного игрока (должен быть ПЕРЕД обработчиком goal_)
const handleCancelGoalAction = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в cancel_goal');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в cancel_goal');
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

  if (team[playerIndex].goals && team[playerIndex].goals > 0) {
    team[playerIndex].goals -= 1;
  } else {
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `⚠️ У ${team[playerIndex].name || team[playerIndex].username} уже 0 голов.`,
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  }

  GlobalState.setPlayingTeams(playingTeams);
  await updatePlayingTeamsMessage(ctx);
  await safeAnswerCallback(ctx);
};

// Обработчик нажатия кнопки "goal_<team>_<player>" для добавления гола
const handleGoalAction = async (ctx, GlobalState) => {
  // Проверка на валидность ctx.from и ctx.chat
  if (!ctx.from || typeof ctx.from.id !== 'number') {
    console.error('Ошибка: некорректный ctx.from в goal_');
    return;
  }
  if (!ctx.chat || typeof ctx.chat.id !== 'number') {
    console.error('Ошибка: некорректный ctx.chat в goal_');
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

  team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
  GlobalState.setPlayingTeams(playingTeams);

  await updatePlayingTeamsMessage(ctx);
  await safeAnswerCallback(ctx);
};

module.exports = {
  handleGoalCommand,
  handleUndoGoalCommand,
  handleCancelGoalAction,
  handleGoalAction,
};
