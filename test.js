



// Загружаем переменные окружения из файла .env
require("dotenv").config();

// Подключаем библиотеку Telegraf для работы с Telegram Bot API
const { Telegraf } = require("telegraf");
// Создаем экземпляр бота, используя токен из переменных окружения
const bot = new Telegraf(process.env.BOT_TOKEN);

// Получаем ID группы и ID администратора из переменных окружения
const GROUP_ID = Number(process.env.ID);
const ADMIN_ID = Number(process.env.ADMIN_ID);

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

// Функция для отправки списка игроков в чат
const sendPlayerList = (ctx) => {
  let formattedList = "";

  // Если дата сбора установлена, добавляем её в сообщение
  if (collectionDate) {
    const options = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long", // Добавляем день недели
    };
    const formattedDate = collectionDate.toLocaleString("ru-RU", options);
    // Разбиваем строку на части для переформатирования
    const [weekday, date, time] = formattedDate.split(", ");

    // Убираем "г." из даты и делаем день недели с большой буквы
    const cleanedDate = date.replace(" г.", ""); // Убираем "г."
    const capitalizedWeekday =
      weekday.charAt(0).toUpperCase() + weekday.slice(1); // Делаем день недели с большой буквы

    formattedList += `🕒 <b>${capitalizedWeekday}, ${cleanedDate}, начало в ${time}</b>\n\n`;
  }

  // Добавляем локацию в сообщение
  formattedList += `📍 <b>Локация:</b> ${location}\n\n`;

  // Стоимость
  formattedList += `💰 <b>400 ₽</b> — Полный комплект услуг: вода, манишки, съёмка матча и аптечка! 🎥⚽💧💊\n`;
  formattedList += `📲 <b>Перевод по номеру:</b> <code>89166986185</code>\n`;
  formattedList += `💳 <b>Оплата на карту:</b> <code>2212 3124 1241 2412</code>\n`;
  formattedList += `💵 <b>Наличные:</b> Можно оплатить на месте.\n`;

  // Если есть игроки в основном списке, добавляем их в сообщение
  if (players.length > 0) {
    formattedList += `\n⚽ <b>В игре:</b>\n`;
    players.forEach((player, index) => {
      formattedList += `\n${index + 1}. ${player}`;
    });
    formattedList += `\n\n------------------------------\n`;
  }

  // Если есть игроки в очереди, добавляем их в сообщение
  if (queue.length > 0) {
    formattedList += `\n📢 <b>Очередь игроков:</b>\n`;
    queue.forEach((player, index) => {
      formattedList += `\n${index + 1}. ${player}`;
    });
    formattedList += `\n\n------------------------------\n`;
  }

  // добавляем общее количество игроков и лимит
  formattedList += `\n📋 <b>Список игроков:</b> ${players.length} / ${MAX_PLAYERS}`;

  // Отправляем сообщение с форматированием HTML
  ctx.reply(formattedList, { parse_mode: "HTML" });
};

// Функция для проверки, является ли пользователь администратором
const isAdmin = (ctx) => ctx.from.id === ADMIN_ID;

// Команда /start для установки даты и времени сбора игроков
bot.command("start", (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply("⛔ У вас нет прав для этой команды.");

  // Получаем введенную пользователем дату и время
  const userInput = ctx.message.text.trim().slice(7).trim();

  // Проверяем, соответствует ли ввод формату ДД.ММ.ГГГГ ЧЧ:ММ
  if (/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(userInput)) {
    // Разбиваем строку на компоненты: дату и время
    const [datePart, timePart] = userInput.split(" ");
    const [day, month, year] = datePart.split(".").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    // Создаем объект Date с правильными значениями
    collectionDate = new Date(year, month - 1, day, hours, minutes);

    // Проверяем, корректна ли дата
    if (isNaN(collectionDate.getTime())) {
      ctx.reply("⚠️ Неверный формат даты! Используй: /start ДД.ММ.ГГГГ ЧЧ:ММ");
    } else {
      sendPlayerList(ctx);
    }
  } else {
    ctx.reply("⚠️ Неверный формат! Используй: /start ДД.ММ.ГГГГ ЧЧ:ММ");
  }
});

// Обработка текстовых сообщений в группе
bot.on("text", (ctx) => {
  if (!collectionDate) return; // Если дата сбора не установлена, игнорируем сообщение
  const chatId = ctx.chat.id; // Получаем ID чата
  const text = ctx.message.text.trim(); // Получаем текст сообщения
  if (chatId !== GROUP_ID) return; // Игнорируем сообщения не из нужной группы

  // Формируем имя игрока из имени, фамилии и username
  const firstName = ctx.message.from.first_name || "";
  const lastName = ctx.message.from.last_name || "";
  const username = ctx.message.from.username
    ? `@${ctx.message.from.username}`
    : "";
  const basePlayer = `${firstName} ${lastName} ${
    username ? `(${username})` : ""
  }`.trim();

  // Если пользователь написал "+", добавляем его в список или очередь
  if (text === "+") {
    if (!players.includes(basePlayer) && !queue.includes(basePlayer)) {
      players.length < MAX_PLAYERS
        ? players.push(basePlayer)
        : queue.push(basePlayer);
      ctx.reply(
        `✅ ${basePlayer} добавлен в ${
          players.length <= MAX_PLAYERS ? "список" : "очередь"
        }!`
      );
      sendPlayerList(ctx); // Отправляем обновленный список игроков
    } else {
      ctx.reply("⚠️ Ты уже в списке или в очереди!");
    }
  } else if (text === "-") {
    // Если пользователь написал "-", удаляем его из списка
    if (players.includes(basePlayer)) {
      players = players.filter((p) => p !== basePlayer);
      if (queue.length > 0) players.push(queue.shift()); // Перемещаем первого игрока из очереди в список
      ctx.reply(`✅ ${basePlayer} удалён из списка!`);
      sendPlayerList(ctx); // Отправляем обновленный список игроков
    } else {
      ctx.reply("⚠️ Ты не в списке игроков!");
    }
  } else if (text === "/list") {
    // Если пользователь написал "/list", отправляем список игроков
    sendPlayerList(ctx);
  }
});

bot.command('add', (ctx) => {
	const chatId = ctx.chat.id;
	if (chatId !== GROUP_ID) return;

	const match = ctx.message.text.match(/^\/add (.+)$/);
	if (match) {
			const friendName = match[1].trim();
			const firstName = ctx.message.from.first_name || '';
			const lastName = ctx.message.from.last_name || '';
			const username = ctx.message.from.username ? `@${ctx.message.from.username}` : '';
			const basePlayer = `${firstName} ${lastName} ${username ? `(${username})` : ''}`.trim();

			// Формируем имя друга с указанием, кто его добавил
			const friendWithAddedBy = `${friendName} (от: ${basePlayer})`;

			if (!players.includes(friendWithAddedBy) && !queue.includes(friendWithAddedBy)) {
					players.length < MAX_PLAYERS ? players.push(friendWithAddedBy) : queue.push(friendWithAddedBy);
					ctx.reply(`✅ ${friendWithAddedBy} добавлен в ${players.length <= MAX_PLAYERS ? 'список' : 'очередь'}!`);
					sendPlayerList(ctx);
			} else {
					ctx.reply('⚠️ Этот игрок уже в списке или в очереди!');
			}
	} else {
			ctx.reply('⚠️ Неверный формат команды! Используй: /add <имя друга>.');
	}
});

bot.command('remove', (ctx) => {
	const chatId = ctx.chat.id;
	if (chatId !== GROUP_ID) return;

	const match = ctx.message.text.match(/^\/remove (.+)$/);
	if (match) {
			const friendName = match[1].trim(); // Имя друга, которое нужно удалить
			const firstName = ctx.message.from.first_name || '';
			const lastName = ctx.message.from.last_name || '';
			const username = ctx.message.from.username ? `@${ctx.message.from.username}` : '';
			const basePlayer = `${firstName} ${lastName} ${username ? `(${username})` : ''}`.trim();

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

					ctx.reply(`✅ ${playerToRemove} удалён из списка от имени ${basePlayer}!`);
					sendPlayerList(ctx);
			} else {
					ctx.reply('⚠️ Этот игрок не в списке!');
			}
	} else {
			ctx.reply('⚠️ Неверный формат команды! Используй: /remove <имя друга>.');
	}
});

// Команда /end для завершения сбора игроков
bot.command('end', (ctx) => {
	if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');
	players = []; // Очищаем список игроков
	queue = []; // Очищаем очередь
	collectionDate = null; // Сбрасываем дату сбора
	ctx.reply('❌ Сбор игроков завершен');
});

// Команда /limit для установки лимита игроков
bot.command('limit', (ctx) => {
	if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');

	// Получаем новое значение лимита из команды
	const match = ctx.message.text.match(/^\/limit (\d+)$/);
	if (match) {
			const newLimit = Number(match[1]);

			// Проверяем, что лимит положительный
			if (newLimit <= 0) {
					return ctx.reply('⚠️ Лимит должен быть положительным числом!');
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

			MAX_PLAYERS = newLimit; // Обновляем лимит
			ctx.reply(`✅ Лимит игроков установлен на ${MAX_PLAYERS}.`);
			sendPlayerList(ctx); // Отправляем обновленный список игроков
	} else {
			ctx.reply('⚠️ Неверный формат команды! Используй: /limit <число>.');
	}
});

// Команда /pay для отметки игрока, оплатившего игру
bot.command('pay', (ctx) => {
	if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');

	// Получаем номер игрока из команды
	const match = ctx.message.text.match(/^\/pay (\d+)$/);
	if (match) {
			const playerNumber = Number(match[1]);

			// Проверяем, что номер игрока корректен
			if (playerNumber <= 0 || playerNumber > players.length) {
					return ctx.reply('⚠️ Неверный номер игрока!');
			}

			// Получаем игрока по номеру
			const playerIndex = playerNumber - 1;
			const playerName = players[playerIndex];

			// Проверяем, не был ли игрок уже отмечен как оплативший
			if (!playerName.includes('✅')) {
					// Добавляем значок ✅ к имени игрока
					players[playerIndex] = `${playerName} ✅`;

					ctx.reply(`✅ Игрок ${playerName} отмечен как оплативший игру!`);
					sendPlayerList(ctx); // Отправляем обновленный список игроков
			} else {
					ctx.reply('⚠️ Этот игрок уже отмечен как оплативший!');
			}
	} else {
			ctx.reply('⚠️ Неверный формат команды! Используй: /pay <номер игрока>.');
	}
});

// Команда /unpay для отмены отметки об оплате у игрока
bot.command('unpay', (ctx) => {
	if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');

	// Получаем номер игрока из команды
	const match = ctx.message.text.match(/^\/unpay (\d+)$/);
	if (match) {
			const playerNumber = Number(match[1]);

			// Проверяем, что номер игрока корректен
			if (playerNumber <= 0 || playerNumber > players.length) {
					return ctx.reply('⚠️ Неверный номер игрока!');
			}

			// Получаем игрока по номеру
			const playerIndex = playerNumber - 1;
			const playerName = players[playerIndex];

			// Проверяем, был ли игрок отмечен как оплативший
			if (playerName.includes('✅')) {
					// Убираем значок ✅ из имени игрока
					players[playerIndex] = playerName.replace(' ✅', '');

					ctx.reply(`✅ Отметка об оплате у игрока ${playerName.replace(' ✅', '')} удалена!`);
					sendPlayerList(ctx); // Отправляем обновленный список игроков
			} else {
					ctx.reply('⚠️ Этот игрок не был отмечен как оплативший!');
			}
	} else {
			ctx.reply('⚠️ Неверный формат команды! Используй: /unpay <номер игрока>.');
	}
});

// Команда /rm для удаления игрока из списка
bot.command('rm', (ctx) => {
const chatId = ctx.chat.id;
if (chatId !== GROUP_ID) return;

const match = ctx.message.text.match(/^\/rm (.+)$/);
if (match) {
		const friendName = match[1].trim(); // Имя друга, которое нужно удалить
		const firstName = ctx.message.from.first_name || '';
		const lastName = ctx.message.from.last_name || '';
		const username = ctx.message.from.username ? `@${ctx.message.from.username}` : '';
		const basePlayer = `${firstName} ${lastName} ${username ? `(${username})` : ''}`.trim();

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

				ctx.reply(`✅ ${playerToRemove} удалён из списка от ${basePlayer}!`);
				sendPlayerList(ctx);
		} else {
				ctx.reply('⚠️ Этот игрок не в списке!');
		}
} else {
		ctx.reply('⚠️ Неверный формат команды! Используй: /rm <имя друга>.');
}
});

// Команда /clear для очистки списка и очереди
bot.command('clear', (ctx) => {
	if (!isAdmin(ctx)) return ctx.reply('⛔ У вас нет прав для этой команды.');
	players = []; // Очищаем основной список
	queue = []; // Очищаем очередь
	ctx.reply('🗑️ Список и очередь очищены!');
	sendPlayerList(ctx); // Отправляем обновленный список игроков
});


// Запуск бота
bot.launch();
console.log("Бот запущен!");

