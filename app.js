require("dotenv").config();
const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);
const { GlobalState } = require("./store");
const { checkTimeAndNotify } = require("./utils/checkTimeAndNotify");

function sendLogToTelegram(bot, adminId, message) {
	bot.telegram.sendMessage(adminId, `🖥 Лог:\n${message}`);
}
const originalConsoleLog = console.log;

console.log = function (...args) {
		const ADMIN_ID = GlobalState.getAdminId();
    const message = args.map(arg => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg))).join(" ");
    originalConsoleLog.apply(console, args); // Сохраняем вывод в консоли
    sendLogToTelegram(bot, ADMIN_ID, message); // Отправляем в Телеграм
};


// Подключаем обработчики команд из отдельных файлов
require("./commands/startMatch")(bot, GlobalState); // Команда s для начала матча
require("./commands/remove")(bot, GlobalState); // Команда r для удаления игроков из списка игроков
require("./commands/pay")(bot, GlobalState); // Команда p для оплаты
require("./commands/team")(bot, GlobalState); // деление команд
require("./commands/play")(bot, GlobalState); // начать матч
require("./commands/goal")(bot, GlobalState); // отметить гол
require("./commands/finish")(bot, GlobalState); // закончить матч
require("./commands/list")(bot, GlobalState); // Команда list для проверки списка
require("./commands/time")(bot, GlobalState); // Команда t для смены даты
require("./commands/end")(bot, GlobalState); // Команда e! для отмены матча
require("./commands/limit")(bot, GlobalState); // Команда l для изменения лимита игроков
require("./commands/add")(bot, GlobalState); // Добавление и удаление игроков
require("./buttons/reshuffle_callback")(bot, GlobalState); // Обработка inline-кнопки "Перемешать составы"
// Запуск бота
bot.launch();

// Установка интервала проверки времени и отправки уведомлений (каждую минуту)
setInterval(() => checkTimeAndNotify(bot), 60000); // Передаем объект bot

// Логирование успешного запуска бота
console.log("Бот запущен!");
