const { Markup } = require("telegraf");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { reshuffleArray } = require("../utils/reshuffleArray");
const { divideIntoTeams } = require("../utils/divideIntoTeams");
module.exports = (bot, GlobalState) => {
  // Обработка нажатия кнопки "Перемешать состав"
  bot.action("reshuffle_callback", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

 	  if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
			const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
			return deleteMessageAfterDelay(ctx, message.message_id); 
		}

    const numTeams = GlobalState.getLastTeamCount();
    let players = [...GlobalState.getPlayers()];

    if (players.length < numTeams) {
      const message = await ctx.reply("⛔ Недостаточно игроков для создания команд!");
			return deleteMessageAfterDelay(ctx, message.message_id);
    }

    players = reshuffleArray(players);
    const teams = divideIntoTeams(players, numTeams);
    const teamsMessage = buildTeamsMessage(teams, "Составы команд (перемешаны)");

    await ctx.editMessageText(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback("Перемешать состав", "reshuffle_callback"),
      ]).reply_markup,
    });
    await ctx.answerCbQuery("Команды перемешаны!");
  });
};
