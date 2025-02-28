const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { sendPlayerList } = require("../utils/sendPlayerList");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");
const getPlayerStats = require("../database/getPlayerStats");

module.exports = (bot, GlobalState) => {
  // Обработчик текстовых сообщений для "+" и "-"
  bot.on("text", async (ctx) => {
    const players = GlobalState.getPlayers();
    const queue = GlobalState.getQueue();
    const GROUP_ID = GlobalState.getGroupId();
    let isMatchStarted = GlobalState.getStart();
    let MAX_PLAYERS = GlobalState.getMaxPlayers();
		const isTeamsDivided = GlobalState.getDivided();

    // Если сообщение не из нужной группы, игнорируем его
    if (ctx.chat.id !== GROUP_ID) return;

    // Создаем объект пользователя с базовыми данными
    const user = {
      id: ctx.from.id,
      name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "),
      username: ctx.from.username ? `@${ctx.from.username}` : null,
      goals: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      rating: 0,
    };

    // Получаем статистику игрока из базы
    const [updatedUser] = await getPlayerStats([user]);

    // Если пользователь отправил "+"
    if (ctx.message.text === "+") {
      await ctx.deleteMessage();

      if (!isMatchStarted) {
        const message = await ctx.reply("⚠️ Матч не начат!");
        return deleteMessageAfterDelay(ctx, message.message_id);
      }

			if (isTeamsDivided) {
				const message = await ctx.reply("⚽ <b>Матч уже стартовал!</b> Запись закрыта, но ты можешь следить за игрой и готовиться к следующей. До встречи на поле! 🥅");
				return deleteMessageAfterDelay(ctx, message.message_id);
			}

      const isInList = players.some((p) => p.id === updatedUser.id) || queue.some((p) => p.id === updatedUser.id);
      if (isInList) {
        const message = await ctx.reply("⚠️ Вы уже записаны!");
        return deleteMessageAfterDelay(ctx, message.message_id);
      }

      if (players.length < MAX_PLAYERS) {
        players.push(updatedUser);
      } else {
        queue.push(updatedUser);
      }

      await sendPlayerList(ctx);

      const message = await ctx.reply(`✅ ${updatedUser.name} добавлен!`);
      deleteMessageAfterDelay(ctx, message.message_id);

    // Если пользователь отправил "-"
    } else if (ctx.message.text === "-") {

			await ctx.deleteMessage();

			if (!isMatchStarted) {
        const message = await ctx.reply("⚠️ Матч не начат!");
        return deleteMessageAfterDelay(ctx, message.message_id);
      }

			if (isTeamsDivided) {
				const message = await ctx.reply("⚽ <b>Матч уже стартовал!</b> Запись закрыта, но ты можешь следить за игрой и готовиться к следующей. До встречи на поле! 🥅");
				return deleteMessageAfterDelay(ctx, message.message_id);
			}

      const playerIndex = players.findIndex((p) => p.id === updatedUser.id);

      if (playerIndex !== -1) {
        players.splice(playerIndex, 1);

        if (queue.length > 0) {
          const movedPlayer = queue.shift();
          players.push(movedPlayer);
          sendPrivateMessage(bot, movedPlayer.id, "🎉 Вы в основном составе!");
        }

        await sendPlayerList(ctx);

        const message = await ctx.reply(`✅ ${updatedUser.name} удален!`);
        deleteMessageAfterDelay(ctx, message.message_id);
      } else {
        const message = await ctx.reply("⚠️ Вы не в списке!");
        deleteMessageAfterDelay(ctx, message.message_id);
      }
    }
  });

  // Обработчик нажатия кнопки "join_match"
  bot.action("join_match", async (ctx) => {
    let players = GlobalState.getPlayers();
    let queue = GlobalState.getQueue();
    let MAX_PLAYERS = GlobalState.getMaxPlayers();
		const isTeamsDivided = GlobalState.getDivided();

		if (isTeamsDivided) {
      const message = await ctx.reply("⚽ <b>Матч уже стартовал!</b> Запись закрыта, но ты можешь следить за игрой и готовиться к следующей. До встречи на поле! 🥅");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Создаем объект пользователя с базовыми данными
    const user = {
      id: ctx.from.id,
      name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" "),
      username: ctx.from.username ? `@${ctx.from.username}` : null,
      goals: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      rating: 0,
    };

    // Получаем статистику игрока из базы
    const [updatedUser] = await getPlayerStats([user]);

    const isInList = players.some((p) => p.id === updatedUser.id) || queue.some((p) => p.id === updatedUser.id);

    if (isInList) {
      await ctx.answerCbQuery("⚠️ Вы уже записаны!");
      return;
    }

    if (players.length < MAX_PLAYERS) {
      players.push(updatedUser);
      await ctx.answerCbQuery("✅ Вы добавлены в список!");
    } else {
      queue.push(updatedUser);
      await ctx.answerCbQuery("✅ Вы добавлены в очередь!");
    }

    await sendPlayerList(ctx);
  });
};