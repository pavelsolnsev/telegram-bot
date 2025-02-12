require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const GROUP_ID = Number(process.env.ID);

let players = [];
let queue = [];
let MAX_PLAYERS = 14;  // Начальный лимит
let collectionDate = null;  // Дата и время для сбора

const sendPlayerList = (ctx) => {
    let formattedList = '';

    if (collectionDate) {
        formattedList += `📅 <b>Сбор игроков:</b> ${collectionDate.toLocaleString()}\n\n`;
    }

    if (players.length > 0) {
        formattedList += `\n⚽ <b>В игре:</b>\n`;
        players.forEach((player, index) => {
            formattedList += `\n${index + 1}. ${player}`;
        });
        formattedList += `\n\n------------------------------\n`;
    }

    if (queue.length > 0) {
        formattedList += `\n📢 <b>Очередь игроков:</b>\n`;
        queue.forEach((player, index) => {
            formattedList += `\n${index + 1}. ${player}`;
        });
        formattedList += `\n\n------------------------------\n`;
    }

    formattedList += `\n📋 <b>Список игроков:</b> ${players.length} / ${MAX_PLAYERS}`;
    
    ctx.reply(formattedList, { parse_mode: 'HTML' });
};

const redistributePlayers = () => {
    // Если игроков в списке больше, чем лимит, перемещаем излишки в очередь
    while (players.length > MAX_PLAYERS) {
        const player = players.pop();
        queue.unshift(player);  // Перемещаем в начало очереди
    }

    // Если в очереди есть место, перемещаем игроков из очереди в список
    while (players.length < MAX_PLAYERS && queue.length > 0) {
        const player = queue.shift();  // Берем первого из очереди
        players.push(player);  // Добавляем в список игроков
    }
};

// Обработка команды /start с датой и временем
bot.command('start', (ctx) => {
    const userInput = ctx.message.text.trim().slice(7).trim(); // Получаем дату и время после команды /start

    if (userInput) {
        const dateRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;

        // Проверяем, что ввод соответствует формату даты и времени
        if (dateRegex.test(userInput)) {
            collectionDate = new Date(userInput.replace('.', '/'));  // Конвертируем дату в формат, который поддерживает JavaScript
            ctx.reply(`✅ Сбор игроков начнётся ${collectionDate.toLocaleString()}.`);
        } else {
            ctx.reply('⚠️ Неверный формат! Используй: /start ДД.ММ.ГГГГ ЧЧ:ММ');
        }
    } else {
        ctx.reply('⚠️ Укажи дату и время после команды /start (например, 12.02.2025 18:00).');
    }
});

bot.command('end', (ctx) => {
    if (!collectionDate) {
        ctx.reply('⚠️ Сбор еще не начался!');
        return;
    }

    players = [];
    queue = [];
    collectionDate = null;  // Сбрасываем дату сбора
    ctx.reply('❌ Сбор игроков завершен');
});

// Обработка команд /limit для изменения лимита
bot.command('limit', (ctx) => {
    const text = ctx.message.text.trim();
    const match = text.match(/^\/limit (\d+)$/); // Ищем число после /limit

    if (match) {
        const newLimit = Number(match[1]);
        
        // Проверяем, что лимит допустимый
        if ([1, 14, 21, 28].includes(newLimit)) {
            MAX_PLAYERS = newLimit;
            redistributePlayers();
            ctx.reply(`✅ Лимит игроков установлен на ${newLimit}. Игроки перераспределены!`);
            sendPlayerList(ctx);
        } else {
            ctx.reply('⚠️ Недопустимый лимит! Разрешенные значения: 1, 14, 21, 28.');
        }
    } else {
        ctx.reply('⚠️ Неверный формат команды! Используй: /limit <число> (например, /limit 14).');
    }
});

// Обработка ввода текстовых команд
bot.on('text', (ctx) => {
    if (!collectionDate) {
        return; // Если дата не установлена, команды дальше не обрабатываются
    }

    const chatId = ctx.chat.id;
    const text = ctx.message.text ? ctx.message.text.trim() : '';

    if (chatId !== GROUP_ID) return;

    const firstName = ctx.message.from.first_name || '';
    const lastName = ctx.message.from.last_name || '';
    const username = ctx.message.from.username ? `@${ctx.message.from.username}` : '';
    const basePlayer = `${firstName} ${lastName} ${username ? `(${username})` : ''}`.trim();

    if (text === '+') {
        if (players.includes(basePlayer) || queue.includes(basePlayer)) {
            ctx.reply('⚠️ Ты уже в списке или в очереди!');
            return;
        }

        if (players.length < MAX_PLAYERS) {
            players.push(basePlayer);
            ctx.reply(`✅ ${basePlayer} добавлен в список!`);
        } else {
            queue.push(basePlayer);
            ctx.reply(`⚠️ Список полон! ${basePlayer} добавлен в очередь.`);
        }
        sendPlayerList(ctx);
    } else if (text === '-') {
        if (players.includes(basePlayer)) {
            players = players.filter(p => p !== basePlayer);
            ctx.reply(`✅ ${basePlayer} удалён из списка!`);

            if (queue.length > 0) {
                const nextPlayer = queue.shift();
                players.push(nextPlayer);
                ctx.reply(`✅ ${nextPlayer} перемещён из очереди в список!`);
            }
        } else {
            ctx.reply('⚠️ Ты не в списке игроков!');
        }
        sendPlayerList(ctx);
    } else if (text.startsWith('+ ')) {
        const friend = text.slice(2).trim();
        if (!friend) {
            ctx.reply('⚠️ Укажи имя друга после `+`!');
            return;
        }
        if (players.includes(friend) || queue.includes(friend)) {
            ctx.reply(`⚠️ ${friend} уже в списке или в очереди!`);
            return;
        }

        const addedBy = `${firstName} ${lastName}`;
        const friendWithNote = `${friend} (Добавил: ${addedBy})`;

        if (players.length < MAX_PLAYERS) {
            players.push(friendWithNote);
            ctx.reply(`✅ ${friendWithNote} добавлен в список!`);
        } else {
            queue.push(friendWithNote);
            ctx.reply(`⚠️ Список полон! ${friendWithNote} добавлен в очередь.`);
        }
        sendPlayerList(ctx);
    } else if (text.startsWith('- ')) {
        const friend = text.slice(2).trim();
        if (!friend) {
            ctx.reply('⚠️ Укажи имя друга после `-`!');
            return;
        }

        const friendName = extractName(friend);

        if (players.some(p => extractName(p) === friendName)) {
            players = players.filter(p => extractName(p) !== friendName);
            ctx.reply(`✅ ${friendName} удалён из списка!`);
            if (queue.length > 0) {
                const nextPlayer = queue.shift();
                players.push(nextPlayer);
                ctx.reply(`✅ ${nextPlayer} перемещён из очереди в список!`);
            }
        } else if (queue.some(q => extractName(q) === friendName)) {
            queue = queue.filter(q => extractName(q) !== friendName);
            ctx.reply(`✅ ${friendName} удалён из очереди!`);
        } else {
            ctx.reply(`⚠️ ${friendName} не найден в списке игроков или очереди!`);
        }
        sendPlayerList(ctx);
    } else if (text === '/list') {
        sendPlayerList(ctx);
    } else if (text === '/clear') {
        players = [];
        queue = [];
        ctx.reply('🗑️ Список и очередь очищены!');
        sendPlayerList(ctx);
    } else {
        ctx.reply('⚠️ Неверная команда! Ты можешь добавлять себя через `+`, друга через `+ имя`, а удалять через `-` или `- имя`.');
    }
});

bot.launch();
console.log('Бот запущен!');
