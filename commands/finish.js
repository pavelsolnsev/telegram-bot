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

    // Подсчет голов
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

    // Обновляем статистику команд
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

    // Обновляем статистику игроков, включая голы
    const updatePlayerStats = (team, originalTeam, isWin, isDraw, isLose) => {
      return team.map((player, index) => {
        const goals = player.goals || 0;
        const originalPlayer = originalTeam[index] || {};
        const totalGoals = (originalPlayer.goals || 0) + goals; // Суммируем голы

        let rating = originalPlayer.rating || 0;
        rating += goals * 0.5; // Очки за голы

        if (isWin) rating += 3;
        if (isDraw) rating += 1;
        if (isLose) rating -= 1.5;

        return {
          ...originalPlayer,
          name: player.name,
          username: player.username,
          gamesPlayed: (originalPlayer.gamesPlayed || 0) + 1,
          wins: (originalPlayer.wins || 0) + (isWin ? 1 : 0),
          draws: (originalPlayer.draws || 0) + (isDraw ? 1 : 0),
          losses: (originalPlayer.losses || 0) + (isLose ? 1 : 0),
          goals: totalGoals,
          rating: rating, // Убрано Math.max, допускаем отрицательные значения
        };
      });
    };

    allTeams[teamIndex1] = updatePlayerStats(team1, allTeams[teamIndex1], result === "team1", result === "draw", result === "team2");
    allTeams[teamIndex2] = updatePlayerStats(team2, allTeams[teamIndex2], result === "team2", result === "draw", result === "team1");

    // Сохраняем обновленные команды и статистику
    GlobalState.setTeams(allTeams);
    GlobalState.setTeamStats(teamStats);
    GlobalState.setPlayingTeams(null); // Очистка текущей игры

    // Формируем новое сообщение с обновленной статистикой
    const updatedMessage = buildTeamsMessage(allTeams, "Составы команд после матча", teamStats);

    // Обновляем сообщение со списком команд
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