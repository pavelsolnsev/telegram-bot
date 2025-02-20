// Загружаем переменные окружения из файла .env
require("dotenv").config();

// Подключаем библиотеку Telegraf для работы с Telegram Bot API
const { Telegraf, Markup } = require("telegraf");

// Создаем экземпляр бота, используя токен из переменных окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Устанавливаем URL изображения по умолчанию, если оно не задано в переменных окружения
const IMAGE_URL = process.env.IMAGE_URL || "https://www.meme-arsenal.com/memes/a69b26bcf26d80f28a6422ebac425b5f.jpg";


const GlobalState = (() => {

  // Получаем ID группы и ID администратора из переменных окружения
  const ADMIN_ID = Number(process.env.ADMIN_ID);

  const GROUP_ID = Number(process.env.ID);

  // старт матча
  let isMatchStarted = false
  
  // Максимальное количество игроков
  let MAX_PLAYERS = 14

  // Массив для хранения игроков (объекты с id, именем и username)
  let players = [];

  // Массив для хранения игроков в очереди
  let queue = [];

  // Дата и время сбора на матч
  let collectionDate = null;

  // Переменная для отслеживания отправки уведомления о матче
  let notificationSent = false;

  // Переменная для хранения ID сообщения со списком игроков
  let listMessageId = null;
  
  const Store = {

    getAdminId: () => ADMIN_ID,

    getGroupId: () => GROUP_ID,

    getStart: () => isMatchStarted,
    setStart: status => isMatchStarted = status,

    getMaxPlayers: () => MAX_PLAYERS,
    setMaxPlayers: number => MAX_PLAYERS = number,

    getPlayers: () => players,
    setPlayers: array => players = array,

    getQueue: () => queue,
    setQueue: array => queue = array,
    
    getCollectionDate: () => collectionDate,
    setCollectionDate: status => collectionDate = status,

    getLocation: () => location,
    setLocation: string => location = string,
    
    getNotificationSent: () => notificationSent,
    setNotificationSent: status => notificationSent = status,

    getListMessageId: () => listMessageId,
    setListMessageId: status => listMessageId = status,
  }
  return Object.freeze(Store);
})();


// Функция для отправки приватных сообщений пользователям
const sendPrivateMessage = async (telegram, userId, message) => {
  try {
    await telegram.sendMessage(userId, message, { parse_mode: "HTML" });
  } catch (error) {
    if (error.response?.error_code === 403) {
      console.log(`Пользователь ${userId} заблокировал бота`);
    } else {
      console.error("Ошибка при отправке сообщения:", error);
    }
  }
};

// Функция для проверки времени и отправки уведомления о матче
// function checkTimeAndNotify() {
//   if (!GlobalState.getStart() || !collectionDate || notificationSent) return;

//   const now = new Date();
//   const timeDiff = collectionDate - now;

//   if (timeDiff <= 0) {
//     GlobalState.setStart(false)
//     return;
//   }

//   const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
//   if (timeDiff <= THREE_HOURS_MS) {
//     players.forEach(player => {
//       sendPrivateMessage(
//         bot.telegram, 
//         player.id, 
//         `⏰ <b>До начала матча осталось менее 3 часов!</b>\n\n` +
//         `Не забудьте:\n` +
//         `✅ Подготовить экипировку\n` +
//         `✅ Оплатить участие\n` +
//         `✅ Прийти за 15 минут до начала\n\n` +
//         `📍 Место: ${location}\n` +
//         `🕒 Время: ${collectionDate.toLocaleString("ru-RU", { 
//           hour: "2-digit", 
//           minute: "2-digit",
//           day: "numeric",
//           month: "long"
//         })}`
//       );
//     });
//     notificationSent = true;
//   }
// }

// Функция для формирования и отправки списка игроков
const sendPlayerList = async (ctx) => {
  let collectionDate = GlobalState.getCollectionDate();
  let players = GlobalState.getPlayers();
  let queue = GlobalState.getQueue();
  let location = GlobalState.setLocation('нету локации');
  let listMessageId = GlobalState.getListMessageId();
  let formattedList = "";
  
  if (collectionDate) {
    const options = { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", weekday: "long" };
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
      formattedList += `\n${index + 1}. ${player.name} ${player.username ? `(${player.username})` : ""}${player.paid ? " ✅" : ""}`;
    });
    formattedList += `\n\n------------------------------\n`;
  }

  if (queue.length > 0) {
    formattedList += `\n📢 <b>Очередь игроков:</b>\n`;
    queue.forEach((player, index) => {
      formattedList += `\n${index + 1}. ${player.name} ${player.username ? `(${player.username})` : ""}`;
    });
    formattedList += `\n\n------------------------------\n`;
  }

  formattedList += `\n📋 <b>Список игроков:</b> ${players.length} / ${GlobalState.getMaxPlayers()}`;

  const inlineKeyboard = Markup.inlineKeyboard([
    Markup.button.callback("⚽ Записаться на матч", "join_match"),
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
    if (error.description.includes('message to edit not found')) {
      listMessageId = null;
      const sentMessage = await ctx.replyWithPhoto(IMAGE_URL, {
        caption: formattedList,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      GlobalState.setListMessageId(sentMessage.message_id);
    } else {
      console.error("Ошибка при отправке списка:", error);
    }
  }
};

// Функция для проверки, является ли пользователь администратором

const isMatchActive = () => GlobalState.getStart();

// Подключаем команду s из отдельного файла
require("./commands/startMatch")(bot, GlobalState, sendPlayerList);

// Команда p оплаты
require("./commands/pay")(bot, GlobalState, sendPlayerList, isMatchActive);

// Команда l (limit) для изменения лимита игроков
require("./commands/limit")(bot, sendPlayerList, isMatchActive, GlobalState);

// Обработка основных команд (добавление и удаление игроков)
require("./commands/add")(bot, sendPlayerList, isMatchActive, GlobalState);

// Обработка inline-кнопки "Записаться на матч"
require("./commands/buttonAdd")(bot, sendPlayerList, GlobalState);


// Запуск бота
bot.launch();

// Установка интервала для проверки времени и отправки уведомлений
// setInterval(checkTimeAndNotify, 60000);

// Логирование успешного запуска бота
console.log("Бот запущен!");

// s 10.03.2025 18:00