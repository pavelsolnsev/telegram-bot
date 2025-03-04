const { Markup } = require("telegraf");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { reshuffleArray } = require("../utils/reshuffleArray");
const { safeTelegramCall } = require("../utils/telegramUtils");

// Функция для безопасного ответа на callback-запрос
const safeAnswerCallback = async (ctx, text) => {
  try {
    await ctx.answerCbQuery(text);
  } catch (error) {
    if (error.code === 400 && error.description.includes("query is too old")) {
      console.log("Callback query устарел, пропускаем ответ:", text);
    } else {
      console.error("Ошибка при ответе на callback:", error);
    }
  }
};

module.exports = (bot, GlobalState) => {
  bot.action("reshuffle_callback", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

    if (ctx.from.id !== ADMIN_ID) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const numTeams = GlobalState.getLastTeamCount();
    let players = [...GlobalState.getPlayers()];

    if (players.length < numTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Недостаточно игроков для создания команд!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Перемешиваем игроков случайным образом
    players = reshuffleArray(players);

    // Распределяем игроков по командам случайным образом
    const teams = Array.from({ length: numTeams }, () => []);
    players.forEach((player, index) => {
      teams[index % numTeams].push(player);
    });

    GlobalState.setTeams(teams);

    const randomSymbols = ["⚽", "🏀", "🏈", "🎾", "🏐", "🥅", "🎯"];
    const randomSymbol = randomSymbols[Math.floor(Math.random() * randomSymbols.length)];

    const teamsMessage = buildTeamsMessage(teams, `Составы команд (перемешаны) ${randomSymbol}`);

    // Сначала отвечаем на callback, чтобы избежать устаревания
    await safeAnswerCallback(ctx, "Команды перемешаны!");

    try {
      // Получаем ID сообщения из callback_query
      const messageId = ctx.callbackQuery.message.message_id;
      await safeTelegramCall(ctx, "editMessageText", [
        ctx.chat.id,
        messageId,
        null,
        teamsMessage,
        {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard([
            Markup.button.callback("Перемешать состав", "reshuffle_callback"),
          ]).reply_markup,
        },
      ]);
    } catch (error) {
      console.error("Ошибка при обновлении сообщения:", error);
      await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Произошла ошибка при обновлении сообщения!",
      ]);
    }
  });
};