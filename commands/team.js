const { Markup } = require("telegraf");

const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Импорт функции удаления сообщений с задержкой

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
      const goalsText =
        player.goals && player.goals > 0 ? ` - Голы: ${player.goals}` : "";
      message += `${i + 1}. ${player.name} ${
        player.username ? `(${player.username})` : ""
      }${goalsText}\n`;
    });
    message += "\n";
  });
  return message;
};

  // Функция для отправки сообщения с инлайн-клавиатурой
	const sendTeamsMessage = async (ctx, message) => {
		const inlineKeyboard = Markup.inlineKeyboard([
			Markup.button.callback("Перемешать состав", "reshuffle_callback"),
		]);
		return ctx.reply(message, {
			parse_mode: "HTML",
			reply_markup: inlineKeyboard.reply_markup,
		});
	};


module.exports = (bot, GlobalState) => {

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

    console.log("teams", teams);
    console.log("teamsMessage", teamsMessage);
    console.log("numTeams", numTeams);

    // Сохраняем команды в GlobalState
    GlobalState.setTeams(teams); // Сохраняем команды
    GlobalState.setLastTeamCount(numTeams); // Сохраняем количество команд для дальнейшего перемешивания

    await sendTeamsMessage(ctx, teamsMessage);
  });

  bot.command("g", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.reply("⛔ Нет прав!");
    }

    // Разбиваем команду на аргументы, например: /g username
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
      return ctx.reply(
        "Введите ID, username или имя игрока. Пример: /g username"
      );
    }

    const identifier = args[1].toLowerCase();
    const players = GlobalState.getPlayers();

    // Ищем игрока по ID, username или имени
    const player = players.find(
      (p) =>
        String(p.id) === identifier ||
        (p.username && p.username.toLowerCase() === identifier) ||
        (p.name && p.name.toLowerCase() === identifier)
    );

    if (!player) {
      return ctx.reply("Игрок не найден.");
    }

    console.log("player", player);

    // Получаем количество команд и список команд

    const numTeams = GlobalState.getLastTeamCount();
    if (!numTeams) {
      return ctx.reply("Команды еще не были созданы.");
    }

    console.log("numTeams", numTeams);

    let teams = GlobalState.getTeams(); // Список команд
    let playerInTeam = null;
    console.log("teams", teams);
    // Находим команду, к которой относится игрок
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      playerInTeam = team.find((p) => p.id === player.id);
      if (playerInTeam) {
        playerInTeam.goals = playerInTeam.goals ? playerInTeam.goals + 1 : 1;
        break;
      }
    }

    if (!playerInTeam) {
      return ctx.reply("Игрок не найден в составе команд.");
    }

    // Обновляем составы команд
    teams = reshuffleArray(teams);
    const teamsMessage = buildTeamsMessage(teams, "Составы команд (обновлены)");

    // Сохраняем обновленные команды в GlobalState
    GlobalState.setTeams(teams);

    // Получаем ID сообщения с составами команд и обновляем его
    const listMessageId = GlobalState.getListMessageId();
    if (listMessageId) {
      try {
        // Если сообщение с изображением, обновляем подпись
        await ctx.telegram.editMessageCaption(
          ctx.chat.id,
          listMessageId,
          null,
          teamsMessage,
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard([
              Markup.button.callback("Перемешать состав", "reshuffle_callback"),
            ]).reply_markup,
          }
        );
      } catch (error) {
        console.error("Ошибка при обновлении списка команд:", error);
      }
    }

    return ctx.reply(
      `Гол добавлен для ${player.name}. Теперь у него ${playerInTeam.goals} гол(ов).`
    );
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
    const teamsMessage = buildTeamsMessage(
      teams,
      "Составы команд (перемешаны)"
    );

    const inlineKeyboard = Markup.inlineKeyboard([
      Markup.button.callback("Перемешать состав", "reshuffle_callback"),
    ]);

    try {
      await ctx.editMessageText(teamsMessage, {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
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
