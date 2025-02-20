// Загружаем переменные окружения из файла .env
require("dotenv").config();
const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);
const { GlobalState } = require("./store");


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
function checkTimeAndNotify() {
  let collectionDate = GlobalState.getCollectionDate();
  let notificationSent = GlobalState.getNotificationSent();
  let isMatchStarted = GlobalState.getStart();
  
  if (!isMatchStarted || !collectionDate || notificationSent) return;

  const now = new Date();
  const timeDiff = collectionDate - now;

  if (timeDiff <= 0) {
    GlobalState.setStart(false)
    return;
  }

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  if (timeDiff <= THREE_HOURS_MS) {
    players.forEach(player => {
      sendPrivateMessage(
        bot.telegram, 
        player.id, 
        `⏰ <b>До начала матча осталось менее 3 часов!</b>\n\n` +
        `Не забудьте:\n` +
        `✅ Подготовить экипировку\n` +
        `✅ Оплатить участие\n` +
        `✅ Прийти за 15 минут до начала\n\n` +
        `📍 Место: ${location}\n` +
        `🕒 Время: ${collectionDate.toLocaleString("ru-RU", { 
          hour: "2-digit", 
          minute: "2-digit",
          day: "numeric",
          month: "long"
        })}`
      );
    });
    GlobalState.setNotificationSent(true)
  }
}


// Подключаем команду s из отдельного файла
require("./commands/startMatch")(bot, GlobalState);

// Команда p оплаты
require("./commands/pay")(bot, GlobalState);

// Команда l (limit) для изменения лимита игроков
require("./commands/limit")(bot, GlobalState);

// Обработка основных команд (добавление и удаление игроков)
require("./commands/add")(bot, GlobalState);

// Обработка inline-кнопки "Записаться на матч"
require("./commands/buttonAdd")(bot, GlobalState);


// Запуск бота
bot.launch();

// Установка интервала для проверки времени и отправки уведомлений
setInterval(checkTimeAndNotify, 60000);

// Логирование успешного запуска бота
console.log("Бот запущен!");

// s 10.03.2025 18:00