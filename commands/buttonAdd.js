module.exports = (bot, sendPlayerList, GlobalState) => {
	bot.action("join_match", async (ctx) => {
		const players = GlobalState.getPlayers()
		const queue = GlobalState.getPlayers()
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
	
		if (players.length < GlobalState.getMaxPlayers()) {
			players.push(user);
		} else {
			queue.push(user);
		}
	
		await ctx.answerCbQuery(`✅ Вы добавлены в ${players.length <= GlobalState.getMaxPlayers() ? "список" : "очередь"}!`);
		await sendPlayerList(ctx);
	});
};
