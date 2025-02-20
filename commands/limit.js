
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
module.exports = (bot, GlobalState) => {
	bot.hears(/^l \d+$/i, async (ctx) => {
		const ADMIN_ID = GlobalState.getAdminId();
		let isMatchStarted = GlobalState.getStart();
		await ctx.deleteMessage().catch(() => {});
		if (!isMatchStarted) return;
		if (ctx.from.id !== ADMIN_ID) {
			const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
			return deleteMessageAfterDelay(ctx, message.message_id);
		}

		const newLimit = Number(ctx.message.text.trim().slice(2).trim());
		if (newLimit <= 0) {
			const message = await ctx.reply("⚠️ Лимит должен быть положительным числом!");
			return deleteMessageAfterDelay(ctx, message.message_id);
		}

		let players = GlobalState.getPlayers();
		let queue = GlobalState.getQueue();
		
		if (newLimit < GlobalState.getMaxPlayers()) {
			const playersToMove = players.slice(newLimit); // Игроки, которых нужно переместить в очередь
			queue.unshift(...playersToMove); // Добавляем в начало очереди
			players = players.slice(0, newLimit); // Оставляем нужное количество игроков в основном списке
		} else if (newLimit > GlobalState.getMaxPlayers()) {
			const availableSlots = newLimit - players.length; // Свободные места
			const playersToAdd = queue.splice(0, availableSlots); // Берем из очереди нужное число игроков
			players.push(...playersToAdd); // Добавляем в основной список
		}

		GlobalState.setMaxPlayers(newLimit);
		GlobalState.setPlayers(players);
		GlobalState.setQueue(queue);

		const message = await ctx.reply(`✅ Лимит игроков установлен на ${GlobalState.getMaxPlayers()}.`);
		deleteMessageAfterDelay(ctx, message.message_id);
		await sendPlayerList(ctx);
	});
};
