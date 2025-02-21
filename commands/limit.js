const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay"); // Импорт функции для удаления сообщений с задержкой
const { sendPlayerList } = require("../utils/sendPlayerList"); // Импорт функции для отправки списка игроков
const { sendPrivateMessage } = require("../message/sendPrivateMessage");

module.exports = (bot, GlobalState) => {
	bot.hears(/^l \d+$/i, async (ctx) => { // Обработчик команд, соответствующих шаблону "l <число>"
		const ADMIN_ID = GlobalState.getAdminId(); // Получаем ID администратора
		let isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
		let players = GlobalState.getPlayers(); // Получаем список текущих игроков
		let queue = GlobalState.getQueue(); // Получаем очередь игроков
		let MAX_PLAYERS = GlobalState.getMaxPlayers();
		await ctx.deleteMessage().catch(() => {}); // Удаляем сообщение пользователя (если возможно)
		if (!isMatchStarted) return; // Если матч не начался, выходим из функции
		
		if (ctx.from.id !== ADMIN_ID) { // Проверяем, является ли отправитель администратором
			const message = await ctx.reply("⛔ У вас нет прав для этой команды."); // Отправляем сообщение о запрете
			return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
		}

		const newLimit = Number(ctx.message.text.trim().slice(2).trim()); // Получаем новое значение лимита из сообщения
		if (newLimit <= 0) { // Проверяем, что лимит положительный
			const message = await ctx.reply("⚠️ Лимит должен быть положительным числом!"); // Предупреждаем пользователя
			return deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
		}

		if (newLimit < MAX_PLAYERS) { // Если новый лимит меньше текущего
			const playersToMove = players.slice(newLimit); // Определяем игроков, которых нужно переместить в очередь
			queue.unshift(...playersToMove); // Добавляем этих игроков в начало очереди
			players = players.slice(0, newLimit); // Оставляем только нужное количество игроков в списке
		} else if (newLimit > MAX_PLAYERS) { // Если новый лимит больше текущего
			const availableSlots = newLimit - players.length; // Рассчитываем количество доступных мест
			const playersToAdd = queue.splice(0, availableSlots); // Извлекаем нужное количество игроков из очереди
			players.push(...playersToAdd); // Добавляем их в основной список игроков

			playersToAdd.forEach(player => {
				sendPrivateMessage(bot, player.id, "🎉 Вы в основном составе!");
			});// Отправляем ему личное сообщение
		}

		GlobalState.setMaxPlayers(newLimit); // Устанавливаем новый лимит игроков
		GlobalState.setPlayers(players); // Сохраняем обновленный список игроков
		GlobalState.setQueue(queue); // Сохраняем обновленный список очереди

		const message = await ctx.reply(`✅ Лимит игроков установлен на ${newLimit}.`); // Сообщаем об успешном изменении лимита
		deleteMessageAfterDelay(ctx, message.message_id); // Удаляем сообщение через некоторое время
		await sendPlayerList(ctx); // Отправляем обновленный список игроков
	});
};
