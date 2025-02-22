const { Markup } = require("telegraf");
const { GlobalState } = require("../store");

const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Импорт функции удаления сообщений с задержкой

// Вспомогательная функция для перемешивания массива игроков
const reshuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);

// Функция для разделения списка игроков на команды
const divideIntoTeams = (players, numTeams) => {
  // Создаём массив с пустыми командами (количество команд = numTeams)
  const teams = Array.from({ length: numTeams }, () => []);

  // Распределяем игроков по командам по очереди
  players.forEach((player, index) => {
    // Используем оператор остатка % для циклического распределения
    teams[index % numTeams].push(player);
  });

  // Возвращаем массив команд
  return teams;
};


// Функция для создания сообщения с составами команд
const buildTeamsMessage = (teams, title = "Составы команд") => {
  // Начинаем формирование сообщения с заголовка (используем HTML-разметку)
  let message = `🏆 <b>${title}:</b>\n\n`;

  // Перебираем команды и формируем список игроков
  teams.forEach((team, index) => {
    // Добавляем заголовок для каждой команды
    message += `⚽ <b>Команда ${index + 1}:</b>\n`;

    // Перебираем игроков в команде
    team.forEach((player, i) => {
      // Если у игрока есть забитые голы, добавляем информацию о голах
      const goalsText =
        player.goals && player.goals > 0 ? ` - Голы: ${player.goals}` : "";

      // Добавляем игрока в сообщение (номер в списке, имя, никнейм (если есть) и голы)
      message += `${i + 1}. ${player.name} ${
        player.username ? `(${player.username})` : ""
      }${goalsText}\n`;
    });

    // Добавляем пустую строку между командами для лучшей читаемости
    message += "\n";
  });

  // Возвращаем готовое сообщение
  return message;
};


// Функция для отправки сообщения с составами команд и кнопкой "Перемешать состав"
const sendTeamsMessage = async (ctx, message) => {
  // Создаем инлайн-клавиатуру с кнопкой "Перемешать состав"
  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Перемешать состав", "reshuffle_callback"),
  ]);

  // Отправляем сообщение с составами команд и прикрепляем инлайн-клавиатуру
  const sentMessage = await ctx.reply(message, {
    parse_mode: "HTML", // Указываем, что в сообщении используется HTML-разметка
    reply_markup: inlineKeyboard.reply_markup, // Прикрепляем клавиатуру
  });

  // Сохраняем ID отправленного сообщения в глобальном состоянии,
  // чтобы позже можно было его обновить
  GlobalState.setLastTeamsMessageId(
    sentMessage.chat.id, // ID чата, где было отправлено сообщение
    sentMessage.message_id // ID самого сообщения
  );
};


// Функция для создания кнопок с игроками команды
const createTeamButtons = (team, teamIndex) => {
  return team.map((player, index) => 
    // Создаем кнопку с номером игрока и его именем
    Markup.button.callback(
      `${index + 1}. ${player.name}`, // Текст кнопки (номер и имя игрока)
      `goal_${teamIndex}_${index}` // Callback-данные (идентификатор для обработки нажатия)
    )
  );
};


module.exports = (bot, GlobalState) => {
  // Обрабатываем нажатие на кнопку, которая соответствует шаблону "goal_X_Y"
  // Где X — номер команды, Y — номер игрока в этой команде
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    // Получаем индексы команды и игрока из регулярного выражения в кнопке
    const teamIndex = parseInt(ctx.match[1], 10); // Индекс команды
    const playerIndex = parseInt(ctx.match[2], 10); // Индекс игрока в команде

    // Получаем текущие команды из глобального состояния
    const teams = GlobalState.getTeams();

    // Проверяем, существует ли такая команда и такой игрок
    if (!teams[teamIndex] || !teams[teamIndex][playerIndex]) {
      return ctx.answerCbQuery("Игрок не найден!"); // Выводим сообщение, если игрока нет
    }

    // Находим нужного игрока в команде
    const player = teams[teamIndex][playerIndex];

    // Увеличиваем количество голов у игрока (если голов не было, ставим 0 и прибавляем 1)
    player.goals = (player.goals || 0) + 1;

    // Формируем новое сообщение с обновленным списком команд и голов игроков
    const teamsMessage = buildTeamsMessage(teams, "Составы команд (обновлены)");

    // Сохраняем обновленные команды в глобальное хранилище
    GlobalState.setTeams(teams);

    // Отправляем всплывающее уведомление о добавлении гола игроку
    await ctx.answerCbQuery(`Гол добавлен для ${player.name}!`);

    // Обновляем сообщение с командами, чтобы показать новое количество голов
    await ctx.editMessageText(teamsMessage, {
      parse_mode: "HTML", // Указываем, что текст в формате HTML
      reply_markup: Markup.inlineKeyboard(
        teams.flatMap((team, teamIndex) => createTeamButtons(team, teamIndex)) // Создаем новые кнопки
      ).reply_markup,
    });
  });

  // Обрабатываем команду "team 2", "team 3" или "team 4"
  // Это означает, что пользователь хочет разделить игроков на 2, 3 или 4 команды
  bot.hears(/^team (2|3|4)$/i, async (ctx) => {
    // Получаем ID администратора из глобального состояния
    const ADMIN_ID = GlobalState.getAdminId();

    // Удаляем сообщение пользователя (чтобы чат не засорялся)
    await ctx.deleteMessage().catch(() => {});

    // Проверяем, является ли пользователь администратором
    if (ctx.from.id !== ADMIN_ID) {
      // Если нет прав, отправляем сообщение "⛔ Нет прав!" и удаляем его через некоторое время
      const msg = await ctx.reply("⛔ Нет прав!");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    // Получаем количество команд из текста сообщения (например, "team 3" → 3)
    const numTeams = parseInt(ctx.message.text.split(" ")[1], 10);

    // Получаем список всех игроков из глобального состояния
    let players = [...GlobalState.getPlayers()];

    // Проверяем, хватает ли игроков для создания команд
    if (players.length < numTeams) {
      return ctx.reply("⚠️ Недостаточно игроков для создания команд!");
    }

    // Перемешиваем список игроков случайным образом
    players = reshuffleArray(players);

    // Разделяем игроков на заданное количество команд
    const teams = divideIntoTeams(players, numTeams);

    // Формируем текстовое сообщение с составами команд
    const teamsMessage = buildTeamsMessage(teams, "Составы команд");

    // Сохраняем созданные команды в глобальное состояние
    GlobalState.setTeams(teams);

    // Сохраняем количество команд (чтобы потом можно было перемешать их заново)
    GlobalState.setLastTeamCount(numTeams);

    // Отправляем сообщение с командами в чат
    await sendTeamsMessage(ctx, teamsMessage);
  });

  // Обрабатываем команду "g X Y", где:
  // X — номер команды (начиная с 1)
  // Y — номер игрока в команде (начиная с 1)
  bot.hears(/^g (\d+) (\d+)$/, async (ctx) => {
    // Разбиваем сообщение пользователя на части (например, "g 1 2" → ["g", "1", "2"])
    const args = ctx.message.text.split(" ");

    // Получаем номер команды и уменьшаем его на 1 (чтобы соответствовать индексу массива)
    const teamIndex = parseInt(args[1], 10) - 1;

    // Получаем номер игрока и уменьшаем его на 1 (чтобы соответствовать индексу массива)
    const playerIndex = parseInt(args[2], 10) - 1;

    // Получаем текущий список команд из глобального состояния
    const teams = GlobalState.getTeams();

    // Проверяем, существует ли такая команда и игрок в ней
    if (!teams[teamIndex] || !teams[teamIndex][playerIndex]) {
      return ctx.reply("Игрок не найден!"); // Отправляем сообщение, если игрока нет
    }

    // Получаем объект игрока
    const player = teams[teamIndex][playerIndex];

    // Увеличиваем количество голов (если голов не было, ставим 0 и прибавляем 1)
    player.goals = (player.goals || 0) + 1;

    // Формируем обновленное сообщение с командами
    const teamsMessage = buildTeamsMessage(teams, "Составы команд (обновлены)");

    // Сохраняем обновленные данные в глобальном состоянии
    GlobalState.setTeams(teams);

    // Получаем информацию о последнем отправленном сообщении с командами
    const sentMessages = GlobalState.getLastTeamsMessageId();

    // Если есть последнее сообщение с командами, обновляем его
    if (sentMessages) {
      try {
        await ctx.telegram.editMessageText(
          sentMessages.chatId, // ID чата
          sentMessages.messageId, // ID сообщения
          null,
          teamsMessage, // Новое сообщение с командами
          {
            parse_mode: "HTML",
            reply_markup: Markup.inlineKeyboard(
              teams.flatMap(
                (team, teamIndex) => createTeamButtons(team, teamIndex) // Создаем новые кнопки
              )
            ).reply_markup,
          }
        );
      } catch (error) {
        console.error("Ошибка при обновлении сообщения с командами:", error);
      }
    }

    // Отправляем сообщение в чат о добавленном голе
    await ctx.reply(
      `Гол добавлен для ${player.name}. Теперь у него ${player.goals} гол(ов).`
    );

    // Выводим информацию в консоль для отладки
    console.log("player", player);
    console.log("teams", teams);
  });

  // Обрабатываем команду "play X Y", где:
  // X — номер первой команды
  // Y — номер второй команды
  bot.hears(/^play (\d+) (\d+)$/, async (ctx) => {
    // Разбиваем сообщение пользователя на части (например, "play 1 2" → ["play", "1", "2"])
    const args = ctx.message.text.split(" ");

    // Получаем номер первой команды и уменьшаем его на 1 (чтобы соответствовать индексу массива)
    const teamIndex1 = parseInt(args[1], 10) - 1;

    // Получаем номер второй команды и уменьшаем его на 1 (чтобы соответствовать индексу массива)
    const teamIndex2 = parseInt(args[2], 10) - 1;

    // Получаем текущий список команд из глобального состояния
    const teams = GlobalState.getTeams();

    // Проверяем, существуют ли выбранные команды
    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      return ctx.reply("Команды не найдены!"); // Если нет, отправляем сообщение об ошибке
    }

    // Получаем составы двух выбранных команд
    const team1 = teams[teamIndex1];
    const team2 = teams[teamIndex2];

    // Формируем сообщение с составами играющих команд
    let message = "🔥 Играют следующие команды:\n\n";

    // Добавляем в сообщение состав первой команды
    message += `<b>Команда ${teamIndex1 + 1}:</b>\n`;
    team1.forEach((player, index) => {
      message += `${index + 1}. ${player.name} (${
        player.username || "Без username"
      })\n`;
    });

    // Добавляем в сообщение состав второй команды
    message += `\n<b>Команда ${teamIndex2 + 1}:</b>\n`;
    team2.forEach((player, index) => {
      message += `${index + 1}. ${player.name} (${
        player.username || "Без username"
      })\n`;
    });

    // Отправляем сообщение с командами в чат, используя HTML-разметку
    await ctx.reply(message, { parse_mode: "HTML" });
  });

  // Обрабатываем нажатие кнопки "Перемешать состав"
  bot.action("reshuffle_callback", async (ctx) => {
    // Получаем ID администратора
    const ADMIN_ID = GlobalState.getAdminId();

    // Проверяем, является ли пользователь администратором
    if (ctx.from.id !== ADMIN_ID) {
      return ctx.answerCbQuery("⛔ Нет прав!"); // Если нет, отправляем уведомление
    }

    // Получаем количество команд, созданных в последний раз
    const numTeams = GlobalState.getLastTeamCount();

    // Если команды еще не были созданы, отправляем уведомление
    if (!numTeams) {
      return ctx.answerCbQuery("⚠️ Команды ещё не созданы!");
    }

    // Получаем список всех игроков
    let players = [...GlobalState.getPlayers()];

    // Проверяем, хватает ли игроков для создания команд
    if (players.length < numTeams) {
      return ctx.answerCbQuery("⚠️ Недостаточно игроков для создания команд!");
    }

    // Перемешиваем список игроков случайным образом
    players = reshuffleArray(players);

    // Делим игроков на указанное количество команд
    const teams = divideIntoTeams(players, numTeams);

    // Генерируем сообщение с обновленными составами команд
    const teamsMessage = buildTeamsMessage(
      teams,
      "Составы команд (перемешаны)"
    );

    // Создаем инлайн-кнопку для повторного перемешивания
    const inlineKeyboard = Markup.inlineKeyboard([
      Markup.button.callback("Перемешать состав", "reshuffle_callback"),
    ]);

    try {
      // Обновляем сообщение в чате с новыми командами
      await ctx.editMessageText(teamsMessage, {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });

      // Отправляем уведомление, что команды перемешаны
      await ctx.answerCbQuery("Команды перемешаны!");
    } catch (error) {
      // Проверяем, не было ли ошибки "message is not modified" (если составы не изменились)
      if (
        error.response &&
        error.response.description &&
        error.response.description.includes("message is not modified")
      ) {
        return ctx.answerCbQuery("Команды перемешаны!");
      }

      // Логируем ошибку в консоль и отправляем уведомление об ошибке
      console.error("Ошибка при перемешивании команд:", error);
      await ctx.answerCbQuery("Ошибка при перемешивании команд!");
    }
  });
};
