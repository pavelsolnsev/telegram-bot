const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");

module.exports = (bot, GlobalState) => {
  // Обработчик команды "g <team> <player>" для добавления гола
  bot.hears(/^g(\d+)(\d+)$/i, async (ctx) => {
    const args = ctx.message.text.match(/^g(\d+)(\d+)$/i);
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команда не найдена!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!team[playerIndex]) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Игрок не найден!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);
    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол забил ${team[playerIndex].username} ${team[playerIndex].name}!`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик команды "ug <team> <player>" для удаления гола
  bot.hears(/^ug(\d+)(\d+)$/i, async (ctx) => {
    const args = ctx.message.text.match(/^ug(\d+)(\d+)$/i);
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команда не найдена!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!team[playerIndex]) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Игрок не найден!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (team[playerIndex].goals && team[playerIndex].goals > 0) {
      team[playerIndex].goals -= 1;
    } else {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        `⚠️ У ${team[playerIndex].name} уже 0 голов.`,
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    GlobalState.setPlayingTeams(playingTeams);
    await updatePlayingTeamsMessage(ctx);

    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол удалён у ${team[playerIndex].name}. Теперь у него ${team[playerIndex].goals} гол(ов).`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });

  // Обработчик нажатия кнопки "goal_<team>_<player>" для добавления гола
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();

    if (!ADMIN_ID.includes(ctx.from.id)) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      await ctx.answerCbQuery();
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      await ctx.answerCbQuery();
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      await ctx.answerCbQuery();
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Команда не найдена!",
      ]);
      await ctx.answerCbQuery();
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    if (!team[playerIndex]) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Игрок не найден!",
      ]);
      await ctx.answerCbQuery();
      return deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол забил ${team[playerIndex].username} ${team[playerIndex].name}!`,
    ]);
    await ctx.answerCbQuery();
    return deleteMessageAfterDelay(ctx, message.message_id, 6000);
  });
};