const { Markup } = require("telegraf");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { reshuffleArray } = require("../utils/reshuffleArray");
const { safeTelegramCall } = require("../utils/telegramUtils");
const { safeAnswerCallback } = require("../utils/safeAnswerCallback");


module.exports = (bot, GlobalState) => {
  bot.action("reshuffle_callback", async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const numTeams = GlobalState.getLastTeamCount();
    let players = [...GlobalState.getPlayers()];

    if (players.length < numTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Недостаточно игроков для создания команд!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
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
          reply_markup: (() => {
            const isTableAllowed = GlobalState.getIsTableAllowed();
            const buttons = [];
            if (isTableAllowed) {
              buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_callback")]);
            } else {
              buttons.push([Markup.button.callback("🎯 Выбрать команды для матча", "select_teams_blocked")]);
              buttons.push([Markup.button.callback("📢 Объявить составы", "announce_teams")]);
            }
            return Markup.inlineKeyboard(buttons).reply_markup;
          })(),
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