const { sendPlayerList } = require("../utils/sendPlayerList");
const getPlayerStats = require("../database/getPlayerStats");

module.exports = (bot, GlobalState) => {
  bot.action("join_match", async (ctx) => {
    let players = GlobalState.getPlayers();
    let queue = GlobalState.getQueue();
    let MAX_PLAYERS = GlobalState.getMaxPlayers();

    const user = {
      id: ctx.from.id,
      name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "),
      username: ctx.from.username ? `@${ctx.from.username}` : null,
      goals: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      rating: 0,
    };

    const [updatedUser] = await getPlayerStats([user]); // Получаем статистику для одного игрока

    const isInList = players.some((p) => p.id === updatedUser.id) || queue.some((p) => p.id === updatedUser.id);

    if (isInList) {
      await ctx.answerCbQuery("⚠️ Вы уже записаны!");
      return;
    }

    if (players.length < MAX_PLAYERS) {
      players.push(updatedUser);
      await ctx.answerCbQuery("✅ Вы добавлены в список!");
    } else {
      queue.push(updatedUser);
      await ctx.answerCbQuery("✅ Вы добавлены в очередь!");
    }

    await sendPlayerList(ctx);
  });
};