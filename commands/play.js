
const { Markup } = require("telegraf");

const { buildPlayingTeamsMessage } = require("../message/buildPlayingTeamsMessage");
const { createTeamButtons } = require("../buttons/createTeamButtons");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
module.exports = (bot, GlobalState) => {
  // Обработка команды для начала игры
  bot.hears(/^play (\d+) (\d+)$/i, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
    const isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
    const teamIndex1 = parseInt(ctx.match[1], 10) - 1;
    const teamIndex2 = parseInt(ctx.match[2], 10) - 1;
    const teams = GlobalState.getTeams();

    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
			const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
			return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
		}

    if (!isMatchStarted) {
			const message = await ctx.reply("⚠️ Матч не начат!");
			return deleteMessageAfterDelay(ctx, message.message_id);
		} // Если матч не начался, выходим из функции

    if (!teams[teamIndex1] || !teams[teamIndex2]) {
      const message = await ctx.reply("⛔ Команды не найдены!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }
  
    // Очищаем голы перед каждым новым матчем
    const resetGoals = (team) => team.map(player => ({
      ...player,
      goals: 0, // Сбрасываем голы
    }));
  
    const team1 = resetGoals(teams[teamIndex1]);
    const team2 = resetGoals(teams[teamIndex2]);
  
    const teamsMessage = buildPlayingTeamsMessage(team1, team2, teamIndex1, teamIndex2);
  
    const sentMessage = await ctx.reply(teamsMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        ...createTeamButtons(team1, teamIndex1),
        ...createTeamButtons(team2, teamIndex2),
      ]).reply_markup,
    });
  
    // Сохраняем ID сообщения с играющими командами
    GlobalState.setPlayingTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
  
    // Сохраняем текущие играющие команды
    GlobalState.setPlayingTeams({
      team1,
      team2,
      teamIndex1,
      teamIndex2,
    });
  });
  
};