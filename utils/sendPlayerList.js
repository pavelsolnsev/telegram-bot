const { GlobalState } = require("../store");
const { Markup } = require("telegraf");

const sendPlayerList = async (ctx) => {
  let collectionDate = GlobalState.getCollectionDate();
  let players = GlobalState.getPlayers();
  let queue = GlobalState.getQueue();
  let location = GlobalState.getLocation();
  let listMessageId = GlobalState.getListMessageId();
  const IMAGE_URL = GlobalState.getIMAGE_URL();

  let formattedList = "";

  if (collectionDate) {
    const options = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
    };
    const formattedDate = collectionDate.toLocaleString("ru-RU", options);
    const [weekday, date, time] = formattedDate.split(", ");
    formattedList += `🕒 <b>${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${date.replace(" г.", "")}, ${time}</b>\n\n`;
  } else {
    formattedList += `🕒 <b>Дата и время сбора не указаны!</b>\n\n`;
  }

  formattedList += `📍 <b>Локация:</b> ${location}\n\n`;
  formattedList += `💰 <b>400 ₽</b> — Услуги: мячи, вода, аптечка, манишки, фото и съёмка матча! 🎥⚽💧💊\n`;
  formattedList += `📲 <b>Перевод по номеру:</b> <code>89166986185</code>\n`;
  formattedList += `💳 <b>Карта:</b> <code>2212312412412412</code>\n`;
  formattedList += `💵 <b>Наличные:</b> Можно оплатить на месте.\n`;

  if (players.length > 0) {
    formattedList += `\n⚽ <b>В игре:</b>\n`;
    players.forEach((player, index) => {
      const paidMark = player.paid ? " ✅" : "";
      if (player.username) {
        // Убираем @ из username, если он там есть
        const cleanUsername = player.username.replace(/^@/, "");
        formattedList += `\n${index + 1}. ${cleanUsername} ⭐${player.rating || 0} ${paidMark}`;
      } else {
        formattedList += `\n${index + 1}. ${player.name.split(" ")[0]} ⭐${player.rating || 0} ${paidMark}`;
      }
    });
    formattedList += `\n\n------------------------------\n`;
  }
  
  if (queue.length > 0) {
    formattedList += `\n📢 <b>Очередь игроков:</b>\n`;
    queue.forEach((player, index) => {
      const paidMark = player.paid ? " ✅" : "";
      if (player.username) {
        // Убираем @ из username, если он там есть
        const cleanUsername = player.username.replace(/^@/, "");
        formattedList += `\n${index + 1}. ${cleanUsername} ⭐${player.rating || 0} ${paidMark}`;
      } else {
        formattedList += `\n${index + 1}. ${player.name.split(" ")[0]} ⭐${player.rating || 0} ${paidMark}`;
      }
    });
    formattedList += `\n\n------------------------------\n`;
  }

  formattedList += `\n📋 <b>Список игроков:</b> ${players.length} / ${GlobalState.getMaxPlayers()}`;

  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("⚽ Играть", "join_match"),
  ]);

  try {
    if (listMessageId) {
      await ctx.telegram.editMessageCaption(
        ctx.chat.id,
        listMessageId,
        null,
        formattedList,
        { parse_mode: "HTML", reply_markup: inlineKeyboard.reply_markup }
      );
    } else {
      const sentMessage = await ctx.replyWithPhoto(IMAGE_URL, {
        caption: formattedList,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      GlobalState.setListMessageId(sentMessage.message_id);
    }
  } catch (error) {
    if (error.description?.includes("message to edit not found")) {
      listMessageId = null;
      const sentMessage = await ctx.replyWithPhoto(IMAGE_URL, {
        caption: formattedList,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      GlobalState.setListMessageId(sentMessage.message_id);
    } else if (error.description?.includes("message is not modified")) {
      console.log("Сообщение не было изменено, пропускаем редактирование.");
    } else {
      console.error("Ошибка при отправке списка:", error);
    }
  }
};

module.exports = { sendPlayerList };