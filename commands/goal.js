const { Markup } = require('telegraf');
const { updatePlayingTeamsMessage } = require('../message/updatePlayingTeamsMessage');
const { buildPlayingTeamsMessage } = require('../message/buildPlayingTeamsMessage');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const { safeTelegramCall } = require('../utils/telegramUtils');
const { safeAnswerCallback } = require('../utils/safeAnswerCallback');
const { createTeamButtons, createAssistButtons, createSaveButtons } = require('../buttons/createTeamButtons');

module.exports = (bot, GlobalState) => {
  // Обработчик команды "g <team> <player>" для добавления гола
  bot.hears(/^g(\d+)(\d+)$/i, async (ctx) => {
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
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `⚽ Гол забил ${team[playerIndex].username} ${team[playerIndex].name}!`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  const handleShowSavesMenu = async (ctx, { skipAnswerCallback = false } = {}) => {
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

  // Обработчик кнопки "Отметить сейв" - показывает список игроков для добавления сейвов
  bot.action('show_saves_menu', handleShowSavesMenu);

  // Добавление сейва через кнопку
  bot.action(/^save_(\d+)_(\d+)$/, async (ctx) => {
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
    await safeAnswerCallback(ctx, `🧤 Сэйв добавлен у ${team[playerIndex].username || team[playerIndex].name}`);
  });

  // Показать меню отмены сейва
  bot.action('cancel_save_menu', async (ctx) => {
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
    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const color1 = teamColors[teamIndex1] || '⚽';
    const color2 = teamColors[teamIndex2] || '⚽';
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
  });

  // Отмена сейва
  bot.action(/^cancel_save_(\d+)_(\d+)$/, async (ctx) => {
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

    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `🧤 Сэйв удалён у ${team[playerIndex].name || team[playerIndex].username}. Теперь у него ${team[playerIndex].saves} сейв(ов).`,
    ]);
    await safeAnswerCallback(ctx, `✅ Сэйв отменен у ${team[playerIndex].name || team[playerIndex].username}`);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Кнопка "Назад" из меню сейвов - возвращает к основному виду
  bot.action('saves_menu_back', async (ctx) => {
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
              [Markup.button.callback('⚽ Отметить голы', 'show_goals_menu')],
              [Markup.button.callback('🎯 Отметить ассист', 'show_assists_menu')],
              [Markup.button.callback('🧤 Отметить сейв', 'show_saves_menu')],
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
  });

  // Обработчик команды "sv <team> <player>" для добавления сейва
  bot.hears(/^sv(\d+)(\d+)$/i, async (ctx) => {
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
  });

  // Обработчик команды "usv <team> <player>" для удаления сейва
  bot.hears(/^usv(\d+)(\d+)$/i, async (ctx) => {
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
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `🧤 Сэйв удалён у ${team[playerIndex].username || team[playerIndex].name}. Теперь у него ${team[playerIndex].saves} сейв(ов).`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик команды "ug <team> <player>" для удаления гола
  bot.hears(/^ug(\d+)(\d+)$/i, async (ctx) => {
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

    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `⚽ Гол удалён у ${team[playerIndex].name}. Теперь у него ${team[playerIndex].goals} гол(ов).`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик команды "a <team> <player>" для добавления ассиста
  bot.hears(/^a(\d+)(\d+)$/i, async (ctx) => {
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
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `🎯 Ассист у ${team[playerIndex].username || team[playerIndex].name}!`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик команды "ua <team> <player>" для удаления ассиста
  bot.hears(/^ua(\d+)(\d+)$/i, async (ctx) => {
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
    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `🎯 Ассист удалён у ${team[playerIndex].username || team[playerIndex].name}. Теперь у него ${team[playerIndex].assists} ассист(ов).`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });
  // Обработчик отмены гола у конкретного игрока (должен быть ПЕРЕД обработчиком goal_)
  bot.action(/^cancel_goal_(\d+)_(\d+)$/, async (ctx) => {
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

    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `⚽ Гол удалён у ${team[playerIndex].name || team[playerIndex].username}. Теперь у него ${team[playerIndex].goals} гол(ов).`,
    ]);
    await safeAnswerCallback(ctx, `✅ Гол отменен у ${team[playerIndex].name || team[playerIndex].username}`);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик нажатия кнопки "goal_<team>_<player>" для добавления гола
  bot.action(/^goal_(\d+)_(\d+)$/, async (ctx) => {
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

    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `⚽ Гол забил ${team[playerIndex].username} ${team[playerIndex].name}!`,
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Функция для создания кнопок игроков с голами для отмены
  const createCancelGoalButtons = (team, teamIndex, teamColor) => {
    const buttons = [];
    team.forEach((player, index) => {
      if (player.goals && player.goals > 0) {
        const displayName = player.username || player.name;
        buttons.push(
          Markup.button.callback(
            `${teamColor} ${index + 1}. ${displayName} ⚽${player.goals}`,
            `cancel_goal_${teamIndex}_${index}`,
          ),
        );
      }
    });
    // Группируем кнопки по 2 в ряд
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    return rows;
  };

  // Функция для создания кнопок игроков с ассистами для отмены
  const createCancelAssistButtons = (team, teamIndex, teamColor) => {
    const buttons = [];
    team.forEach((player, index) => {
      if (player.assists && player.assists > 0) {
        const displayName = player.username || player.name;
        buttons.push(
          Markup.button.callback(
            `${teamColor} ${index + 1}. ${displayName} 🎯${player.assists}`,
            `cancel_assist_${teamIndex}_${index}`,
          ),
        );
      }
    });
    // Группируем кнопки по 2 в ряд
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    return rows;
  };

  // Функция для создания кнопок игроков с сейвами для отмены
  const createCancelSaveButtons = (team, teamIndex, teamColor) => {
    const buttons = [];
    team.forEach((player, index) => {
      if (player.saves && player.saves > 0) {
        const displayName = player.username || player.name;
        buttons.push(
          Markup.button.callback(
            `${teamColor} ${index + 1}. ${displayName} 🧤${player.saves}`,
            `cancel_save_${teamIndex}_${index}`,
          ),
        );
      }
    });
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    return rows;
  };

  // Обработчик отмены ассиста у конкретного игрока
  bot.action(/^cancel_assist_(\d+)_(\d+)$/, async (ctx) => {
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

    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `🎯 Ассист удалён у ${team[playerIndex].name || team[playerIndex].username}. Теперь у него ${team[playerIndex].assists} ассист(ов).`,
    ]);
    await safeAnswerCallback(ctx, `✅ Ассист отменен у ${team[playerIndex].name || team[playerIndex].username}`);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик нажатия кнопки "assist_<team>_<player>" для добавления ассиста
  bot.action(/^assist_(\d+)_(\d+)$/, async (ctx) => {
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

    const message = await safeTelegramCall(ctx, 'sendMessage', [
      ctx.chat.id,
      `🎯 Ассист у ${team[playerIndex].username || team[playerIndex].name}!`,
    ]);
    await safeAnswerCallback(ctx);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик кнопки "Управление"
  bot.action('management_menu', async (ctx) => {
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
  });

  // Обработчик кнопки "Отменить гол" - показывает список игроков
  bot.action('cancel_goal_menu', async (ctx) => {
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
    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const color1 = teamColors[teamIndex1] || '⚽';
    const color2 = teamColors[teamIndex2] || '⚽';

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
  });


  // Обработчик кнопки "Отметить голы" - показывает список игроков для добавления голов
  bot.action('show_goals_menu', async (ctx) => {
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
  });

  // Обработчик кнопки "Отметить ассист" - показывает список игроков для добавления ассистов
  bot.action('show_assists_menu', async (ctx) => {
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
  });

  // Обработчик кнопки "Отменить ассист" - показывает список игроков с ассистами
  bot.action('cancel_assist_menu', async (ctx) => {
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
    const teamColors = ['🔴', '🔵', '🟢', '🟡'];
    const color1 = teamColors[teamIndex1] || '⚽';
    const color2 = teamColors[teamIndex2] || '⚽';

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
  });

  // Обработчик кнопки "Назад" из меню ассистов - возвращает к основному виду
  bot.action('assists_menu_back', async (ctx) => {
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
              [Markup.button.callback('⚽ Отметить голы', 'show_goals_menu')],
              [Markup.button.callback('🎯 Отметить ассист', 'show_assists_menu')],
              [Markup.button.callback('🧤 Отметить сейв', 'show_saves_menu')],
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
  });

  // Обработчик кнопки "Назад" из меню голов - возвращает к основному виду
  bot.action('goals_menu_back', async (ctx) => {
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
              [Markup.button.callback('⚽ Отметить голы', 'show_goals_menu')],
              [Markup.button.callback('🎯 Отметить ассист', 'show_assists_menu')],
              [Markup.button.callback('🧤 Отметить сейв', 'show_saves_menu')],
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
  });

  // Обработчик кнопки "Назад" - возвращает к основному меню
  bot.action('management_back', async (ctx) => {
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
              [Markup.button.callback('⚽ Отметить голы', 'show_goals_menu')],
              [Markup.button.callback('🎯 Отметить ассист', 'show_assists_menu')],
              [Markup.button.callback('🧤 Отметить сейв', 'show_saves_menu')],
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
  });
};
