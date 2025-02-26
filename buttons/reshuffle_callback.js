const { Markup } = require("telegraf");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { reshuffleArray } = require("../utils/reshuffleArray");
const { divideIntoTeams } = require("../utils/divideIntoTeams");

module.exports = (bot, GlobalState) => {
  bot.action("reshuffle_callback", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const numTeams = GlobalState.getLastTeamCount();
    let players = [...GlobalState.getPlayers()]; // Свежая копия игроков

    if (players.length < numTeams) {
      const message = await ctx.reply("⛔ Недостаточно игроков для создания команд!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Перемешиваем игроков
    players = reshuffleArray(players);
    const newTeams = divideIntoTeams(players, numTeams);

    // Массив случайных символов (эмодзи)
    const randomSymbols = ["⚽", "🏀", "🏈", "🎾", "🏐", "🥅", "🎯"];
    const randomSymbol = randomSymbols[Math.floor(Math.random() * randomSymbols.length)];

    // Добавляем случайный символ в заголовок
    const teamsMessage = buildTeamsMessage(newTeams, `Составы команд (перемешаны) ${randomSymbol}`);

    try {
      await ctx.editMessageText(teamsMessage, {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback("Перемешать состав", "reshuffle_callback"),
        ]).reply_markup,
      });
      await ctx.answerCbQuery("Команды перемешаны!");
    } catch (error) {
      console.error("Ошибка при обновлении сообщения:", error);
      await ctx.answerCbQuery("Произошла ошибка при перемешивании!");
    }
  });
};