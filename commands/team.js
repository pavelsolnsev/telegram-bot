const { Markup } = require("telegraf");
const { GlobalState } = require("../store");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");

// Функция перемешивания массива
const reshuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);

// Функция разделения игроков на команды
const divideIntoTeams = (players, numTeams) => {
  const teams = Array.from({ length: numTeams }, () => []);
  players.forEach((player, index) => {
    teams[index % numTeams].push(player);
  });
  return teams;
};

// Функция создания сообщения с командами
const buildTeamsMessage = (teams, title = "Составы команд") => {
  let message = `🏆 <b>${title}:</b>\n\n`;
  teams.forEach((team, index) => {
    message += `⚽ <b>Команда ${index + 1}:</b>\n`;
    team.forEach((player, i) => {
      const goalsText = player.goals && player.goals > 0 ? ` - Голы: ${player.goals}` : "";
      message += `${i + 1}. ${player.name} ${player.username ? `(${player.username})` : ""}${goalsText}\n`;
    });
    message += "\n";
  });
  return message;
};

const updatePlayingTeamsMessage = async (ctx) => {
  const playingTeamsMessageId = GlobalState.getPlayingTeamsMessageId();
  const playingTeams = GlobalState.getPlayingTeams();

  if (!playingTeamsMessageId || !playingTeams) {
    console.log("Ошибка: playingTeamsMessageId или playingTeams отсутствуют!");
    return;
  }

  if (!playingTeamsMessageId || !playingTeams) {
    return;
  }

  const teamsMessage = buildPlayingTeamsMessage(
    playingTeams.team1,
    playingTeams.team2,
    playingTeams.teamIndex1,
    playingTeams.teamIndex2
  );

  try {
    await ctx.telegram.editMessageText(
      playingTeamsMessageId.chatId,
      playingTeamsMessageId.messageId,
      null,
      teamsMessage,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          ...createTeamButtons(playingTeams.team1, playingTeams.teamIndex1),
          ...createTeamButtons(playingTeams.team2, playingTeams.teamIndex2),
        ]).reply_markup,
      }
    );
  } catch (error) {
    console.error("Ошибка при обновлении сообщения с играющими командами:", error);
  }
};


// Функция отправки сообщения с составами команд
const sendTeamsMessage = async (ctx, message) => {
  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Перемешать состав", "reshuffle_callback"),
  ]);

  const sentMessage = await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard.reply_markup,
  });

  GlobalState.setLastTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
};

// Функция создания кнопок для игроков команды
const createTeamButtons = (team, teamIndex) => {
  return team.map((player, index) =>
    Markup.button.callback(`${index + 1}. ${player.name}`, `goal_${teamIndex}_${index}`)
  );
};

// Функция создания сообщения с играющими командами
const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2) => {
  let message = "🔥 Играют следующие команды:\n\n";
  message += `<b>Команда ${teamIndex1 + 1}:</b>\n`;
  team1.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });
  message += `\n<b>Команда ${teamIndex2 + 1}:</b>\n`;
  team2.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });
  return message;
};

module.exports = (bot, GlobalState) => {
  // Обработка нажатий на кнопки голов
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const teams = GlobalState.getTeams();
  
    if (!teams[teamIndex] || !teams[teamIndex][playerIndex]) {
      return ctx.answerCbQuery("Игрок не найден!");
    }
  
    const player = teams[teamIndex][playerIndex];
    player.goals = (player.goals || 0) + 1;
    GlobalState.setTeams(teams);
  
    // Обновляем playingTeams
    const playingTeams = GlobalState.getPlayingTeams();
    if (playingTeams) {
      if (teamIndex === playingTeams.teamIndex1) {
        playingTeams.team1[playerIndex].goals = player.goals;
      } else if (teamIndex === playingTeams.teamIndex2) {
        playingTeams.team2[playerIndex].goals = player.goals;
      }
      GlobalState.setPlayingTeams(playingTeams);
    }
  
    await updatePlayingTeamsMessage(ctx); // Теперь сообщение обновится

    const message = await ctx.reply(`Гол добавлен для ${player.name}! Теперь у него ${player.goals} гол(ов).`);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
  
  
  // Обработка команд для создания команд
  bot.hears(/^team (2|3|4)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const msg = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    const numTeams = parseInt(ctx.match[1], 10);
    let players = [...GlobalState.getPlayers()];

    if (players.length < numTeams) {
      return ctx.reply("⚠️ Недостаточно игроков для создания команд!");
    }

    players = reshuffleArray(players);
    const teams = divideIntoTeams(players, numTeams);
    const teamsMessage = buildTeamsMessage(teams, "Составы команд");

    GlobalState.setTeams(teams);
    GlobalState.setLastTeamCount(numTeams);
    await sendTeamsMessage(ctx, teamsMessage);
  });

  bot.hears(/^g (\d+) (\d+)$/, async (ctx) => {
    const args = ctx.message.text.split(" ");
    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    const teams = GlobalState.getTeams();

    if (!teams[teamIndex] || !teams[teamIndex][playerIndex]) {
      const message = await ctx.reply("Игрок не найден!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const player = teams[teamIndex][playerIndex];
    player.goals = (player.goals || 0) + 1;
    GlobalState.setTeams(teams);

    // Обновляем данные в playingTeams
    const playingTeams = GlobalState.getPlayingTeams();
    if (playingTeams) {
      if (teamIndex === playingTeams.teamIndex1) {
        playingTeams.team1[playerIndex].goals = player.goals;
      } else if (teamIndex === playingTeams.teamIndex2) {
        playingTeams.team2[playerIndex].goals = player.goals;
      }
      GlobalState.setPlayingTeams(playingTeams);
    }

    await updatePlayingTeamsMessage(ctx);
    const message = await ctx.reply(`Гол добавлен для ${player.name}. Теперь у него ${player.goals} гол(ов).`);
		return deleteMessageAfterDelay(ctx, message.message_id);
  });

  // Обработка команды для начала игры
  bot.hears(/^play (\d+) (\d+)$/, async (ctx) => {
    const teamIndex1 = parseInt(ctx.match[1], 10) - 1;
    const teamIndex2 = parseInt(ctx.match[2], 10) - 1;
    const teams = GlobalState.getTeams();
  
    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      const message = await ctx.reply("⛔Команды не найдены!");
			return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    const team1 = teams[teamIndex1];
    const team2 = teams[teamIndex2];
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2);
  
    const sentMessage = await ctx.reply(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(team1, teamIndex1),
        ...createTeamButtons(team2, teamIndex2),
      ]).reply_markup,
    });
  
    // Сохраняем ID сообщения с играющими командами
    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
  
    // Сохраняем текущие играющие команды
    GlobalState.setPlayingTeams({
      team1,
      team2,
      teamIndex1,
      teamIndex2,
    });
  });


  bot.hears(/^fin$/, async (ctx) => {
    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      return ctx.reply("⛔ Нет активного матча!");
    }
  
    const stats = {};
  
    const updateStats = (player, result) => {
      if (!stats[player.name]) {
        stats[player.name] = {
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals: 0,
          rating: 0, // Добавляем поле для рейтинга
        };
      }
      stats[player.name].games += 1;
      stats[player.name].goals += player.goals || 0;
      stats[player.name][result] += 1;
  
      // Вычисляем рейтинг
      const { wins, draws, goals, losses, games } = stats[player.name];
      let rating = wins * 3 + draws * 1 + goals * 0.5 - losses * 1.5; // Формула для рейтинга
  
      // Устанавливаем минимальный рейтинг 0
      if (rating < 0) {
        rating = 0;
      }
  
      stats[player.name].rating = rating; // Применяем рейтинг
    };
  
    const team1Goals = playingTeams.team1.reduce((sum, p) => sum + (p.goals || 0), 0);
    const team2Goals = playingTeams.team2.reduce((sum, p) => sum + (p.goals || 0), 0);
  
    let result1 = "draws";
    let result2 = "draws";
  
    if (team1Goals > team2Goals) {
      result1 = "wins";
      result2 = "losses";
    } else if (team1Goals < team2Goals) {
      result1 = "losses";
      result2 = "wins";
    }
  
    playingTeams.team1.forEach((player) => updateStats(player, result1));
    playingTeams.team2.forEach((player) => updateStats(player, result2));
  
    console.log("📊 Статистика игроков:");
    Object.entries(stats).forEach(([name, data]) => {
      console.log(
        `${name}: Игры: ${data.games}, Победы: ${data.wins}, Ничьи: ${data.draws}, Поражения: ${data.losses}, Голы: ${data.goals}, Рейтинг: ${data.rating.toFixed(2)}`
      );
    });
  
    return ctx.reply("✅ Матч завершен, статистика обновлена!");
  });
  
  
  // Обработка нажатия кнопки "Перемешать состав"
  bot.action("reshuffle_callback", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

 	  if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
			const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
			return deleteMessageAfterDelay(ctx, message.message_id); 
		}

    const numTeams = GlobalState.getLastTeamCount();
    let players = [...GlobalState.getPlayers()];

    if (players.length < numTeams) {
      const message = await ctx.reply("⛔ Недостаточно игроков для создания команд!");
			return deleteMessageAfterDelay(ctx, message.message_id);
    }

    players = reshuffleArray(players);
    const teams = divideIntoTeams(players, numTeams);
    const teamsMessage = buildTeamsMessage(teams, "Составы команд (перемешаны)");

    await ctx.editMessageText(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback("Перемешать состав", "reshuffle_callback"),
      ]).reply_markup,
    });
    await ctx.answerCbQuery("Команды перемешаны!");
  });
};
