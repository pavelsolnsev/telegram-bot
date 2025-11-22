const { Markup } = require("telegraf");
const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage");
const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");
const { createTeamButtons } = require("../buttons/createTeamButtons");

module.exports = (bot, GlobalState) => {
  // Обработчик команды "g <team> <player>" для добавления гола
  bot.hears(/^g(\d+)(\d+)$/i, async (ctx) => {
    const args = ctx.message.text.match(/^g(\d+)(\d+)$/i);
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команда не найдена!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!team[playerIndex]) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Игрок не найден!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол забил ${team[playerIndex].username} ${team[playerIndex].name}!`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик команды "ug <team> <player>" для удаления гола
  bot.hears(/^ug(\d+)(\d+)$/i, async (ctx) => {
    const args = ctx.message.text.match(/^ug(\d+)(\d+)$/i);
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команда не найдена!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!team[playerIndex]) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Игрок не найден!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (team[playerIndex].goals && team[playerIndex].goals > 0) {
      team[playerIndex].goals -= 1;
    } else {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        `⚠️ У ${team[playerIndex].name} уже 0 голов.`,
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    GlobalState.setPlayingTeams(playingTeams);
    await updatePlayingTeamsMessage(ctx);

    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол удалён у ${team[playerIndex].name}. Теперь у него ${team[playerIndex].goals} гол(ов).`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик отмены гола у конкретного игрока (должен быть ПЕРЕД обработчиком goal_)
  bot.action(/^cancel_goal_(\d+)_(\d+)$/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    
    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команда не найдена!",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!team[playerIndex]) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Игрок не найден!",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (team[playerIndex].goals && team[playerIndex].goals > 0) {
      team[playerIndex].goals -= 1;
    } else {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        `⚠️ У ${team[playerIndex].name || team[playerIndex].username} уже 0 голов.`,
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    GlobalState.setPlayingTeams(playingTeams);
    await updatePlayingTeamsMessage(ctx);

    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол удалён у ${team[playerIndex].name || team[playerIndex].username}. Теперь у него ${team[playerIndex].goals} гол(ов).`,
    ]);
    await safeAnswerCallback(ctx, `✅ Гол отменен у ${team[playerIndex].name || team[playerIndex].username}`);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик нажатия кнопки "goal_<team>_<player>" для добавления гола
  bot.action(/^goal_(\d+)_(\d+)$/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команда не найдена!",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!team[playerIndex]) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Игрок не найден!",
      ]);
      await safeAnswerCallback(ctx);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await safeTelegramCall(ctx, "sendMessage", [
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
            `cancel_goal_${teamIndex}_${index}`
          )
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

  // Обработчик кнопки "Управление"
  bot.action("management_menu", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();

    // Проверка прав админа
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    // Проверка условий
    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, "⚠️ Матч не начат!");
      return;
    }

    if (!playingTeams) {
      await safeAnswerCallback(ctx, "⛔ Нет активного матча!");
      return;
    }

    // Показываем меню управления
    const menuMessage = "⚙️ <b>Меню управления</b>\n\nВыберите действие:";
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;
    
    // Определяем текст кнопки в зависимости от состояния
    const isMatchFinished = GlobalState.getIsMatchFinished();
    let endButtonText = "";
    
    if (isMatchFinished) {
      endButtonText = "⏪ Вернуться в прошлый матч";
    } else if (playingTeams) {
      endButtonText = "🚫 Отменить текущий матч";
    } else {
      endButtonText = "⏪ Управление матчами";
    }
    
    try {
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "editMessageText", [
          chatId,
          messageId,
          null,
          menuMessage,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback("❌ Отменить гол", "cancel_goal_menu")],
              [Markup.button.callback(endButtonText, "end_match")],
              [Markup.button.callback("⬅️ Назад", "management_back")],
            ]).reply_markup,
          },
        ]);
      }
      await safeAnswerCallback(ctx, "⚙️ Меню управления");
    } catch (error) {
      // Если не удалось отредактировать сообщение, отправляем новое
      if (chatId) {
        await safeTelegramCall(ctx, "sendMessage", [
          chatId,
          menuMessage,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback("❌ Отменить гол", "cancel_goal_menu")],
              [Markup.button.callback(endButtonText, "end_match")],
              [Markup.button.callback("⬅️ Назад", "management_back")],
            ]).reply_markup,
          },
        ]);
      }
      await safeAnswerCallback(ctx, "⚙️ Меню управления");
    }
  });

  // Обработчик кнопки "Отменить гол" - показывает список игроков
  bot.action("cancel_goal_menu", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();

    // Проверка прав админа
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    // Проверка условий
    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, "⚠️ Матч не начат!");
      return;
    }

    if (!playingTeams) {
      await safeAnswerCallback(ctx, "⛔ Нет активного матча!");
      return;
    }

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    const teamColors = ["🔴", "🔵", "🟢", "🟡"];
    const color1 = teamColors[teamIndex1] || "⚽";
    const color2 = teamColors[teamIndex2] || "⚽";

    // Создаем кнопки для игроков с голами
    const team1Buttons = createCancelGoalButtons(team1, teamIndex1, color1);
    const team2Buttons = createCancelGoalButtons(team2, teamIndex2, color2);

    // Объединяем кнопки
    const allButtons = [...team1Buttons, ...team2Buttons];
    
    // Добавляем кнопку "Назад"
    if (allButtons.length === 0) {
      allButtons.push([Markup.button.callback("⚠️ Нет игроков с голами", "noop")]);
    }
    allButtons.push([Markup.button.callback("⬅️ Назад к управлению", "management_menu")]);

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;
    const cancelGoalMessage = "❌ <b>Отменить гол</b>\n\nВыберите игрока:";

    try {
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "editMessageText", [
          chatId,
          messageId,
          null,
          cancelGoalMessage,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
          },
        ]);
      }
      await safeAnswerCallback(ctx, "❌ Выберите игрока для отмены гола");
    } catch (error) {
      // Если не удалось отредактировать сообщение, отправляем новое
      if (chatId) {
        await safeTelegramCall(ctx, "sendMessage", [
          chatId,
          cancelGoalMessage,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard(allButtons).reply_markup,
          },
        ]);
      }
      await safeAnswerCallback(ctx, "❌ Выберите игрока для отмены гола");
    }
  });


  // Обработчик кнопки "Назад" - возвращает к основному меню
  bot.action("management_back", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const playingTeams = GlobalState.getPlayingTeams();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    if (!playingTeams) {
      await safeAnswerCallback(ctx, "⛔ Нет активного матча!");
      return;
    }

    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    const team1Buttons = createTeamButtons(team1, teamIndex1);
    const team2Buttons = createTeamButtons(team2, teamIndex2);
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
      "playing"
    );

    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "editMessageText", [
          chatId,
          messageId,
          null,
          teamsMessage,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([
              ...team1Buttons,
              [Markup.button.callback("—", "noop")],
              ...team2Buttons,
              [], // Пустая строка для разделения
              [Markup.button.callback("⏭️ Следующий матч", "ksk_confirm")],
              [Markup.button.callback("🏁 Закончить матч", "finish_match")],
              [Markup.button.callback("⚙️ Управление", "management_menu")],
            ]).reply_markup,
          },
        ]);
      }
      await safeAnswerCallback(ctx, "⬅️ Возврат к основному меню");
    } catch (error) {
      await safeAnswerCallback(ctx, "⬅️ Возврат к основному меню");
    }
  });
};