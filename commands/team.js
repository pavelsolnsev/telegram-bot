const { Markup } = require("telegraf");

// Вспомогательная функция для перемешивания массива игроков
const reshuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);

// Вспомогательная функция для распределения игроков по командам
const divideIntoTeams = (players, numTeams) => {
  const teams = Array.from({ length: numTeams }, () => []);
  players.forEach((player, index) => teams[index % numTeams].push(player));
  return teams;
};

// Вспомогательная функция для формирования сообщения с составами команд
const buildTeamsMessage = (teams, title = "Составы команд") => {
  let message = `🏆 <b>${title}:</b>\n\n`;
  teams.forEach((team, index) => {
    message += `⚽ <b>Команда ${index + 1}:</b>\n`;
    team.forEach((player, i) => {
      message += `${i + 1}. ${player.name} ${player.username ? `(${player.username})` : ""}\n`;
    });
    message += "\n";
  });
  return message;
};

// Вспомогательная функция для удаления сообщения через некоторое время
const deleteMessageAfterDelay = (ctx, messageId, delay = 5000) => {
  setTimeout(() => {
    ctx.deleteMessage(messageId).catch(() => {});
  }, delay);
};

module.exports = (bot, GlobalState) => {
  // Функция для отправки сообщения с инлайн-клавиатурой
  const sendTeamsMessage = async (ctx, message) => {
    const inlineKeyboard = Markup.inlineKeyboard([
      Markup.button.callback("Перемешать состав", "reshuffle_callback"),
    ]);
    return ctx.reply(message, { parse_mode: "HTML", reply_markup: inlineKeyboard.reply_markup });
  };

  // Основной обработчик команды для формирования команд (2, 3 или 4)
  bot.hears(/^team (2|3|4)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const msg = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const numTeams = parseInt(ctx.message.text.split(" ")[1], 10);
    let players = [...GlobalState.getPlayers()];

    if (players.length < numTeams) {
      return ctx.reply("⚠️ Недостаточно игроков для создания команд!");
    }

    // Перемешиваем игроков и формируем команды
    players = reshuffleArray(players);
    const teams = divideIntoTeams(players, numTeams);
    const teamsMessage = buildTeamsMessage(teams, "Составы команд");

    // Сохраняем количество команд для дальнейшего перемешивания
    GlobalState.setLastTeamCount(numTeams);

    await sendTeamsMessage(ctx, teamsMessage);
  });

  // Обработчик нажатия кнопки "Перемешать состав" для обновления состава команд
  bot.action("reshuffle_callback", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCbQuery("⛔ Нет прав!");
    }

    const numTeams = GlobalState.getLastTeamCount();
    if (!numTeams) {
      return ctx.answerCbQuery("⚠️ Команды ещё не созданы!");
    }

    let players = [...GlobalState.getPlayers()];
    if (players.length < numTeams) {
      return ctx.answerCbQuery("⚠️ Недостаточно игроков для создания команд!");
    }

    // Перемешиваем игроков и создаем новые команды
    players = reshuffleArray(players);
    const teams = divideIntoTeams(players, numTeams);
    const teamsMessage = buildTeamsMessage(teams, "Составы команд (перемешаны)");

    const inlineKeyboard = Markup.inlineKeyboard([
      Markup.button.callback("Перемешать состав", "reshuffle_callback"),
    ]);

    try {
      await ctx.editMessageText(teamsMessage, { parse_mode: "HTML", reply_markup: inlineKeyboard.reply_markup });
      await ctx.answerCbQuery("Команды перемешаны!");
    } catch (error) {
      if (
        error.response &&
        error.response.description &&
        error.response.description.includes("message is not modified")
      ) {
        return ctx.answerCbQuery("Команды перемешаны!");
      }
      console.error("Ошибка при перемешивании команд:", error);
      await ctx.answerCbQuery("Ошибка при перемешивании команд!");
    }
  });
};
