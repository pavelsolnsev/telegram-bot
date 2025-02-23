
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");
module.exports = (bot, GlobalState) => {
	bot.on("text", async (ctx) => {
		
		const players = GlobalState.getPlayers();
		const queue = GlobalState.getQueue();
		const GROUP_ID = GlobalState.getGroupId();
		let isMatchStarted = GlobalState.getStart();
		let MAX_PLAYERS = GlobalState.getMaxPlayers();
		// Если сообщение не из нужной группы, игнорируем его
		if (ctx.chat.id !== GROUP_ID) return;
		// Создаем объект пользователя с id, именем и username
		const user = {
			id: ctx.from.id,
			name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "),
			username: ctx.from.username ? `@${ctx.from.username}` : null,
			goals: 0,
			gamesPlayed: 0, // Новое поле
			wins: 0,        // Новое поле
			draws: 0,       // Новое поле
			losses: 0       // Новое поле
		};
		// Если пользователь отправил "+"
		if (ctx.message.text === "+") {
			await ctx.deleteMessage(); // Удаляем сообщение, чтобы не засорять чат
			if (!isMatchStarted) {
				const message = await ctx.reply("⚠️ Матч не начат!");
				return deleteMessageAfterDelay(ctx, message.message_id);
			}
	
			// Проверяем, есть ли пользователь уже в списке игроков или в очереди
			const isInList = players.some(p => p.id === user.id) || queue.some(p => p.id === user.id);
			if (isInList) {
				const message = await ctx.reply("⚠️ Вы уже записаны!"); // Если уже записан, отправляем предупреждение
				return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем предупреждение через некоторое время
			}
	
			// Если есть свободные места, добавляем пользователя в список игроков
			if (players.length < MAX_PLAYERS) {
				players.push(user);
			} else {
				queue.push(user); // Иначе добавляем в очередь
			}
	
			await sendPlayerList(ctx); // Отправляем обновленный список игроков
	
			// Отправляем подтверждающее сообщение о добавлении
			const message = await ctx.reply(`✅ ${user.name} добавлен!`);
			deleteMessageAfterDelay(ctx, message.message_id); // Удаляем подтверждение через некоторое время
	
		// Если пользователь отправил "-"
		} else if (ctx.message.text === "-") {
			await ctx.deleteMessage(); // Удаляем сообщение, чтобы не засорять чат
	
			// Ищем игрока в основном списке
			const playerIndex = players.findIndex(p => p.id === user.id);
			
			// Если пользователь найден в списке игроков
			if (playerIndex !== -1) {
				players.splice(playerIndex, 1); // Удаляем его из списка
	
				// Если в очереди есть игроки, переводим первого в основной состав
				if (queue.length > 0) {
					const movedPlayer = queue.shift(); // Убираем первого из очереди
					players.push(movedPlayer); // Добавляем его в основной список
					sendPrivateMessage(bot, movedPlayer.id, "🎉 Вы в основном составе!");// Отправляем ему личное сообщение
				}
	
				await sendPlayerList(ctx); // Обновляем список игроков
	
				// Отправляем сообщение о том, что игрок удален
				const message = await ctx.reply(`✅ ${user.name} удален!`);
				deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
			} else {
				// Если игрока не было в списке, отправляем предупреждение
				const message = await ctx.reply("⚠️ Вы не в списке!");
				deleteMessageAfterDelay(ctx, message.message_id); // Удаляем предупреждение через некоторое время
			}
		}
	});
};
