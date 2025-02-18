// Загружаем переменные окружения из файла .env
require("dotenv").config();

// Подключаем библиотеку Telegraf для работы с Telegram Bot API
const { Telegraf, Markup } = require("telegraf");

// Создаем экземпляр бота, используя токен из переменных окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Получаем ID группы и ID администратора из переменных окружения
const GROUP_ID = Number(process.env.ID);
const ADMIN_ID = Number(process.env.ADMIN_ID);

// Устанавливаем URL изображения по умолчанию, если оно не задано в переменных окружения
const IMAGE_URL = process.env.IMAGE_URL || "https://www.meme-arsenal.com/memes/a69b26bcf26d80f28a6422ebac425b5f.jpg";

// Переменная для хранения ID сообщения со списком игроков
let listMessageId = null;

// Переменная для отслеживания отправки уведомления о матче
let notificationSent = false;

// Массив для хранения игроков (объекты с id, именем и username)
let players = [];

// Массив для хранения игроков в очереди
let queue = [];

// Максимальное количество игроков
let MAX_PLAYERS = 14;

// Локация матча (по умолчанию не определена)
let location = "Локация пока не определена";

// Дата и время сбора на матч
let collectionDate = null;

// Флаг, указывающий, начат ли матч
let isMatchStarted = false;

// Функция для удаления сообщений с задержкой
const deleteMessageAfterDelay = (ctx, messageId, delay = 2000) => {
  setTimeout(() => {
    ctx.telegram.deleteMessage(ctx.chat.id, messageId).catch(() => {});
  }, delay);
};

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
  if (!isMatchStarted || !collectionDate || notificationSent) return;

  const now = new Date();
  const timeDiff = collectionDate - now;

  if (timeDiff <= 0) {
    isMatchStarted = false;
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
    notificationSent = true;
  }
}

// Функция для формирования и отправки списка игроков
const sendPlayerList = async (ctx) => {
  let formattedList = "";

  if (collectionDate) {
    const options = { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", weekday: "long" };
    const formattedDate = collectionDate.toLocaleString("ru-RU", options);
    const [weekday, date, time] = formattedDate.split(", ");
    formattedList += `🕒 <b>${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${date.replace(" г.", "")}, ${time}</b>\n\n`;
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

  formattedList += `\n📋 <b>Список игроков:</b> ${players.length} / ${MAX_PLAYERS}`;

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
      listMessageId = sentMessage.message_id;
    }
  } catch (error) {
    if (error.description.includes('message to edit not found')) {
      listMessageId = null;
      const sentMessage = await ctx.replyWithPhoto(IMAGE_URL, {
        caption: formattedList,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      listMessageId = sentMessage.message_id;
    } else {
      console.error("Ошибка при отправке списка:", error);
    }
  }
};

// Функция для проверки, является ли пользователь администратором
const isAdmin = (ctx) => ctx.from.id === ADMIN_ID;

// Функция для проверки, активен ли матч
const isMatchActive = () => isMatchStarted;

// Команда для запуска матча (формат: s ДД.ММ.ГГГГ ЧЧ:ММ)
bot.hears(/^s \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ Нет прав!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  
  const [, datePart, timePart] = ctx.message.text.match(/(\d{2}\.\d{2}\.\d{4}) (\d{2}:\d{2})/);
  const [day, month, year] = datePart.split(".").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  
  collectionDate = new Date(year, month - 1, day, hours, minutes);
  if (isNaN(collectionDate)) {
    const message = await ctx.reply("⚠️ Неверный формат даты!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }

  players = [];
  queue = [];
  isMatchStarted = true;
  await sendPlayerList(ctx);
  
  if (listMessageId) {
    try {
      await ctx.telegram.pinChatMessage(ctx.chat.id, listMessageId);
    } catch (error) {
      console.error("Ошибка закрепления:", error);
    }
  }

  notificationSent = false;
});


// Команда l (limit) для изменения лимита игроков
bot.hears(/^l \d+$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  if (!isMatchActive(ctx)) return; // Проверяем, запущен ли матч
  const newLimit = Number(ctx.message.text.trim().slice(2).trim());
  if (newLimit <= 0) {
    const message = await ctx.reply(
      "⚠️ Лимит должен быть положительным числом!"
    );
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  if (newLimit < MAX_PLAYERS) {
    const playersToMove = players.slice(newLimit);
    queue.unshift(...playersToMove);
    players = players.slice(0, newLimit);
  } else if (newLimit > MAX_PLAYERS) {
    const availableSlots = newLimit - players.length;
    const playersToAdd = queue.splice(0, availableSlots);
    players.push(...playersToAdd);
  }
  MAX_PLAYERS = newLimit;
  const message = await ctx.reply(
    `✅ Лимит игроков установлен на ${MAX_PLAYERS}.`
  );
  deleteMessageAfterDelay(ctx, message.message_id);
  await sendPlayerList(ctx);
});


// Команда p (pay) для отметки оплаты игрока
bot.hears(/^p \d+$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isMatchActive(ctx)) return; // Проверяем, запущен ли матч
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  const playerNumber = Number(ctx.message.text.trim().slice(2).trim());
  if (playerNumber <= 0 || playerNumber > players.length) {
    const message = await ctx.reply("⚠️ Неверный номер игрока!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  const playerIndex = playerNumber - 1;
  const player = players[playerIndex];
  if (!player.paid) {
    player.paid = true;
    await sendPlayerList(ctx);
  }
});

// Команда u (unpay) для снятия отметки оплаты у игрока
bot.hears(/^u \d+$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  if (!isMatchActive(ctx)) return; // Проверяем, запущен ли матч
  const playerNumber = Number(ctx.message.text.trim().slice(2).trim());
  if (playerNumber <= 0 || playerNumber > players.length) {
    const message = await ctx.reply("⚠️ Неверный номер игрока!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  const playerIndex = playerNumber - 1;
  const player = players[playerIndex];
  if (player.paid) {
    player.paid = false; 
    await sendPlayerList(ctx);
  }
});

// Команда r (rm) для удаления игрока по номеру
bot.hears(/^r \d+$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  if (!isMatchActive(ctx)) return; // Проверяем, запущен ли матч
  const playerNumber = Number(ctx.message.text.trim().slice(2).trim());
  if (playerNumber <= 0 || playerNumber > players.length) {
    const message = await ctx.reply("⚠️ Неверный номер игрока!");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  const playerIndex = playerNumber - 1;
  const playerName = players[playerIndex];
  players.splice(playerIndex, 1);
  if (queue.length > 0) {
    players.push(queue.shift());
  }
  const message = await ctx.reply(`✅ Игрок ${playerName.name} удалён из списка!`);
  deleteMessageAfterDelay(ctx, message.message_id);
  await sendPlayerList(ctx);
});


// Команда l (limit) для изменения лимита игроков
bot.hears(/^l \d+$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  if (!isMatchActive(ctx)) return; // Проверяем, запущен ли матч
  const newLimit = Number(ctx.message.text.trim().slice(2).trim());
  if (newLimit <= 0) {
    const message = await ctx.reply(
      "⚠️ Лимит должен быть положительным числом!"
    );
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  if (newLimit < MAX_PLAYERS) {
    const playersToMove = players.slice(newLimit);
    queue.unshift(...playersToMove);
    players = players.slice(0, newLimit);
  } else if (newLimit > MAX_PLAYERS) {
    const availableSlots = newLimit - players.length;
    const playersToAdd = queue.splice(0, availableSlots);
    players.push(...playersToAdd);
  }
  MAX_PLAYERS = newLimit;
  const message = await ctx.reply(
    `✅ Лимит игроков установлен на ${MAX_PLAYERS}.`
  );
  deleteMessageAfterDelay(ctx, message.message_id);
  await sendPlayerList(ctx);
});

// Команда для изменения времени тренировки (t ДД.ММ.ГГГГ ЧЧ:ММ)
bot.hears(/^t \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/i, async (ctx) => {
  // Удаляем сообщение с командой
  await ctx.deleteMessage().catch(() => {});

  // Проверяем, является ли пользователь администратором
  if (!isAdmin(ctx)) return;

  // Получаем введенное время
  const userInput = ctx.message.text.trim().slice(2).trim(); // Убираем "t "
  const [datePart, timePart] = userInput.split(" ");
  const [day, month, year] = datePart.split(".").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  // Создаем новую дату
  const newDate = new Date(year, month - 1, day, hours, minutes);

  // Проверяем, что дата корректна
  if (isNaN(newDate.getTime())) {
      const message = await ctx.reply("⚠️ Неверный формат даты! Используй: t ДД.ММ.ГГГГ ЧЧ:ММ");
      return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
  }

  // Обновляем время тренировки
  collectionDate = newDate;

  // Отправляем уведомление об успешном изменении времени
  const message = await ctx.reply(`✅ Время тренировки изменено на: ${userInput}`);
  deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд

  // Обновляем список игроков
  await sendPlayerList(ctx);
});

bot.hears(/^list$/i, async (ctx) => {
  // Удаляем команду `list`
  await ctx.deleteMessage().catch(() => {});

  if (!isMatchActive(ctx)) {
    const message = await ctx.reply("⚠️ Список игроков ещё не создан.");
    return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
  }

  if (!listMessageId) {
      const message = await ctx.reply("⚠️ Список игроков ещё не создан.");
      return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
  }

  try {
      // Прокручиваем чат до закрепленного сообщения
      const sentMessage = await ctx.telegram.forwardMessage(ctx.chat.id, ctx.chat.id, listMessageId);

      // Удаляем сообщение со списком через 5 секунд
      deleteMessageAfterDelay(ctx, sentMessage.message_id, 10000);
  } catch (error) {
      console.error("Ошибка при прокрутке к закрепленному сообщению:", error);
      const message = await ctx.reply("⚠️ Не удалось найти закрепленное сообщение.");
      deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
  }
});

// Команда для завершения сбора и обнуления данных (формат: e!)
bot.hears(/^e!$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  if (!isMatchActive(ctx)) return; // Проверяем, запущен ли матч
  if (listMessageId) {
    await ctx.telegram
      .deleteMessage(ctx.chat.id, listMessageId)
      .catch(() => {});
    listMessageId = null;
  }
  players = [];
  queue = [];
  collectionDate = null;
  location = "Локация пока не определена";
  MAX_PLAYERS = 14;
  isMatchStarted = false; // Матч завершён
  const message = await ctx.reply(
    "✅ Сбор успешно завершён! Все данные обнулены."
  );
  deleteMessageAfterDelay(ctx, message.message_id);
  notificationSent = false;
});


// Обработка основных команд (добавление и удаление игроков)
bot.on("text", async (ctx) => {
  if (ctx.chat.id !== GROUP_ID) return;

  const user = {
    id: ctx.from.id,
    name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "),
    username: ctx.from.username ? `@${ctx.from.username}` : null
  };

  if (ctx.message.text === "+") {
    await ctx.deleteMessage();
    if (!isMatchActive()) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const isInList = players.some(p => p.id === user.id) || queue.some(p => p.id === user.id);
    if (isInList) {
      const message = await ctx.reply("⚠️ Вы уже записаны!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (players.length < MAX_PLAYERS) {
      players.push(user);
    } else {
      queue.push(user);
    }

    await sendPlayerList(ctx);
    const message = await ctx.reply(`✅ ${user.name} добавлен!`);
    deleteMessageAfterDelay(ctx, message.message_id);

  } else if (ctx.message.text === "-") {
    await ctx.deleteMessage();
    const playerIndex = players.findIndex(p => p.id === user.id);
    
    if (playerIndex !== -1) {
      players.splice(playerIndex, 1);
      if (queue.length > 0) {
        const movedPlayer = queue.shift();
        players.push(movedPlayer);
        sendPrivateMessage(ctx, movedPlayer.id, "🎉 Вы в основном составе!");
      }
      await sendPlayerList(ctx);
      const message = await ctx.reply(`✅ ${user.name} удален!`);
      deleteMessageAfterDelay(ctx, message.message_id);
    } else {
      const message = await ctx.reply("⚠️ Вы не в списке!");
      deleteMessageAfterDelay(ctx, message.message_id);
    }
  }
});

// Обработка inline-кнопки "Записаться на матч"
bot.action("join_match", async (ctx) => {
  const user = {
    id: ctx.from.id,
    name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "),
    username: ctx.from.username ? `@${ctx.from.username}` : null
  };

  const isInList = players.some(p => p.id === user.id) || queue.some(p => p.id === user.id);
  
  if (isInList) {
    await ctx.answerCbQuery("⚠️ Вы уже записаны!");
    return;
  }

  if (players.length < MAX_PLAYERS) {
    players.push(user);
  } else {
    queue.push(user);
  }

  await ctx.answerCbQuery(`✅ Вы добавлены в ${players.length <= MAX_PLAYERS ? "список" : "очередь"}!`);
  await sendPlayerList(ctx);
});

// Запуск бота
bot.launch();

// Установка интервала для проверки времени и отправки уведомлений
setInterval(checkTimeAndNotify, 60000);

// Логирование успешного запуска бота
console.log("Бот запущен!");