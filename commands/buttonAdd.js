const { sendPlayerList } = require("../utils/sendPlayerList"); // Импорт функции для отправки списка игроков

module.exports = (bot, GlobalState) => {
	bot.action("join_match", async (ctx) => { // Обработчик нажатия кнопки "join_match"
		let players = GlobalState.getPlayers(); // Получаем текущий список игроков
		let queue = GlobalState.getQueue(); // Получаем очередь игроков
		let MAX_PLAYERS = GlobalState.getMaxPlayers(); // Получаем максимальное количество игроков в матче
		
		// Создаем объект пользователя с его данными
		const user = {
			id: ctx.from.id, // ID пользователя
			name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "), // Формируем имя (учитываем отсутствие фамилии)
			username: ctx.from.username ? `@${ctx.from.username}` : null, // Добавляем username, если он есть
			goals: 0
		};
		
		// Проверяем, есть ли игрок уже в списке или очереди
		const isInList = players.some(p => p.id === user.id) || queue.some(p => p.id === user.id);
		
		if (isInList) { // Если игрок уже записан, отправляем уведомление и прекращаем выполнение
			await ctx.answerCbQuery("⚠️ Вы уже записаны!");
			return;
		}
	
		if (players.length < MAX_PLAYERS) { // Если есть свободные места в списке игроков, добавляем туда
			players.push(user);
		} else { // Если мест нет, отправляем игрока в очередь
			queue.push(user);
		}
	
		// Отправляем пользователю уведомление о его статусе (в списке или в очереди)
		await ctx.answerCbQuery(`✅ Вы добавлены в ${players.length < MAX_PLAYERS ? "список" : "очередь"}!`);
		await sendPlayerList(ctx);// Обновляем список игроков
	});
};
