const { GlobalState } = require("../store");
const { Markup } = require("telegraf");

const sendPlayerList = async (ctx) => {
  let collectionDate = GlobalState.getCollectionDate();
  let players = GlobalState.getPlayers();
  let queue = GlobalState.getQueue();
  let location = GlobalState.getLocation();
  let listMessageId = GlobalState.getListMessageId();

  let formattedList = "";

  // Форматирование даты
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

  // Информация о локации и оплате
  formattedList += `📍 <b>Локация:</b> ${location}\n\n`;
  formattedList += `💰 <b>400 ₽</b> — Услуги: мячи, вода, аптечка, манишки, фото и съёмка матча! 🎥⚽💧💊\n`;
  formattedList += `📲 <b>Перевод по номеру:</b> <code>89166986185</code>\n`;
  formattedList += `💳 <b>Карта:</b> <code>2212312412412412</code>\n`;
  formattedList += `💵 <b>Наличные:</b> Можно оплатить на месте.\n`;

  // Функция для форматирования имени игрока
  const formatPlayerName = (name, maxLength = 12) => {
    const cleanName = name.replace(/^@/, ""); // Убираем @
    return cleanName.length > maxLength ? cleanName.slice(0, maxLength - 3) + "..." : cleanName;
  };

  // Функция для форматирования рейтинга с фиксированной шириной
  const formatRating = (rating) => {
    const numericRating = parseFloat(rating) || 0;
    return numericRating.toFixed(2).padStart(5, " ");
  };

  // Форматирование строки игрока
  const formatPlayerLine = (index, name, rating, paid) => {
    const paidMark = paid ? " ✅" : "";
    const paddedIndex = (index + 1).toString().padStart(2, " ") + "."; // " 1.", "10."
    const paddedName = formatPlayerName(name).padEnd(12, " "); // Имя на 12 символов
    return `${paddedIndex} ${paddedName} - ⭐ ${formatRating(rating)}${paidMark}`;
  };

  // Список игроков "В игре" (сортировка по рейтингу)
  if (players.length > 0) {
    formattedList += `\n🏆 <b>В игре:</b>\n<code>`;
    const sortedPlayers = [...players].sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    sortedPlayers.forEach((player, index) => {
      const name = player.username ? player.username : player.name.split(" ")[0];
      formattedList += `${formatPlayerLine(index, name, player.rating, player.paid)}\n`;
    });
    formattedList += `</code>\n----------------------------------\n`;
  }

  // Список игроков в очереди (сортировка по рейтингу)
  if (queue.length > 0) {
    formattedList += `\n📢 <b>Очередь игроков:</b>\n<code>`;
    const sortedQueue = [...queue].sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    sortedQueue.forEach((player, index) => {
      const name = player.username ? player.username : player.name.split(" ")[0];
      formattedList += `${formatPlayerLine(index, name, player.rating, player.paid)}\n`;
    });
    formattedList += `</code>\n------------------------------\n`;
  }

  // Итоговая строка
  formattedList += `\n📋 <b>Список игроков:</b> ${players.length} / ${GlobalState.getMaxPlayers()}`;

  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("⚽ Играть", "join_match"),
  ]);

  try {
    if (listMessageId) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        listMessageId,
        null,
        formattedList,
        { parse_mode: "HTML", reply_markup: inlineKeyboard.reply_markup }
      );
    } else {
      const sentMessage = await ctx.reply(formattedList, {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      GlobalState.setListMessageId(sentMessage.message_id);
    }
  } catch (error) {
    if (error.description?.includes("message to edit not found")) {
      listMessageId = null;
      const sentMessage = await ctx.reply(formattedList, {
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