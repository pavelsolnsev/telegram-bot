const { buildTeamsMessage } = require("../message/buildTeamsMessage");

module.exports = (bot, GlobalState) => {  
  bot.hears("fin", async (ctx) => {
    const playingTeams = GlobalState.getPlayingTeams();
  
    if (!playingTeams) {
      return ctx.reply("⛔ Нет активного матча!");
    }
  
    const { team1, team2, teamIndex1, teamIndex2 } = playingTeams;
    const allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
  
    // Подсчёт голов
    const team1Goals = team1.reduce((sum, player) => sum + (player.goals || 0), 0);
    const team2Goals = team2.reduce((sum, player) => sum + (player.goals || 0), 0);
  
    let result;
    if (team1Goals > team2Goals) {
      result = "team1"; // Победа первой команды
    } else if (team1Goals < team2Goals) {
      result = "team2"; // Победа второй команды
    } else {
      result = "draw"; // Ничья
    }
  
    // Обновление статистики команд
    const updateTeamStats = (teamKey, isWin, isDraw) => {
      if (!teamStats[teamKey]) {
        teamStats[teamKey] = { wins: 0, losses: 0, draws: 0, games: 0 };
      }
  
      teamStats[teamKey].games += 1;
      if (isWin) teamStats[teamKey].wins += 1;
      if (!isWin && !isDraw) teamStats[teamKey].losses += 1;
      if (isDraw) teamStats[teamKey].draws += 1;
    };
  
    updateTeamStats(`team${teamIndex1 + 1}`, result === "team1", result === "draw");
    updateTeamStats(`team${teamIndex2 + 1}`, result === "team2", result === "draw");
  
    // Обновление статистики игроков, включая rating
    const updatePlayerStats = (team, isWin, isDraw, isLose) => {
      return team.map((player) => {
        const goals = player.goals || 0;
        let rating = player.rating || 0;
  
        rating += goals * 0.5; // Сначала добавляем очки за голы
  
        if (isWin) rating += 3;
        if (isDraw) rating += 1;
        if (isLose) rating -= 1.5;
  
        return {
          ...player,
          gamesPlayed: (player.gamesPlayed || 0) + 1,
          wins: (player.wins || 0) + (isWin ? 1 : 0),
          draws: (player.draws || 0) + (isDraw ? 1 : 0),
          losses: (player.losses || 0) + (isLose ? 1 : 0),
          rating: Math.max(rating, 0), // Чтобы рейтинг не уходил в минус
        };
      });
    };
  
    allTeams[teamIndex1] = updatePlayerStats(team1, result === "team1", result === "draw", result === "team2");
    allTeams[teamIndex2] = updatePlayerStats(team2, result === "team2", result === "draw", result === "team1");
  
    // Сохранение данных
    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);
    GlobalState.setPlayingTeams(null); // Очистка текущей игры
  
    // Формируем новое сообщение
    const updatedMessage = buildTeamsMessage(allTeams, teamStats);
  
    // Получаем старое сообщение с командами
    const lastTeamsMessage = GlobalState.getLastTeamsMessageId();
  
    if (lastTeamsMessage) {
      try {
        await ctx.telegram.editMessageText(
          lastTeamsMessage.chatId,
          lastTeamsMessage.messageId,
          null,
          updatedMessage,
          { parse_mode: "HTML" }
        );
        return ctx.reply("✅ Матч завершен, статистика обновлена!");
      } catch (error) {
        console.error("Ошибка при редактировании сообщения:", error);
      }
    }
  
    // Если нет старого сообщения, отправляем новое и сохраняем его ID
    const sentMessage = await ctx.reply(updatedMessage, { parse_mode: "HTML" });
    GlobalState.setLastTeamsMessageId(ctx.chat.id, sentMessage.message_id);
    return ctx.reply("✅ Матч завершен, статистика обновлена!");
  });
  
  
};


