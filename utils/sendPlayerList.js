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
  formattedList += `📍 <b>Место:</b> ${location || "Пока не выбрано 🌍"}\n`;
  formattedList += `💰 <b>400 ₽</b> (вода, съёмка, манишки, аптечка, музыка)\n`;
  formattedList += `💸 <b>Оплатить:</b>\n`;
  formattedList += `<code>📲 89166986185</code>\n`;
  formattedList += `<code>💳 2200700430851708</code>\n`;
  formattedList += `💵 Наличные — На месте\n`;
  formattedList += `\n📜 <b>Информация для игроков:</b>\n` +
  `- <b>Записаться:</b> Напишите "+" в чат группы или нажмите "⚽ Играть" под списком, чтобы попасть в список игроков или очередь.\n` +
  `- <b>Выйти:</b> Напишите "-", если передумали играть.\n` +
  `- <b>Список игроков:</b> Напишите "list" в ЛС боту, чтобы увидеть текущий список участников.\n` +
  `- <b>Таблица матча:</b> Напишите "table" в ЛС боту для просмотра таблицы результатов (после старта игры).\n` +
  `- <b>Рейтинг:</b> У каждого игрока есть рейтинг, который зависит от голов и результатов матчей. За гол +0.5, за победу +3, за ничью +1, за поражение -1.5. Уровни: ⭐ (0-9), 💫 (10-29), ✨ (30-59), 🌠 (60-99), 💎 (100-149), 🏆 (150+). Больше играете и забиваете — выше рейтинг!\n` +
  `- <b>Уведомления:</b> Нажмите "Старт" в личке у бота, чтобы получать уведомления и писать ему команды. Вы получите напоминание за 3 часа до матча и уведомление о переходе из очереди в основной список или обратно.\n` +
  `- <b>Оплата:</b> По возможности оплачиваете игру заранее, чтобы не тратить время на сборах. \n`;
  // Функция для форматирования имени игрока
  const formatPlayerName = (name, maxLength = 12) => {
    const cleanName = name.replace(/^@/, "");
    return cleanName.length > maxLength ? cleanName.slice(0, maxLength - 3) + "..." : cleanName;
  };

  // Форматирование строки игрока
  const formatPlayerLine = (index, name, rating, paid) => {
    const paidMark = paid ? " ✅" : "";
    const paddedIndex = (index + 1).toString().padStart(2, " ") + ".";
    const paddedName = formatPlayerName(name).padEnd(12, " ");
    const formattedRating = parseFloat(rating).toString();
    
    let ratingIcon;
    if (rating < 10) ratingIcon = "⭐";
    else if (rating < 30) ratingIcon = "💫";
    else if (rating < 60) ratingIcon = "✨";
    else if (rating < 100) ratingIcon = "🌠";
    else if (rating < 150) ratingIcon = "💎";
    else ratingIcon = "🏆";
    return `${paddedIndex}${paddedName} ${ratingIcon}${formattedRating}${paidMark}`;
  };

  // Список игроков "В игре"
  if (players.length > 0) {
    formattedList += `\n🏆 <b>В игре:</b>\n<code>`;
    players.forEach((player, index) => {
      const name = player.username ? player.username : player.name.split(" ")[0];
      formattedList += `${formatPlayerLine(index, name, player.rating, player.paid)}\n`;
    });
    formattedList += `</code>\n------------------------------\n`;
  }

  // Список игроков в очереди
  if (queue.length > 0) {
    formattedList += `\n📢 <b>Очередь игроков:</b>\n<code>`;
    queue.forEach((player, index) => {
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
      GlobalState.setListMessageChatId(ctx.chat.id);
    }
  } catch (error) {
    if (error.description?.includes("message to edit not found")) {
      listMessageId = null;
      const sentMessage = await ctx.reply(formattedList, {
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      GlobalState.setListMessageId(sentMessage.message_id);
      GlobalState.setListMessageChatId(ctx.chat.id);
    } else if (error.description?.includes("message is not modified")) {
      console.log("Сообщение не было изменено, пропускаем редактирование.");
    } else {
      console.error("Ошибка при отправке списка:", error);
    }
  }
};

module.exports = { sendPlayerList };