const { Markup } = require("telegraf");
const { GlobalState } = require("../store");
// Функция отправки сообщения с составами команд
const sendTeamsMessage = async (ctx, message) => {


  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("Перемешать состав", "reshuffle_callback"),
  ]);

  const sentMessage = await ctx.reply(message, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard.reply_markup,
  });

  GlobalState.setLastTeamsMessageId(sentMessage.chat.id, sentMessage.message_id);
};

module.exports = { sendTeamsMessage };  