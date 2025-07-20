const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");

module.exports = (bot, GlobalState) => {
  bot.hears(/^результат$/i, async (ctx) => {
    await ctx.deleteMessage().catch(() => {});

    const isMatchStarted = GlobalState.getStart();
    const isTeamsDivided = GlobalState.getDivided();
    const teamsBase = GlobalState.getTeamsBase();
    const allTeams = GlobalState.getTeams();
    const matchHistory = GlobalState.getMatchHistory();

		console.log(matchHistory)

    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    // Проверка условий
    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч ещё не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isTeamsDivided || teamsBase.length === 0) {
      const message = await ctx.reply("⚠️ Команды ещё не сформированы!");
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    try {
      // Проверяем, есть ли история матчей
      let hasMatches = false;
      const matchMessages = [];

      // Проходим по matchHistory для поиска всех сыгранных матчей
      for (let teamIndex1 = 0; teamIndex1 < teamsBase.length; teamIndex1++) {
        for (let teamIndex2 = teamIndex1 + 1; teamIndex2 < teamsBase.length; teamIndex2++) {
          const matchesPlayed = matchHistory[teamIndex1]?.[teamIndex2] || 0;
          if (matchesPlayed > 0) {
            hasMatches = true;
            // Формируем сообщение для каждого матча
            const team1 = allTeams[teamIndex1].map(player => ({ ...player })); // Копируем команду
            const team2 = allTeams[teamIndex2].map(player => ({ ...player })); // Копируем команду

            // Получаем статистику голов из teamStats для точного отображения счета
            const team1Goals = GlobalState.getTeamStats()[`team${teamIndex1 + 1}`]?.goalsScored || 0;
            const team2Goals = GlobalState.getTeamStats()[`team${teamIndex2 + 1}`]?.goalsConceded || 0;

            // Устанавливаем количество голов для отображения (можно использовать реальные данные, если они хранятся)
            team1.forEach(player => player.goals = 0); // Сбрасываем для отображения, если нет точных данных
            team2.forEach(player => player.goals = 0); // Сбрасываем для отображения, если нет точных данных

            const matchMessage = buildPlayingTeamsMessage(
              team1,
              team2,
              teamIndex1,
              teamIndex2,
              "finished",
              allTeams
            );
            matchMessages.push(`${matchMessage}\n<b>Матч: Команда ${teamIndex1 + 1} vs Команда ${teamIndex2 + 1} (сыграно ${matchesPlayed} раз)</b>`);
          }
        }
      }

      if (!hasMatches) {
        const message = await ctx.reply("⚠️ История матчей пуста!");
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Отправляем все сообщения о матчах
      for (const messageText of matchMessages) {
        const sentMessage = await ctx.reply(messageText, { parse_mode: "HTML" });
        deleteMessageAfterDelay(ctx, sentMessage.message_id, 120000);
      }
    } catch (error) {
      console.error("Ошибка при формировании результатов матчей:", error);
      const message = await ctx.reply("⚠️ Не удалось сформировать результаты матчей.");
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};