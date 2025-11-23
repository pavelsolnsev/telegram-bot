const { Markup } = require("telegraf");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");
const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");

module.exports = (bot, GlobalState) => {
  // Обработчик кнопки "🎯 Выбрать команды для игры"
  bot.action("select_teams_callback", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const playingTeams = GlobalState.getPlayingTeams();
    const teams = GlobalState.getTeams();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ Нет прав!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Если активный матч существует - показываем предупреждение
    if (playingTeams) {
      await safeAnswerCallback(ctx, "⛔ Идёт активный матч!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Идёт активный матч! Завершите текущий матч перед выбором новых команд.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Проверяем, что команды сформированы
    if (!teams || teams.length < 2) {
      await safeAnswerCallback(ctx, "⚠️ Команды не сформированы!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Команды ещё не сформированы! Используйте команду tm для создания команд.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Создаём меню со всеми возможными комбинациями команд
    const teamColors = ["🔴", "🔵", "🟢", "🟡"];
    const buttons = [];

    // Генерируем все возможные пары команд
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const team1Color = teamColors[i] || "⚽";
        const team2Color = teamColors[j] || "⚽";
        buttons.push([
          Markup.button.callback(
            `${team1Color} vs ${team2Color}`,
            `play_teams_${i + 1}${j + 1}`
          ),
        ]);
      }
    }

    if (buttons.length === 0) {
      await safeAnswerCallback(ctx, "⚠️ Нет доступных команд!");
      return;
    }

    await safeAnswerCallback(ctx, "Выберите команды для матча");

    const menuMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "🎯 <b>Выберите команды для матча:</b>",
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      },
    ]);

    // Удаляем сообщение меню через 30 секунд
    deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
  });

  // Обработчик выбора комбинации команд (play_teams_XX, например play_teams_12)
  bot.action(/^play_teams_(\d+)(\d+)$/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const isStatsInitialized = GlobalState.getIsStatsInitialized();
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const playingTeams = GlobalState.getPlayingTeams();
    const teamIndex1 = parseInt(ctx.match[1], 10) - 1;
    const teamIndex2 = parseInt(ctx.match[2], 10) - 1;
    const teams = GlobalState.getTeams();
    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();

    // Удаляем сообщение меню выбора команд
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ Нет прав!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, "⚠️ Матч не начат!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      await safeAnswerCallback(ctx, "⛔ Команды не найдены!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команды не найдены!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (teamIndex1 === teamIndex2) {
      await safeAnswerCallback(ctx, "⛔ Команда не может играть сама с собой!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команда не может играть сама с собой!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (ctx.chat.id < 0) {
      await safeAnswerCallback(ctx, "Напишите мне в ЛС.");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "Напиши мне в ЛС.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (playingTeams && !isMatchFinished) {
      await safeAnswerCallback(ctx, "⛔ Уже идет матч!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Уже идет матч! Завершите текущий матч (fn) перед началом нового.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const resetGoals = (team) => team.map(player => ({
      ...player,
      goals: 0,
    }));

    let team1 = resetGoals(teams[teamIndex1]);
    let team2 = resetGoals(teams[teamIndex2]);

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
        "Таблица",
        teamStats,
        updatedTeams,
        null,
        false
      );

      try {
        await safeTelegramCall(ctx, "editMessageText", [
          lastTeamsMessage.chatId,
          lastTeamsMessage.messageId,
          null,
          teamsMessageWithButtons,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([
              Markup.button.callback("🎯 Выбрать команды для игры", "select_teams_callback"),
            ]).reply_markup,
          }
        ]);
      } catch (error) {
        const description = error?.response?.description || "";
        if (description.includes("message is not modified")) {
          // ничего не делаем
        } else {
          console.error("Ошибка при редактировании сообщения:", error);
        }
      }
    }

    // Вычисляем номер матча
    const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
    const matchNumber = matchHistoryLength + 1;

    // Send the playing teams message
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, 'playing', updatedTeams, matchNumber);
    const team1Buttons = createTeamButtons(team1, teamIndex1);
    const team2Buttons = createTeamButtons(team2, teamIndex2);

    await safeAnswerCallback(ctx, "Матч начат!");

    const sentMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      teamsMessage,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          ...team1Buttons,
          [Markup.button.callback("—", "noop")],
          ...team2Buttons,
          [], // Пустая строка для разделения
          [Markup.button.callback("⏭️ Следующий матч", "ksk_confirm")],
          [Markup.button.callback("⚙️ Управление", "management_menu")],
        ]).reply_markup,
      },
    ]);

    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
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

