// Импорт глобального состояния и модуля для создания клавиатуры
const { GlobalState } = require("../store");
const { Markup } = require("telegraf");

// Функция для формирования и отправки списка игроков
const sendPlayerList = async (ctx) => {
  let collectionDate = GlobalState.getCollectionDate(); // Получаем дату сбора
  let players = GlobalState.getPlayers(); // Получаем список игроков
  let queue = GlobalState.getQueue(); // Получаем очередь игроков
  let location = GlobalState.getLocation(); // Устанавливаем локацию (заглушка)
  let listMessageId = GlobalState.getListMessageId(); // Получаем ID сообщения со списком игроков
  const IMAGE_URL = GlobalState.getIMAGE_URL(); // Получаем URL изображения

  let formattedList = "";

  // Форматируем дату и время сбора
  if (collectionDate) {
    const options = { 
      year: "numeric", 
      month: "numeric", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit", 
      weekday: "long" 
    };
    const formattedDate = collectionDate.toLocaleString("ru-RU", options);
    const [weekday, date, time] = formattedDate.split(", ");
    formattedList += `🕒 <b>${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${date.replace(" г.", "")}, ${time}</b>\n\n`;
  } else {
    formattedList += `🕒 <b>Дата и время сбора не указаны!</b>\n\n`;
  }

  // Добавляем информацию о локации и оплате
  formattedList += `📍 <b>Локация:</b> ${location}\n\n`;
  formattedList += `💰 <b>400 ₽</b> — Услуги: мячи, вода, аптечка, манишки, фото и съёмка матча! 🎥⚽💧💊\n`;
  formattedList += `📲 <b>Перевод по номеру:</b> <code>89166986185</code>\n`;
  formattedList += `💳 <b>Карта:</b> <code>2212312412412412</code>\n`;
  formattedList += `💵 <b>Наличные:</b> Можно оплатить на месте.\n`;

  // Добавляем список записанных игроков
  if (players.length > 0) {
    formattedList += `\n⚽ <b>В игре:</b>\n`;
    players.forEach((player, index) => {
      formattedList += `\n${index + 1}. ${player.name} ${player.username ? `(${player.username})` : ""}${player.paid ? " ✅" : ""}`;
    });
    formattedList += `\n\n------------------------------\n`;
  }

  // Добавляем список очереди (если есть)
  if (queue.length > 0) {
    formattedList += `\n📢 <b>Очередь игроков:</b>\n`;
    queue.forEach((player, index) => {
      formattedList += `\n${index + 1}. ${player.name} ${player.username ? `(${player.username})` : ""}`;
    });
    formattedList += `\n\n------------------------------\n`;
  }

  // Добавляем общее количество записанных игроков
  formattedList += `\n📋 <b>Список игроков:</b> ${players.length} / ${GlobalState.getMaxPlayers()}`;

  // Создаем инлайн-клавиатуру с кнопкой записи на матч
  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("⚽ Записаться на матч", "join_match"),
  ]);

  try {
    if (listMessageId) {
      // Если сообщение уже существует, обновляем его
      await ctx.telegram.editMessageCaption(
        ctx.chat.id,
        listMessageId,
        null,
        formattedList,
        { parse_mode: "HTML", reply_markup: inlineKeyboard.reply_markup }
      );
    } else {
      // Если сообщение еще не было отправлено, отправляем новое
      const sentMessage = await ctx.replyWithPhoto(IMAGE_URL, {
        caption: formattedList,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      GlobalState.setListMessageId(sentMessage.message_id); // Сохраняем ID нового сообщения
    }
  } catch (error) {
    if (error.description.includes('message to edit not found')) {
      // Если сообщение не найдено, отправляем новое и обновляем ID
      listMessageId = null;
      const sentMessage = await ctx.replyWithPhoto(IMAGE_URL, {
        caption: formattedList,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      GlobalState.setListMessageId(sentMessage.message_id);
    } else {
      console.error("Ошибка при отправке списка:", error); // Логируем ошибки
    }
  }
};

module.exports = { sendPlayerList };
