const { buildTeamsMessage } = require("../message/buildTeamsMessage");

module.exports = (bot, GlobalState) => {  
  bot.hears(/^fin$/, async (ctx) => {
    const playingTeams = GlobalState.getPlayingTeams();
    if (!playingTeams) {
      return ctx.reply("⛔ Нет активного матча!");
    }

    const allTeams = GlobalState.getTeams(); // Получаем весь список команд
    const teamStats = GlobalState.getTeamStats();
  
    const updateStats = (player, result) => {
      if (!player) return;
      if (!teamStats[player.name]) {
        teamStats[player.name] = {
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals: 0,
          rating: 0,
        };
      }
      teamStats[player.name].games += 1;
      teamStats[player.name].goals += player.goals || 0;
      teamStats[player.name][result] += 1;
  
      const { wins, draws, goals, losses } = teamStats[player.name];
      let rating = wins * 3 + draws * 1 + goals * 0.5 - losses * 1.5;
      teamStats[player.name].rating = Math.max(rating, 0);
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
  
    const updateTeamStats = (teamKey, result) => {
      if (!teamStats[teamKey]) {
        teamStats[teamKey] = { wins: 0, losses: 0, draws: 0, games: 0 };
      }
      teamStats[teamKey].games += 1;
      teamStats[teamKey][result] += 1;
    };

    const team1Index = allTeams.findIndex(team => team === playingTeams.team1);
    const team2Index = allTeams.findIndex(team => team === playingTeams.team2);

    updateTeamStats(`team${team1Index + 1}`, result1);
    updateTeamStats(`team${team2Index + 1}`, result2);
    GlobalState.setTeamStats(teamStats);

    console.log('allTeams', allTeams)
    console.log('teamStats', teamStats)

    const updatedMessage = buildTeamsMessage(allTeams, teamStats); // Формируем новое сообщение
    
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


