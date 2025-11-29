const { Markup } = require("telegraf");
const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { safeTelegramCall } = require("../utils/telegramUtils");

module.exports = (bot, GlobalState) => {
  bot.hears(/^pl(\d+)(\d+)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const isStatsInitialized = GlobalState.getIsStatsInitialized();
    const isMatchFinished = GlobalState.getIsMatchFinished();
    const playingTeams = GlobalState.getPlayingTeams();
    const teamIndex1 = parseInt(ctx.match[1], 10) - 1;
    const teamIndex2 = parseInt(ctx.match[2], 10) - 1;
    const teams = GlobalState.getTeams();
    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();

    await ctx.deleteMessage().catch(() => {});

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      const message = await ctx.reply("⛔ Команды не найдены!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (teamIndex1 === teamIndex2) {
      const message = await ctx.reply("⛔ Команда не может играть сама с собой!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (ctx.chat.id < 0) {
      const message = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (playingTeams && !isMatchFinished) {
      const message = await ctx.reply("⛔ Уже идет матч! Завершите текущий матч (fn) перед началом нового.");
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

    // Define updatedTeams for buildPlayingTeamsMessage
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
            reply_markup: (() => {
              const isTableAllowed = GlobalState.getIsTableAllowed();
              const buttons = [];
              if (isTableAllowed) {
                buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_callback")]);
              } else {
                buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_blocked")]);
                buttons.push([Markup.button.callback("📢 Объявить составы", "announce_teams")]);
              }
              return Markup.inlineKeyboard(buttons).reply_markup;
            })(),
          }
        ]);
      } catch (error) {
        // Если контент не изменился — просто игнорируем эту ошибку
        const description = error?.response?.description || "";
        if (description.includes("message is not modified")) {
          // ничего не делаем
        } else {
          console.error("Ошибка при редактировании сообщения:", error);
          const message = await ctx.reply("⛔ Ошибка при обновлении состава команд!");
          return deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }
    } else {
      const message = await ctx.reply("⛔ Сообщение с составами команд не найдено!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Вычисляем номер матча
    const matchHistoryLength = GlobalState.getMatchHistoryStackLength();
    const matchNumber = matchHistoryLength + 1;

    // Send the playing teams message
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2, 'playing', updatedTeams, matchNumber);
    const team1Buttons = createTeamButtons(team1, teamIndex1);
    const team2Buttons = createTeamButtons(team2, teamIndex2);

    const sentMessage = await ctx.reply(teamsMessage, {
      parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          ...team1Buttons,
          [Markup.button.callback("—", "noop")],
          ...team2Buttons,
          [], // Пустая строка для разделения
          [Markup.button.callback("⏭️ Следующий матч", "ksk_confirm")],
          [Markup.button.callback("⚙️ Управление", "management_menu")],
        ]).reply_markup,
    });

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