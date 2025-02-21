


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