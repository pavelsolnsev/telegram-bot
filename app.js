require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
const GROUP_ID = Number(process.env.ID);
const ADMIN_ID = Number(process.env.ADMIN_ID);

let players = [];
let queue = [];
let MAX_PLAYERS = 14;
let collectionDate = null;

const sendPlayerList = (ctx) => {
    let formattedList = '';

    if (collectionDate) {
        const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        formattedList += `📅 <b>Сбор игроков:</b> ${collectionDate.toLocaleString('ru-RU', options)}\n\n`;
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

const isAdmin = (ctx) => ctx.from.id === ADMIN_ID;

bot.command('start', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');

    const userInput = ctx.message.text.trim().slice(7).trim();
    if (/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(userInput)) {
        collectionDate = new Date(userInput.replace('.', '/'));
        ctx.reply(`✅ Сбор игроков начнётся ${collectionDate.toLocaleString('ru-RU', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`);
    } else {
        ctx.reply('⚠️ Неверный формат! Используй: /start ДД.ММ.ГГГГ ЧЧ:ММ');
    }
});

bot.command('end', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');
    players = [];
    queue = [];
    collectionDate = null;
    ctx.reply('❌ Сбор игроков завершен');
});

bot.command('limit', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');
    const match = ctx.message.text.match(/^\/limit (\d+)$/);
    if (match && [1, 14, 21, 28].includes(Number(match[1]))) {
        MAX_PLAYERS = Number(match[1]);
        ctx.reply(`✅ Лимит игроков установлен на ${MAX_PLAYERS}.`);
    } else {
        ctx.reply('⚠️ Недопустимый лимит! Разрешенные значения: 1, 14, 21, 28.');
    }
});

bot.command('remove', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');
    const match = ctx.message.text.match(/^\/remove (.+)$/);
    if (match) {
        const playerName = match[1].trim();
        players = players.filter(p => p !== playerName);
        queue = queue.filter(p => p !== playerName);
        ctx.reply(`✅ ${playerName} удалён из списка!`);
        sendPlayerList(ctx);
    } else {
        ctx.reply('⚠️ Неверный формат команды! Используй: /remove <имя игрока>.');
    }
});

bot.command('clear', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');
    players = [];
    queue = [];
    ctx.reply('🗑️ Список и очередь очищены!');
    sendPlayerList(ctx);
});

bot.on('text', (ctx) => {
    if (!collectionDate) return;
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    if (chatId !== GROUP_ID) return;

    const firstName = ctx.message.from.first_name || '';
    const lastName = ctx.message.from.last_name || '';
    const username = ctx.message.from.username ? `@${ctx.message.from.username}` : '';
    const basePlayer = `${firstName} ${lastName} ${username ? `(${username})` : ''}`.trim();

    if (text === '+') {
        if (!players.includes(basePlayer) && !queue.includes(basePlayer)) {
            players.length < MAX_PLAYERS ? players.push(basePlayer) : queue.push(basePlayer);
            ctx.reply(`✅ ${basePlayer} добавлен в ${players.length <= MAX_PLAYERS ? 'список' : 'очередь'}!`);
            sendPlayerList(ctx);
        } else {
            ctx.reply('⚠️ Ты уже в списке или в очереди!');
        }
    } else if (text === '-') {
        if (players.includes(basePlayer)) {
            players = players.filter(p => p !== basePlayer);
            if (queue.length > 0) players.push(queue.shift());
            ctx.reply(`✅ ${basePlayer} удалён из списка!`);
            sendPlayerList(ctx);
        } else {
            ctx.reply('⚠️ Ты не в списке игроков!');
        }
    } else if (text === '/list') {
        sendPlayerList(ctx);
    }
});

bot.launch();
console.log('Бот запущен!');