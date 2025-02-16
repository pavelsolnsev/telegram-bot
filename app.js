// Загружаем переменные окружения из файла .env
require("dotenv").config();

// Подключаем библиотеку Telegraf для работы с Telegram Bot API
const { Telegraf, Markup } = require("telegraf");
// Создаем экземпляр бота, используя токен из переменных окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Получаем ID группы и ID администратора из переменных окружения
const GROUP_ID = Number(process.env.ID);
const ADMIN_ID = Number(process.env.ADMIN_ID);
const IMAGE_URL = process.env.IMAGE_URL || "https://www.meme-arsenal.com/memes/a69b26bcf26d80f28a6422ebac425b5f.jpg";

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

// Флаг, указывающий, запущен ли матч
let isMatchStarted = false;

// Функция для удаления сообщений с задержкой
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
      formattedList += `🕒 <b>${capitalizedWeekday}, ${cleanedDate}, ${time}</b>\n\n`;
  }

  formattedList += `📍 <b>Локация:</b> ${location}\n\n`;
  formattedList += `💰 <b>400 ₽</b> — Услуги: мячи, вода, аптечка, манишки, фото и съёмка матча! 🎥⚽💧💊\n`;
  formattedList += `📲 <b>Перевод по номеру:</b> <code>89166986185</code>\n`;
  formattedList += `💳 <b>Карта:</b> <code>2212312412412412</code>\n`;
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

  // Создаем кнопку "Записаться на матч"
  const inlineKeyboard = Markup.inlineKeyboard([
      Markup.button.callback("⚽ Записаться на матч", "join_match"),
  ]);

  try {
    if (listMessageId) {
      // Редактируем существующее сообщение
      await ctx.telegram.editMessageCaption(
        ctx.chat.id,
        listMessageId,
        null,
        formattedList,
        {
          parse_mode: "HTML",
          reply_markup: inlineKeyboard.reply_markup,
        }
      );
    } else {
      // Отправляем новое сообщение с изображением и кнопкой
      const sentMessage = await ctx.replyWithPhoto(IMAGE_URL, {
        caption: formattedList,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      listMessageId = sentMessage.message_id;
    }
  } catch (error) {
    if (error.description.includes('message to edit not found')) {
      // Если сообщение было удалено, сбрасываем ID и отправляем новое
      listMessageId = null;
      const sentMessage = await ctx.replyWithPhoto(IMAGE_URL, {
        caption: formattedList,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard.reply_markup,
      });
      listMessageId = sentMessage.message_id;
    } else {
      console.error("Ошибка при отправке списка игроков:", error);
    }
  }
};
// Функция для проверки, является ли пользователь администратором
const isAdmin = (ctx) => ctx.from.id === ADMIN_ID;

// Функция для проверки, запущен ли матч
const isMatchActive = (ctx) => {
  if (!isMatchStarted) {
    return false;
  }
  return true;
};


// Команда s (start) для запуска матча
bot.hears(/^s \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/i, async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  if (!isAdmin(ctx)) {
    const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
    return deleteMessageAfterDelay(ctx, message.message_id);
  }
  const userInput = ctx.message.text.trim().slice(2).trim();
  const [datePart, timePart] = userInput.split(" ");
  const [day, month, year] = datePart.split(".").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  collectionDate = new Date(year, month - 1, day, hours, minutes);
  if (isNaN(collectionDate.getTime())) {
    const message = await ctx.reply(
      "⚠️ Неверный формат даты! Используй: s ДД.ММ.ГГГГ ЧЧ:ММ"
    );
    return deleteMessageAfterDelay(ctx, message.message_id);
  } else {
    players = [];
    queue = [];
    isMatchStarted = true; // Матч запущен

    // Отправляем список игроков и закрепляем сообщение
    await sendPlayerList(ctx);

    // Закрепляем сообщение
    if (listMessageId) {
      try {
        await ctx.telegram.pinChatMessage(ctx.chat.id, listMessageId);
      } catch (error) {
        console.error("Ошибка при закреплении сообщения:", error);
      }
    }
  }
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
  const playerName = players[playerIndex];
  const cleanedPlayerName = playerName.replace(/✅/g, "").trim();
  if (!playerName.includes("✅")) {
    players[playerIndex] = `${cleanedPlayerName} ✅`;
    // const message = await ctx.reply(
    //   `✅ Игрок ${cleanedPlayerName} отмечен как оплативший игру!`
    // );
    // deleteMessageAfterDelay(ctx, message.message_id);
    await sendPlayerList(ctx);
  } else {
    // const message = await ctx.reply(
    //   "⚠️ Этот игрок уже отмечен как оплативший!"
    // );
    // deleteMessageAfterDelay(ctx, message.message_id);
  }
});

// Команда e (end) для завершения сбора и обнуления данных
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
  const playerName = players[playerIndex];
  const cleanedPlayerName = playerName.replace(/✅/g, "").trim();
  if (playerName.includes("✅")) {
    players[playerIndex] = cleanedPlayerName; // Убираем флажок оплаты
    // const message = await ctx.reply(
    //   `✅ Флажок оплаты у игрока ${cleanedPlayerName} снят!`
    // );
    // deleteMessageAfterDelay(ctx, message.message_id);
    await sendPlayerList(ctx);
  } else {
    // const message = await ctx.reply(
    //   "⚠️ Этот игрок ещё не отмечен как оплативший!"
    // );
    // deleteMessageAfterDelay(ctx, message.message_id);
  }
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
  const message = await ctx.reply(`✅ Игрок ${playerName} удалён из списка!`);
  deleteMessageAfterDelay(ctx, message.message_id);
  await sendPlayerList(ctx);
});


// Обработка текстовых сообщений в группе
bot.on("text", async (ctx) => {
 
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();
  if (chatId !== GROUP_ID) return;

  const firstName = ctx.message.from.first_name || "";
  const lastName = ctx.message.from.last_name || "";
  const username = ctx.message.from.username
    ? `@${ctx.message.from.username}`
    : "";
  const basePlayer = `${firstName} ${lastName} ${
    username ? `(${username})` : ""
  }`.trim();

  if (text === "+") {
    await ctx.deleteMessage().catch(() => {});
    if (!isMatchActive(ctx)) {
      const message = await ctx.reply("⚠️ Список игроков ещё не создан.");
      return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
    }
    if (!players.includes(basePlayer) && !queue.includes(basePlayer)) {
      players.length < MAX_PLAYERS
        ? players.push(basePlayer)
        : queue.push(basePlayer);
      const message = await ctx.reply(
        `✅ ${basePlayer} добавлен в ${
          players.length <= MAX_PLAYERS ? "список" : "очередь"
        }!`
      );
      deleteMessageAfterDelay(ctx, message.message_id);
      await sendPlayerList(ctx);
    } else {
      const message = await ctx.reply("⚠️ Ты уже в списке или в очереди!");
      deleteMessageAfterDelay(ctx, message.message_id);
    }
    deleteMessageAfterDelay(ctx, ctx.message.message_id);
  } else if (text === "-") {
    await ctx.deleteMessage().catch(() => {});
    if (!isMatchActive(ctx)) {
      const message = await ctx.reply("⚠️ Список игроков ещё не создан.");
      return deleteMessageAfterDelay(ctx, message.message_id, 2000); // Удаляем через 5 секунд
    }
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
    deleteMessageAfterDelay(ctx, ctx.message.message_id);
  } else if (text === "list") {
    await sendPlayerList(ctx);
  }
});


bot.action("join_match", async (ctx) => {
  // Получаем информацию о пользователе
  const firstName = ctx.from.first_name || "";
  const lastName = ctx.from.last_name || "";
  const username = ctx.from.username ? `@${ctx.from.username}` : "";
  const basePlayer = `${firstName} ${lastName} ${
      username ? `(${username})` : ""
  }`.trim();

  // Проверяем, не записан ли пользователь уже
  if (!players.includes(basePlayer)) {
      if (players.length < MAX_PLAYERS) {
          players.push(basePlayer); // Добавляем в список
      } else {
          queue.push(basePlayer); // Добавляем в очередь
      }

      // Отправляем уведомление
      await ctx.answerCbQuery(
          `✅ Вы добавлены в ${players.length <= MAX_PLAYERS ? "список" : "очередь"}!`
      );

      // Обновляем список игроков
      await sendPlayerList(ctx);
  } else {
      // Если пользователь уже в списке
      await ctx.answerCbQuery("⚠️ Вы уже в списке или в очереди!");
  }
});


// / s 16.02.2025 18:00

// Запуск бота
bot.launch();
console.log("Бот запущен!");
