// Загружаем переменные окружения из файла .env
require("dotenv").config();

// Подключаем библиотеку Telegraf для работы с Telegram Bot API
const { Telegraf } = require("telegraf");
// Создаем экземпляр бота, используя токен из переменных окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Получаем ID группы и ID администратора из переменных окружения
const GROUP_ID = Number(process.env.ID);
const ADMIN_ID = Number(process.env.ADMIN_ID);

let listMessageId = null; 

// Массив для хранения игроков, которые участвуют в игре
let players = [];

// Массив для хранения игроков, которые находятся в очереди
let queue = [];

// Максимальное количество игроков, по умолчанию 14
let MAX_PLAYERS = 14;

// Локация игры, по умолчанию не определена
let location = "Локация пока не определена";

// Дата и время сбора игроков, по умолчанию не установлены
let collectionDate = null;

const deleteMessageAfterDelay = (ctx, messageId, delay = 2000) => {
    setTimeout(() => {
        ctx.telegram.deleteMessage(ctx.chat.id, messageId).catch(() => {});
    }, delay);
};

// Функция для отправки списка игроков в чат
const sendPlayerList = async (ctx) => {
    let formattedList = "";
  
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
      const cleanedDate = date.replace(" г.", "");
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      formattedList += `🕒 <b>${capitalizedWeekday}, ${cleanedDate}, начало в ${time}</b>\n\n`;
    }
  
    formattedList += `📍 <b>Локация:</b> ${location}\n\n`;
    formattedList += `💰 <b>400 ₽</b> — Полный комплект услуг: вода, манишки, съёмка матча и аптечка! 🎥⚽💧💊\n`;
    formattedList += `📲 <b>Перевод по номеру:</b> <code>89166986185</code>\n`;
    formattedList += `💳 <b>Оплата на карту:</b> <code>2212 3124 1241 2412</code>\n`;
    formattedList += `💵 <b>Наличные:</b> Можно оплатить на месте.\n`;
  
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
  
    if (listMessageId) {
      await ctx.telegram.editMessageText(ctx.chat.id, listMessageId, null, formattedList, { parse_mode: "HTML" });
    } else {
      const sentMessage = await ctx.reply(formattedList, { parse_mode: "HTML" });
      listMessageId = sentMessage.message_id;
    }
};

// Функция для проверки, является ли пользователь администратором
const isAdmin = (ctx) => ctx.from.id === ADMIN_ID;

// Команда /start для установки даты и времени сбора игроков
bot.command("start", async (ctx) => {
    // Удаляем сообщение с командой /start
    await ctx.deleteMessage().catch(() => {});

    if (!isAdmin(ctx)) {
        const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
        return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const userInput = ctx.message.text.trim().slice(7).trim();
    if (/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(userInput)) {
        const [datePart, timePart] = userInput.split(" ");
        const [day, month, year] = datePart.split(".").map(Number);
        const [hours, minutes] = timePart.split(":").map(Number);
        collectionDate = new Date(year, month - 1, day, hours, minutes);
        if (isNaN(collectionDate.getTime())) {
            const message = await ctx.reply("⚠️ Неверный формат даты! Используй: /start ДД.ММ.ГГГГ ЧЧ:ММ");
            return deleteMessageAfterDelay(ctx, message.message_id);
        } else {
            // Очищаем список игроков и очередь при повторной команде /start
            players = [];
            queue = [];
            await sendPlayerList(ctx);
        }
    } else {
        const message = await ctx.reply("⚠️ Неверный формат! Используй: /start ДД.ММ.ГГГГ ЧЧ:ММ");
        deleteMessageAfterDelay(ctx, message.message_id);
    }
});

bot.command('r', async (ctx) => {
    // Удаляем сообщение с командой /r
    await ctx.deleteMessage().catch(() => {});

    // Проверяем, является ли пользователь администратором
    if (!isAdmin(ctx)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Проверяем, что команда выполнена в нужной группе
    const chatId = ctx.chat.id;
    if (chatId !== GROUP_ID) return;

    // Извлекаем имя друга из команды
    const match = ctx.message.text.match(/^\/r (.+)$/);
    if (match) {
        const friendName = match[1].trim(); // Имя друга, которое нужно удалить

        // Функция для поиска игрока по имени друга (без учета части "добавил: ...")
        const findPlayerByName = (name) => {
            return players.find(player => player.startsWith(name)) || queue.find(player => player.startsWith(name));
        };

        // Ищем игрока по имени
        const playerToRemove = findPlayerByName(friendName);

        if (playerToRemove) {
            // Удаляем игрока из списка или очереди
            players = players.filter(p => p !== playerToRemove);
            queue = queue.filter(p => p !== playerToRemove);

            // Если удалили из основного списка, добавляем первого из очереди в основной список
            if (players.length < MAX_PLAYERS && queue.length > 0) {
                players.push(queue.shift());
            }

            // Отправляем сообщение об успешном удалении
            const message = await ctx.reply(`✅ ${playerToRemove} удалён из списка!`);
            deleteMessageAfterDelay(ctx, message.message_id);

            // Обновляем список игроков
            await sendPlayerList(ctx);
        } else {
            // Если игрок не найден, отправляем сообщение об ошибке
            const message = await ctx.reply('⚠️ Этот игрок не в списке!');
            deleteMessageAfterDelay(ctx, message.message_id);
        }
    } else {
        // Если формат команды неверный, отправляем сообщение об ошибке
        const message = await ctx.reply('⚠️ Неверный формат команды! Используй: /r <имя друга>.');
        deleteMessageAfterDelay(ctx, message.message_id);
    }
});

bot.command('p', async (ctx) => {
    // Удаляем сообщение с командой /pay
    await ctx.deleteMessage().catch(() => {});

    // Проверяем, является ли пользователь администратором
    if (!isAdmin(ctx)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Получаем номер игрока из команды
    const match = ctx.message.text.match(/^\/p (\d+)$/);
    if (match) {
        const playerNumber = Number(match[1]);

        // Проверяем, что номер игрока корректен
        if (playerNumber <= 0 || playerNumber > players.length) {
            const message = await ctx.reply('⚠️ Неверный номер игрока!');
            return deleteMessageAfterDelay(ctx, message.message_id);
        }

        // Получаем игрока по номеру
        const playerIndex = playerNumber - 1;
        const playerName = players[playerIndex];

        // Удаляем возможные лишние символы ✅ (если они уже есть)
        const cleanedPlayerName = playerName.replace(/✅/g, '').trim();

        // Проверяем, не был ли игрок уже отмечен как оплативший
        if (!playerName.includes('✅')) {
            // Добавляем значок ✅ к имени игрока
            players[playerIndex] = `${cleanedPlayerName} ✅`;

            // Отправляем сообщение об успешной отметке оплаты
            const message = await ctx.reply(`✅ Игрок ${cleanedPlayerName} отмечен как оплативший игру!`);
            deleteMessageAfterDelay(ctx, message.message_id);

            // Обновляем список игроков
            await sendPlayerList(ctx);
        } else {
            // Если игрок уже отмечен как оплативший, отправляем сообщение об ошибке
            const message = await ctx.reply('⚠️ Этот игрок уже отмечен как оплативший!');
            deleteMessageAfterDelay(ctx, message.message_id);
        }
    } else {
        // Если формат команды неверный, отправляем сообщение об ошибке
        const message = await ctx.reply('⚠️ Неверный формат команды! Используй: /p <номер игрока>.');
        deleteMessageAfterDelay(ctx, message.message_id);
    }
});


bot.command('l', async (ctx) => {
    // Удаляем сообщение с командой /limit
    await ctx.deleteMessage().catch(() => {});

    // Проверяем, является ли пользователь администратором
    if (!isAdmin(ctx)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Получаем новое значение лимита из команды
    const match = ctx.message.text.match(/^\/l (\d+)$/);
    if (match) {
        const newLimit = Number(match[1]);

        // Проверяем, что лимит положительный
        if (newLimit <= 0) {
            const message = await ctx.reply('⚠️ Лимит должен быть положительным числом!');
            return deleteMessageAfterDelay(ctx, message.message_id);
        }

        // Если новый лимит меньше текущего, перемещаем лишних игроков в очередь
        if (newLimit < MAX_PLAYERS) {
            const playersToMove = players.slice(newLimit); // Игроки, которые не помещаются в новый лимит
            queue.unshift(...playersToMove); // Добавляем их в начало очереди
            players = players.slice(0, newLimit); // Оставляем только игроков, которые помещаются в новый лимит
        } else if (newLimit > MAX_PLAYERS) {
            // Если новый лимит больше текущего, перемещаем игроков из очереди в основной список
            const availableSlots = newLimit - players.length; // Свободные места в основном списке
            const playersToAdd = queue.splice(0, availableSlots); // Берем игроков из очереди
            players.push(...playersToAdd); // Добавляем их в основной список
        }

        MAX_PLAYERS = newLimit;

        // Отправляем сообщение об успешном изменении лимита
        const message = await ctx.reply(`✅ Лимит игроков установлен на ${MAX_PLAYERS}.`);
        deleteMessageAfterDelay(ctx, message.message_id);

        // Обновляем список игроков
        await sendPlayerList(ctx);
    } else {
        // Если формат команды неверный, отправляем сообщение об ошибке
        const message = await ctx.reply('⚠️ Неверный формат команды! Используй: /l <число>.');
        deleteMessageAfterDelay(ctx, message.message_id);
    }
});

// Обработка текстовых сообщений в группе
bot.on("text", async (ctx) => {
    if (!collectionDate) return;
    const chatId = ctx.chat.id;
    const text = ctx.message.text.trim();
    if (chatId !== GROUP_ID) return;
  
    const firstName = ctx.message.from.first_name || "";
    const lastName = ctx.message.from.last_name || "";
    const username = ctx.message.from.username ? `@${ctx.message.from.username}` : "";
    const basePlayer = `${firstName} ${lastName} ${username ? `(${username})` : ""}`.trim();
  
    if (text === "+") {
      if (!players.includes(basePlayer) && !queue.includes(basePlayer)) {
        players.length < MAX_PLAYERS ? players.push(basePlayer) : queue.push(basePlayer);
        const message = await ctx.reply(`✅ ${basePlayer} добавлен в ${players.length <= MAX_PLAYERS ? "список" : "очередь"}!`);
        deleteMessageAfterDelay(ctx, message.message_id);
        await sendPlayerList(ctx);
      } else {
        const message = await ctx.reply("⚠️ Ты уже в списке или в очереди!");
        deleteMessageAfterDelay(ctx, message.message_id);
      }
      // Удаляем сообщение с "+"
      deleteMessageAfterDelay(ctx, ctx.message.message_id);
    } else if (text === "-") {
      if (players.includes(basePlayer)) {
        players = players.filter((p) => p !== basePlayer);
        if (queue.length > 0) players.push(queue.shift());
        const message = await ctx.reply(`✅ ${basePlayer} удалён из списка!`);
        deleteMessageAfterDelay(ctx, message.message_id);
        await sendPlayerList(ctx);
      } else {
        const message = await ctx.reply("⚠️ Ты не в списке игроков!");
        deleteMessageAfterDelay(ctx, message.message_id);
      }
      // Удаляем сообщение с "-"
      deleteMessageAfterDelay(ctx, ctx.message.message_id);
    } else if (text === "/list") {
      await sendPlayerList(ctx);
    }
});

bot.command('end', async (ctx) => {
    // Удаляем сообщение с командой /end
    await ctx.deleteMessage().catch(() => {});

    // Проверяем, является ли пользователь администратором
    if (!isAdmin(ctx)) {
        const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
        return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Очищаем список игроков и очередь
    players = [];
    queue = [];
    collectionDate = null;

    // Отправляем сообщение о завершении набора
    const message = await ctx.reply("✅ Набор на игру завершён! Все списки очищены.");
    deleteMessageAfterDelay(ctx, message.message_id);

    // Обновляем сообщение со списком
    await sendPlayerList(ctx);
});


// Запуск бота
// /start 15.02.2025 18:00
bot.launch();
console.log("Бот запущен!");