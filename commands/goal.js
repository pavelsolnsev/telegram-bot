const {
  updatePlayingTeamsMessage,
} = require("../message/updatePlayingTeamsMessage");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const db = require("../database/database");

module.exports = (bot, GlobalState) => {
  // Обработчик команды "g <team> <player>" для добавления гола
  bot.hears(/^g (\d+) (\d+)$/, async (ctx) => {
    const args = ctx.message.text.split(" ");
    const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
    const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
    await ctx.deleteMessage().catch(() => {});
    if (ctx.from.id !== ADMIN_ID) {
      // Проверяем, является ли отправитель администратором
      const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    } // Если матч не начался, выходим из функции

    const teamIndex = parseInt(args[1], 10) - 1; // Уменьшаем на 1, так как команды начинаются с 1
    const playerIndex = parseInt(args[2], 10) - 1; // Уменьшаем на 1, так как индексы с 0

    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await ctx.reply("⛔ Нет активного матча!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    let team;
    if (teamIndex === playingTeams.teamIndex1) {
      team = playingTeams.team1;
    } else if (teamIndex === playingTeams.teamIndex2) {
      team = playingTeams.team2;
    } else {
      return ctx.reply("⛔ Команда не найдена!");
    }

    if (!team[playerIndex]) {
      return ctx.reply("⛔ Игрок не найден!");
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await ctx.reply(
      `⚽ Гол добавлен для ${team[playerIndex].name}! Теперь у него ${team[playerIndex].goals} гол(ов) в этом матче.`
    );
    return deleteMessageAfterDelay(ctx, message.message_id);
  });

  // Обработчик команды "ug <team> <player>" для удаления гола
  bot.hears(/^ug (\d+) (\d+)$/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
    const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч

    if (ctx.from.id !== ADMIN_ID) {
      // Проверяем, является ли отправитель администратором
      const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    } // Если матч не начался, выходим из функции

    const args = ctx.message.text.split(" ");
    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;

    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await ctx.reply("⛔ Нет активного матча!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    let team;
    if (teamIndex === playingTeams.teamIndex1) {
      team = playingTeams.team1;
    } else if (teamIndex === playingTeams.teamIndex2) {
      team = playingTeams.team2;
    } else {
      return ctx.reply("⛔ Команда не найдена!");
    }

    if (!team[playerIndex]) {
      return ctx.reply("⛔ Игрок не найден!");
    }

    if (team[playerIndex].goals && team[playerIndex].goals > 0) {
      team[playerIndex].goals -= 1;
    } else {
      return ctx.reply(`⚠️ У ${team[playerIndex].name} уже 0 голов.`);
    }

    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await ctx.reply(
      `⚽ Гол удалён у ${team[playerIndex].name}. Теперь у него ${team[playerIndex].goals} гол(ов).`
    );
    return deleteMessageAfterDelay(ctx, message.message_id);
  });

  // Обработчик нажатия кнопки "goal_<team>_<player>" для добавления гола
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
    const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч

    if (ctx.from.id !== ADMIN_ID) {
      // Проверяем, является ли отправитель администратором
      const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
      return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    } // Если матч не начался, выходим из функции

    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await ctx.reply("⛔ Нет активного матча!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    let team;
    if (teamIndex === playingTeams.teamIndex1) {
      team = playingTeams.team1;
    } else if (teamIndex === playingTeams.teamIndex2) {
      team = playingTeams.team2;
    } else {
      return ctx.answerCbQuery("⛔ Команда не найдена!");
    }

    if (!team[playerIndex]) {
      return ctx.answerCbQuery("⛔ Игрок не найден!");
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1; // Увеличиваем голы
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await ctx.reply(
      `⚽ Гол добавлен для ${team[playerIndex].name}! Теперь у него ${team[playerIndex].goals} гол(ов) в этом матче.`
    );
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
};
