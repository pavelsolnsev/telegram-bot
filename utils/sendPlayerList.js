const { GlobalState } = require("../store");
const { Markup } = require("telegraf");

const sendPlayerList = async (ctx, chatId = null) => {
  let collectionDate = GlobalState.getCollectionDate();
  let players = GlobalState.getPlayers();
  let queue = GlobalState.getQueue();
  let listMessageId = GlobalState.getListMessageId();
  let listMessageChatId = GlobalState.getListMessageChatId() || chatId;
  let location = GlobalState.getLocation();

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
    formattedList += `🕒 <b>${
      weekday.charAt(0).toUpperCase() + weekday.slice(1)
    }, ${date.replace(" г.", "")}, ${time}</b>\n\n`;
  } else {
    formattedList += `🕒 <b>Дата и время сбора не указаны!</b>\n\n`;
  }

  // Информация о локации и оплате
  if (location === "kz") {
    formattedList += `🏟 <b>Адрес:</b> <a href="https://yandex.ru/maps/-/CHSQUT6x">Московская область, г. Раменское, ул. Воровского, д.4A (Красное Знамя)</a>\n`;
    formattedList += `📍 <b>Маршрут:</b> <a href="https://yandex.ru/maps/?mode=routes&rtext=~55.574202,38.205299&rtt=auto">Построить маршрут</a>\n`;
  } else {
    formattedList += `🏟 <b>Адрес:</b> <a href="https://yandex.ru/maps/-/CHfBZ-mH">Московская область, г. Раменское, ул. Махова, д.18. (Профилакторий)</a>\n`;
    formattedList += `📍 <b>Маршрут:</b> <a href="https://yandex.ru/maps/?mode=routes&rtext=~55.578414,38.219605&rtt=auto">Построить маршрут</a>\n`;
  }

  formattedList += `💰 <b>Стоимость: 400 ₽</b> (аренда поля, съёмка, манишки, мячи, аптечка, музыка, вода)\n`;
  formattedList += `💸 <b>Оплата:</b>\n`;
  formattedList += `- <b>Перевод Т-Банк</b> (Павел С.):\n`;
  formattedList += `  📱 <a href="tel:89166986185"><code>89166986185</code></a>\n`;
  formattedList += `  💳 <code>2200700430851708</code>\n`;
  formattedList += `  🔗 <a href="https://www.tbank.ru/cf/5jUDsBhRfBT">Оплатить участие</a>\n`;
  formattedList += `  ❗ <b>Укажите в комментарии к переводу ваш ник из списка на игру</b>\n`;
  formattedList += `- <b>Наличные:</b> На месте\n`;
  formattedList += `\n📜 <b>Информация для игроков:</b>\n` +
    `- <b>Записаться:</b> Напишите "+" или нажмите "⚽ Играть"\n` +
    `- <b>Выйти:</b> Напишите "-" или нажмите "🚶 Выйти"\n`;

  // Функция для форматирования имени игрока
  const formatPlayerName = (name, maxLength = 12) => {
    // Удаляем все эмодзи, используя более широкий диапазон Unicode
    const cleanName = name.replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu,
      ""
    ).trim();
    // Подсчитываем длину строки с учетом Unicode-символов
    const chars = Array.from(cleanName);
    if (chars.length <= maxLength) {
      return cleanName.padEnd(maxLength, " ");
    }
    // Обрезаем до maxLength - 3 и добавляем "...", сохраняя Unicode-символы
    return chars.slice(0, maxLength - 3).join("") + "...";
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
      const name = player.username ? player.username : player.name;
      formattedList += `${formatPlayerLine(
        index,
        name,
        player.rating,
        player.paid
      )}\n`;
    });
    formattedList += `</code>`;
  }

  // Список игроков в очереди
  if (queue.length > 0) {
    formattedList += `\n📢 <b>Очередь игроков:</b>\n<code>`;
    queue.forEach((player, index) => {
      const name = player.username ? player.username : player.name;
      formattedList += `${formatPlayerLine(
        index,
        name,
        player.rating,
        player.paid
      )}\n`;
    });
    formattedList += `</code>`;
  }

  // Итоговая строка
  formattedList += `\n📋 <b>Список игроков:</b> ${
    players.length
  } / ${GlobalState.getMaxPlayers()}`;

  const inlineKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("⚽ Играть", "join_match"),
      Markup.button.callback("🚶 Выйти", "leave_match")
    ]
  ]);

  const messageOptions = {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard.reply_markup,
    disable_web_page_preview: true,
  };

  try {
    if (listMessageId && listMessageChatId) {
      await ctx.telegram.editMessageText(
        listMessageChatId,
        listMessageId,
        null,
        formattedList,
        messageOptions
      );
    } else {
      const sentMessage = await ctx.telegram.sendMessage(
        listMessageChatId || ctx.chat.id,
        formattedList,
        messageOptions
      );
      GlobalState.setListMessageId(sentMessage.message_id);
      GlobalState.setListMessageChatId(sentMessage.chat.id);
    }
  } catch (error) {
    if (error.description?.includes("message to edit not found")) {
      const sentMessage = await ctx.telegram.sendMessage(
        listMessageChatId || ctx.chat.id,
        formattedList,
        messageOptions
      );
      GlobalState.setListMessageId(sentMessage.message_id);
      GlobalState.setListMessageChatId(sentMessage.chat.id);
    } else if (error.description?.includes("message is not modified")) {
      console.log("Сообщение не было изменено, пропускаем редактирование.");
    } else {
      console.error("Ошибка при отправке списка:", error);
    }
  }
};

module.exports = { sendPlayerList };