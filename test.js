
// Команда u (unpay) для снятия отметки оплаты у игрока



// Команда для изменения времени тренировки (t ДД.ММ.ГГГГ ЧЧ:ММ)
bot.hears(/^t \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/i, async (ctx) => {
  // Удаляем сообщение с командой
  await ctx.deleteMessage().catch(() => {});

  // Проверяем, является ли пользователь администратором
  if (!isAdmin(ctx)) return;

  // Получаем введенное время
  const userInput = ctx.message.text.trim().slice(2).trim(); // Убираем "t "
  const [datePart, timePart] = userInput.split(" ");
  const [day, month, year] = datePart.split(".").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  // Создаем новую дату
  const newDate = new Date(year, month - 1, day, hours, minutes);

  // Проверяем, что дата корректна
  if (isNaN(newDate.getTime())) {
      const message = await ctx.reply("⚠️ Неверный формат даты! Используй: t ДД.ММ.ГГГГ ЧЧ:ММ");
      return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
  }

  // Обновляем время тренировки
  collectionDate = newDate;

  // Отправляем уведомление об успешном изменении времени
  const message = await ctx.reply(`✅ Время тренировки изменено на: ${userInput}`);
  deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд

  // Обновляем список игроков
  await sendPlayerList(ctx);
});

bot.hears(/^list$/i, async (ctx) => {
  // Удаляем команду `list`
  await ctx.deleteMessage().catch(() => {});

  if (!isMatchActive(ctx)) {
    const message = await ctx.reply("⚠️ Список игроков ещё не создан.");
    return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
  }

  if (!listMessageId) {
      const message = await ctx.reply("⚠️ Список игроков ещё не создан.");
      return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
  }

  try {
      // Прокручиваем чат до закрепленного сообщения
      const sentMessage = await ctx.telegram.forwardMessage(ctx.chat.id, ctx.chat.id, listMessageId);

      // Удаляем сообщение со списком через 5 секунд
      deleteMessageAfterDelay(ctx, sentMessage.message_id, 10000);
  } catch (error) {
      console.error("Ошибка при прокрутке к закрепленному сообщению:", error);
      const message = await ctx.reply("⚠️ Не удалось найти закрепленное сообщение.");
      deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
  }
});

// Команда для завершения сбора и обнуления данных (формат: e!)
bot.hears(/^e!$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  if (!isMatchActive(ctx)) return; // Проверяем, запущен ли матч
  if (listMessageId) {
    await ctx.telegram
      .deleteMessage(ctx.chat.id, listMessageId)
      .catch(() => {});
    listMessageId = null;
  }
  players = [];
  queue = [];
  collectionDate = null;
  location = "Локация пока не определена";
  MAX_PLAYERS = 14;
  isMatchStarted = false; // Матч завершён
  const message = await ctx.reply(
    "✅ Сбор успешно завершён! Все данные обнулены."
  );
  deleteMessageAfterDelay(ctx, message.message_id);
  notificationSent = false;
});


// Обработчик команды teams [N]
bot.hears(/^teams (\d+)$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ Нет прав!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  
  if (!isMatchActive()) {
    const message = await ctx.reply("⚠️ Матч не начат!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }

  const teamCount = parseInt(ctx.match[1]);
  if (teamCount < 2 || teamCount > 4) {
    const message = await ctx.reply("⚠️ Допустимо 2-4 команды!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }

  if (players.length < teamCount) {
    const message = await ctx.reply("⚠️ Игроков меньше чем команд!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }

  // Формируем команды
  const shuffledPlayers = shuffle([...players]);
  const teams = splitTeams(shuffledPlayers, teamCount);

  // Формируем сообщение
  const messageText = formatTeamsMessage(teams);
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback("🔄 Перемешать снова", `shuffle_teams_${teamCount}`)
  ]);

  const sentMessage = await ctx.reply(messageText, {
    parse_mode: "HTML",
    reply_markup: keyboard.reply_markup
  });

  // Сохраняем ID сообщения для возможного обновления
  ctx.session.teamsMessageId = sentMessage.message_id;
});

// Перемешивание массива
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Разделение на команды
function splitTeams(players, teamCount) {
  const teams = [];
  const playersPerTeam = Math.ceil(players.length / teamCount);
  
  for (let i = 0; i < teamCount; i++) {
    teams.push(players.slice(i * playersPerTeam, (i + 1) * playersPerTeam));
  }
  return teams;
}

// Форматирование сообщения с командами
function formatTeamsMessage(teams) {
  let message = "⚽ <b>Сформированные команды:</b>\n\n";
  teams.forEach((team, index) => {
    message += `🔵 <b>Команда ${index + 1}:</b>\n`;
    team.forEach((player, playerIndex) => {
      message += `${playerIndex + 1}. ${player.name} ${player.username || ""}\n`;
    });
    message += "\n";
  });
  return message;
}