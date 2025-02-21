require("dotenv").config();
const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);
const { GlobalState } = require("./store");
const { checkTimeAndNotify } = require("./utils/checkTimeAndNotify"); 

// Подключаем обработчики команд из отдельных файлов
require("./commands/startMatch")(bot, GlobalState); // Команда s для начала матча
require("./commands/remove")(bot, GlobalState); // Команда r для удаления игроков из списка игроков
require("./commands/pay")(bot, GlobalState); // Команда p для оплаты
require("./commands/team")(bot, GlobalState); // деление команд
require("./commands/list")(bot, GlobalState); // Команда list для проверки списка
require("./commands/time")(bot, GlobalState); // Команда t для смены даты
require("./commands/end")(bot, GlobalState); // Команда e! для отмены матча
require("./commands/limit")(bot, GlobalState); // Команда l для изменения лимита игроков
require("./commands/add")(bot, GlobalState); // Добавление и удаление игроков
require("./commands/buttonAdd")(bot, GlobalState); // Обработка inline-кнопки "Записаться на матч"
// Запуск бота
bot.launch();

// Установка интервала проверки времени и отправки уведомлений (каждую минуту)
setInterval(() => checkTimeAndNotify(bot), 60000); // Передаем объект bot

// Логирование успешного запуска бота
console.log("Бот запущен!");
