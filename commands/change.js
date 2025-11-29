const { Markup } = require("telegraf");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { safeTelegramCall } = require("../utils/telegramUtils");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");

module.exports = (bot, GlobalState) => {
  // Функция для выполнения замены игроков (общая логика для команды и кнопки)
  const swapPlayers = async (ctx, team1, player1, team2, player2) => {
    const teams = GlobalState.getTeams();
    
    if (!teams || teams.length === 0) {
      const message = await ctx.reply("⚠️ Команды еще не сформированы!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

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
    // Флаг isTableAllowed не сбрасываем - после объявления составов они остаются объявленными даже при замене игроков

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
            reply_markup: (() => {
              const isTableAllowed = GlobalState.getIsTableAllowed();
              const playingTeams = GlobalState.getPlayingTeams();
              const buttons = [];
              if (isTableAllowed) {
                // Если составы объявлены - показываем кнопку выбора команд
                buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_callback")]);
              } else {
                // Если составы не объявлены - показываем кнопку выбора команд (заблокированную) и кнопку объявления
                buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_blocked")]);
                buttons.push([Markup.button.callback("📢 Объявить составы", "announce_teams")]);
              }
              // Кнопка "Сменить игрока" показывается всегда, когда матч не идет (независимо от isTableAllowed)
              if (!playingTeams) {
                buttons.push([Markup.button.callback("🔄 Сменить игрока", "change_player_callback")]);
              }
              return Markup.inlineKeyboard(buttons).reply_markup;
            })(),
          }
        ]);
      } else {
        // Если предыдущего сообщения нет, отправляем новое
        const isTableAllowed = GlobalState.getIsTableAllowed();
        const playingTeams = GlobalState.getPlayingTeams();
        const buttons = [];
        if (isTableAllowed) {
          // Если составы объявлены - показываем кнопку выбора команд
          buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_callback")]);
        } else {
          // Если составы не объявлены - показываем кнопку выбора команд (заблокированную) и кнопку объявления
          buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_blocked")]);
          buttons.push([Markup.button.callback("📢 Объявить составы", "announce_teams")]);
        }
        // Кнопка "Сменить игрока" показывается всегда, когда матч не идет (независимо от isTableAllowed)
        if (!playingTeams) {
          buttons.push([Markup.button.callback("🔄 Сменить игрока", "change_player_callback")]);
        }
        const message = await ctx.reply(teamsMessage, {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
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
  };
  bot.hears(/^c\d\d\d\d$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    const playingTeams = GlobalState.getPlayingTeams();
    
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
    const team2 = parseInt(userInput[2]) - 1;
    const player2 = parseInt(userInput[3]) - 1;

    await swapPlayers(ctx, team1, player1, team2, player2);
  });

  // Обработчик кнопки "Сменить игрока"
  bot.action("change_player_callback", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
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

    if (!isMatchStarted) {
      await safeAnswerCallback(ctx, "⚠️ Матч не начат!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (playingTeams) {
      await safeAnswerCallback(ctx, "⛔ Нельзя менять игроков во время матча!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нельзя менять игроков во время матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!teams || teams.length === 0) {
      await safeAnswerCallback(ctx, "⚠️ Команды еще не сформированы!");
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Команды еще не сформированы!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    // Показываем список всех команд для выбора первой команды
    const teamColors = ["🔴", "🔵", "🟢", "🟡"];
    const buttons = [];

    for (let i = 0; i < teams.length; i++) {
      const teamColor = teamColors[i] || "⚽";
      buttons.push([
        Markup.button.callback(
          `${teamColor} Команда ${i + 1}`,
          `change_first_team_${i}`
        ),
      ]);
    }
    
    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback("❌ Отменить", "cancel_change_player")]);

    await safeAnswerCallback(ctx, "Выберите первую команду");
    const menuMessage = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      "🔄 <b>Выберите первую команду для замены игрока:</b>",
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
      },
    ]);
    deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
  });

  // Обработчик выбора первой команды для замены
  bot.action(/^change_first_team_(\d+)$/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const teams = GlobalState.getTeams();
    const firstTeamIndex = parseInt(ctx.match[1], 10);

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ Нет прав!");
      return;
    }

    if (!teams[firstTeamIndex]) {
      await safeAnswerCallback(ctx, "⛔ Команда не найдена!");
      return;
    }

    const teamColors = ["🔴", "🔵", "🟢", "🟡"];
    const firstTeamColor = teamColors[firstTeamIndex] || "⚽";

    // Показываем список игроков первой команды
    const buttons = [];
    teams[firstTeamIndex].forEach((player, index) => {
      const displayName = player.username ? player.username : player.name;
      buttons.push([
        Markup.button.callback(
          `${index + 1}. ${displayName}`,
          `change_first_player_${firstTeamIndex}_${index}`
        ),
      ]);
    });
    
    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback("❌ Отменить", "cancel_change_player")]);

    await safeAnswerCallback(ctx, `Выбрана команда ${firstTeamIndex + 1}, выберите игрока`);
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, "editMessageText", [
        chatId,
        messageId,
        null,
        `🔄 <b>Выбрана команда:</b> ${firstTeamColor} <b>Команда ${firstTeamIndex + 1}</b>\n\n<b>Выберите игрока из этой команды:</b>`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      const menuMessage = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        `🔄 <b>Выбрана команда:</b> ${firstTeamColor} <b>Команда ${firstTeamIndex + 1}</b>\n\n<b>Выберите игрока из этой команды:</b>`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик выбора первого игрока
  bot.action(/^change_first_player_(\d+)_(\d+)$/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const teams = GlobalState.getTeams();
    const firstTeamIndex = parseInt(ctx.match[1], 10);
    const firstPlayerIndex = parseInt(ctx.match[2], 10);

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ Нет прав!");
      return;
    }

    if (!teams[firstTeamIndex] || !teams[firstTeamIndex][firstPlayerIndex]) {
      await safeAnswerCallback(ctx, "⛔ Игрок не найден!");
      return;
    }

    const teamColors = ["🔴", "🔵", "🟢", "🟡"];
    const firstTeamColor = teamColors[firstTeamIndex] || "⚽";
    const firstPlayer = teams[firstTeamIndex][firstPlayerIndex];
    const firstPlayerName = firstPlayer.username ? firstPlayer.username : firstPlayer.name;

    // Показываем список команд для выбора второй команды (исключая первую)
    const buttons = [];
    for (let i = 0; i < teams.length; i++) {
      if (i !== firstTeamIndex) {
        const teamColor = teamColors[i] || "⚽";
        buttons.push([
          Markup.button.callback(
            `${teamColor} Команда ${i + 1}`,
            `change_second_team_${firstTeamIndex}_${firstPlayerIndex}_${i}`
          ),
        ]);
      }
    }
    
    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback("❌ Отменить", "cancel_change_player")]);

    await safeAnswerCallback(ctx, `Выбран игрок ${firstPlayerName}, выберите вторую команду`);
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, "editMessageText", [
        chatId,
        messageId,
        null,
        `🔄 <b>Выбрана команда:</b> ${firstTeamColor} <b>Команда ${firstTeamIndex + 1}</b>\n<b>Игрок:</b> ${firstPlayerName}\n\n<b>Выберите вторую команду:</b>`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      const menuMessage = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        `🔄 <b>Выбрана команда:</b> ${firstTeamColor} <b>Команда ${firstTeamIndex + 1}</b>\n<b>Игрок:</b> ${firstPlayerName}\n\n<b>Выберите вторую команду:</b>`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик выбора второй команды для замены
  bot.action(/^change_second_team_(\d+)_(\d+)_(\d+)$/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const teams = GlobalState.getTeams();
    const firstTeamIndex = parseInt(ctx.match[1], 10);
    const firstPlayerIndex = parseInt(ctx.match[2], 10);
    const secondTeamIndex = parseInt(ctx.match[3], 10);

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ Нет прав!");
      return;
    }

    if (!teams[secondTeamIndex]) {
      await safeAnswerCallback(ctx, "⛔ Команда не найдена!");
      return;
    }

    const teamColors = ["🔴", "🔵", "🟢", "🟡"];
    const secondTeamColor = teamColors[secondTeamIndex] || "⚽";
    const firstPlayer = teams[firstTeamIndex][firstPlayerIndex];
    const firstPlayerName = firstPlayer.username ? firstPlayer.username : firstPlayer.name;

    // Показываем список игроков второй команды
    const buttons = [];
    teams[secondTeamIndex].forEach((player, index) => {
      const displayName = player.username ? player.username : player.name;
      buttons.push([
        Markup.button.callback(
          `${index + 1}. ${displayName}`,
          `change_second_player_${firstTeamIndex}_${firstPlayerIndex}_${secondTeamIndex}_${index}`
        ),
      ]);
    });
    
    // Добавляем кнопку "Отменить"
    buttons.push([Markup.button.callback("❌ Отменить", "cancel_change_player")]);

    await safeAnswerCallback(ctx, `Выбрана команда ${secondTeamIndex + 1}, выберите игрока`);
    const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    try {
      await safeTelegramCall(ctx, "editMessageText", [
        chatId,
        messageId,
        null,
        `🔄 <b>Выбрана команда:</b> ${secondTeamColor} <b>Команда ${secondTeamIndex + 1}</b>\n<b>Игрок из команды ${firstTeamIndex + 1}:</b> ${firstPlayerName}\n\n<b>Выберите игрока из команды ${secondTeamIndex + 1}:</b>`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
    } catch (error) {
      const menuMessage = await safeTelegramCall(ctx, "sendMessage", [
        chatId,
        `🔄 <b>Выбрана команда:</b> ${secondTeamColor} <b>Команда ${secondTeamIndex + 1}</b>\n<b>Игрок из команды ${firstTeamIndex + 1}:</b> ${firstPlayerName}\n\n<b>Выберите игрока из команды ${secondTeamIndex + 1}:</b>`,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        },
      ]);
      deleteMessageAfterDelay(ctx, menuMessage.message_id, 30000);
    }
  });

  // Обработчик выбора второго игрока и выполнение замены
  bot.action(/^change_second_player_(\d+)_(\d+)_(\d+)_(\d+)$/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const firstTeamIndex = parseInt(ctx.match[1], 10);
    const firstPlayerIndex = parseInt(ctx.match[2], 10);
    const secondTeamIndex = parseInt(ctx.match[3], 10);
    const secondPlayerIndex = parseInt(ctx.match[4], 10);

    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ Нет прав!");
      return;
    }

    // Удаляем сообщение меню
    try {
      await ctx.deleteMessage().catch(() => {});
    } catch (error) {
      // Игнорируем ошибки удаления
    }

    await safeAnswerCallback(ctx, "Выполняю замену...");
    await swapPlayers(ctx, firstTeamIndex, firstPlayerIndex, secondTeamIndex, secondPlayerIndex);
  });

  // Обработчик кнопки "Отменить" при замене игрока
  bot.action("cancel_change_player", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    
    if (!ADMIN_ID.includes(ctx.from.id)) {
      await safeAnswerCallback(ctx, "⛔ У вас нет прав для этой команды.");
      return;
    }

    await safeAnswerCallback(ctx, "❌ Замена игрока отменена");
    
    // Удаляем сообщение выбора
    try {
      const chatId = ctx.callbackQuery?.message?.chat?.id || ctx.chat?.id;
      const messageId = ctx.callbackQuery?.message?.message_id;
      if (chatId && messageId) {
        await safeTelegramCall(ctx, "deleteMessage", [
          chatId,
          messageId,
        ]);
      }
    } catch (error) {
      // Игнорируем ошибки удаления
    }
  });
};