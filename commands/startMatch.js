const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
module.exports = (bot, GlobalState, sendPlayerList) => {
	bot.hears(/^s \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/i, async (ctx) => {
		const ADMIN_ID = GlobalState.getAdminId();
		let collectionDate = GlobalState.getCollectionDate();
		let listMessageId = GlobalState.getListMessageId();
		await ctx.deleteMessage().catch(() => {});
	
		if (ctx.from.id !== ADMIN_ID) {
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
	
		GlobalState.setCollectionDate(collectionDate);
		GlobalState.setPlayers([]);
		GlobalState.setQueue([]);
		GlobalState.setStart(true);
		await sendPlayerList(ctx);
	
		if (listMessageId) {
			try {
				await ctx.telegram.pinChatMessage(ctx.chat.id, listMessageId);
			} catch (error) {
				console.error("Ошибка закрепления:", error);
			}
		}
	
		GlobalState.setNotificationSent(false);
	});
};


