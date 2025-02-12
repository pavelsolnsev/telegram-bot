require('dotenv').config(); // Загружаем переменные окружения из .env
const { Telegraf } = require('telegraf'); // Импортируем Telegraf

const bot = new Telegraf(process.env.BOT_TOKEN); // Создаём бота с токеном из переменных окружения
const GROUP_ID = Number(process.env.ID); // Получаем ID группы из переменных окружения и приводим к числу

let players = []; // Список игроков

// Функция для отправки списка игроков
const sendPlayerList = (ctx) => {
    if (players.length > 0) {
        ctx.reply(`📋 Список игроков:\n` + players.join('\n'));
    } else {
        ctx.reply('❌ Список пуст.');
    }
};

// Команда для получения ID чата
bot.command('id', (ctx) => {
    ctx.reply(`ID этого чата: ${ctx.chat.id}`); // Отправляем ID текущего чата
});

// Обработчик текстовых сообщений
bot.on('text', (ctx) => {
    const chatId = ctx.chat.id; // Получаем ID чата, из которого пришло сообщение
    const text = ctx.message.text ? ctx.message.text.trim() : ''; // Получаем и очищаем текст сообщения

    if (chatId !== GROUP_ID) return; // Игнорируем сообщения, если они не из нужной группы

    if (text.startsWith('+')) { // Проверяем, начинается ли сообщение с "+"
        const username = ctx.message.from.username ? `@${ctx.message.from.username}` : ctx.message.from.first_name; // Получаем никнейм или имя пользователя
        if (username) {
            players.push(username); // Добавляем пользователя в список
            ctx.reply(`✅ ${username} добавлен в список!`); // Отправляем подтверждение
            sendPlayerList(ctx); // Отправляем обновлённый список игроков
        } else {
            ctx.reply('⚠️ Не удалось получить имя пользователя. Попробуйте снова.'); // Сообщаем об ошибке
        }
    } else if (text === '/list') { // Проверяем, отправлена ли команда /list
        sendPlayerList(ctx); // Отправляем список игроков
    } else if (text === '/clear') { // Проверяем, отправлена ли команда /clear
        players = []; // Очищаем список игроков
        ctx.reply('🗑️ Список очищен!'); // Подтверждаем очистку
        sendPlayerList(ctx); // Отправляем пустой список
    }
});

bot.launch(); // Запускаем бота
console.log('Бот запущен!'); // Логируем запуск
