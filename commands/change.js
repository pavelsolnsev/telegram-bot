const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { safeTelegramCall } = require("../utils/telegramUtils");

module.exports = (bot, GlobalState) => {
  bot.hears(/^c\d\d\d\d$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams(); // Проверяем, начат ли матч
    
    await ctx.deleteMessage().catch(() => {});
    
    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (playingTeams) {
      const message = await ctx.reply("⛔ Нельзя менять игроков во время матча!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teams = GlobalState.getTeams();
    if (!teams || teams.length === 0) {
      const message = await ctx.reply("⚠️ Команды еще не сформированы!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const userInput = ctx.message.text.trim().slice(1); // Убираем "c"
    const team1 = parseInt(userInput[0]) - 1;    // Номер первой команды (0-based)
    const player1 = parseInt(userInput[1]) - 1;  // Позиция игрока в первой команде (0-based)
    const team2 = parseInt(userInput[2]) - 1;    // Номер второй команды (0-based)
    const player2 = parseInt(userInput[3]) - 1;  // Позиция игрока во второй команде (0-based)

    // Проверка валидности введенных данных
    if (team1 < 0 || team1 >= teams.length || 
        team2 < 0 || team2 >= teams.length) {
      const message = await ctx.reply(
        `⚠️ Неверный номер команды! Доступно команд: ${teams.length}`
      );
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (player1 < 0 || player1 >= teams[team1].length ||
        player2 < 0 || player2 >= teams[team2].length) {
      const message = await ctx.reply(
        `⚠️ Неверная позиция игрока! В команде ${team1 + 1}: ${teams[team1].length} игроков, в команде ${team2 + 1}: ${teams[team2].length} игроков`
      );
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Создаем копию текущих команд для изменений
    const updatedTeams = teams.map(team => [...team]);

    // Меняем игроков местами
    const temp = updatedTeams[team1][player1];
    updatedTeams[team1][player1] = updatedTeams[team2][player2];
    updatedTeams[team2][player2] = temp;

    // Обновляем текущие команды в глобальном состоянии
    GlobalState.setTeams(updatedTeams);

    // Получаем базовые команды и статистику
    let teamsBase = GlobalState.getTeamsBase();
    let teamStats = GlobalState.getTeamStats();

    // Если teamsBase пустой, используем текущие команды как базовые
    if (!teamsBase || teamsBase.length === 0) {
      teamsBase = updatedTeams.map(team => [...team]);
      GlobalState.setTeamsBase(teamsBase);
    }

    // Если teamStats пустой, инициализируем его с нулями
    if (!teamStats || Object.keys(teamStats).length === 0) {
      teamStats = {};
      teamsBase.forEach((_, index) => {
        const teamKey = `team${index + 1}`;
        teamStats[teamKey] = { 
          wins: 0, 
          losses: 0, 
          draws: 0, 
          games: 0, 
          consecutiveWins: 0, 
          goalsScored: 0, 
          goalsConceded: 0,
          opponentsInCurrentStreak: []
        };
      });
    }

    // Сбрасываем серию побед и список оппонентов для затронутых команд
    const team1Key = `team${team1 + 1}`;
    const team2Key = `team${team2 + 1}`;
    if (teamStats[team1Key]) {
      teamStats[team1Key].consecutiveWins = 0;
      teamStats[team1Key].opponentsInCurrentStreak = [];
    }
    if (teamStats[team2Key]) {
      teamStats[team2Key].consecutiveWins = 0;
      teamStats[team2Key].opponentsInCurrentStreak = [];
    }

    // Сохраняем обновленную статистику
    GlobalState.setTeamStats(teamStats);

    // Формируем сообщение с обновленными составами
    const teamsMessage = buildTeamsMessage(
      teamsBase,
      "Составы команд (после замены)",
      teamStats,
      updatedTeams
    );

    // Получаем ID последнего сообщения о командах
    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();

    try {
      if (lastTeamsMessage && lastTeamsMessage.chatId && lastTeamsMessage.messageId) {
        // Редактируем существующее сообщение
        await safeTelegramCall(ctx, "editMessageText", [
          lastTeamsMessage.chatId,
          lastTeamsMessage.messageId,
          null,
          teamsMessage,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "Перемешать состав", callback_data: "reshuffle_callback" }]
              ]
            }
          }
        ]);
      } else {
        // Если предыдущего сообщения нет, отправляем новое
        const message = await ctx.reply(teamsMessage, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Перемешать состав", callback_data: "reshuffle_callback" }]
            ]
          }
        });
        GlobalState.setLastTeamsMessageId(ctx.chat.id, message.message_id);
      }

      // Уведомляем об успешной замене
      const successMessage = await ctx.reply(
        `✅ Игроки заменены: ${updatedTeams[team1][player1].name} (Команда ${team1 + 1}) ↔ ${updatedTeams[team2][player2].name} (Команда ${team2 + 1})`
      );
      deleteMessageAfterDelay(ctx, successMessage.message_id, 3000);

    } catch (error) {
      console.error("Ошибка при редактировании сообщения:", error);
      const errorMessage = await ctx.reply("⚠️ Ошибка при обновлении составов!");
      deleteMessageAfterDelay(ctx, errorMessage.message_id, 3000);
    }
  });
};