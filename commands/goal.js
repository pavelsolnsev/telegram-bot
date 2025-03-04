const { updatePlayingTeamsMessage } = require("../message/updatePlayingTeamsMessage");
const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const { safeTelegramCall } = require("../utils/telegramUtils");

module.exports = (bot, GlobalState) => {
  // Обработчик команды "g <team> <player>" для добавления гола
  bot.hears(/^g (\d+) (\d+)$/i, async (ctx) => {
    const args = ctx.message.text.split(" ");
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();
    await ctx.deleteMessage().catch(() => {});

    if (ctx.from.id !== ADMIN_ID) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      await safeTelegramCall(ctx, "sendMessage", [ctx.chat.id, "⛔ Команда не найдена!"]);
      return;
    }

    if (!team[playerIndex]) {
      await safeTelegramCall(ctx, "sendMessage", [ctx.chat.id, "⛔ Игрок не найден!"]);
      return;
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол добавлен для ${team[playerIndex].name}! Теперь у него ${team[playerIndex].goals} гол(ов) в этом матче.`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });

  // Обработчик команды "ug <team> <player>" для удаления гола
  bot.hears(/^ug (\d+) (\d+)$/i, async (ctx) => {
    const args = ctx.message.text.split(" ");
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();

    if (ctx.from.id !== ADMIN_ID) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const teamIndex = parseInt(args[1], 10) - 1;
    const playerIndex = parseInt(args[2], 10) - 1;
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      await safeTelegramCall(ctx, "sendMessage", [ctx.chat.id, "⛔ Команда не найдена!"]);
      return;
    }

    if (!team[playerIndex]) {
      await safeTelegramCall(ctx, "sendMessage", [ctx.chat.id, "⛔ Игрок не найден!"]);
      return;
    }

    if (team[playerIndex].goals && team[playerIndex].goals > 0) {
      team[playerIndex].goals -= 1;
    } else {
      await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        `⚠️ У ${team[playerIndex].name} уже 0 голов.`,
      ]);
      return;
    }

    GlobalState.setPlayingTeams(playingTeams);
    await updatePlayingTeamsMessage(ctx);

    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол удалён у ${team[playerIndex].name}. Теперь у него ${team[playerIndex].goals} гол(ов).`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });

  // Обработчик нажатия кнопки "goal_<team>_<player>" для добавления гола
  bot.action(/goal_(\d+)_(\d+)/, async (ctx) => {
    const ADMIN_ID = GlobalState.getAdminId();
    const isMatchStarted = GlobalState.getStart();

    if (ctx.from.id !== ADMIN_ID) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ У вас нет прав для этой команды.",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⚠️ Матч не начат!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    const teamIndex = parseInt(ctx.match[1], 10);
    const playerIndex = parseInt(ctx.match[2], 10);
    const playingTeams = GlobalState.getPlayingTeams();

    if (!playingTeams) {
      const message = await safeTelegramCall(ctx, "sendMessage", [
        ctx.chat.id,
        "⛔ Нет активного матча!",
      ]);
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    let team =
      teamIndex === playingTeams.teamIndex1
        ? playingTeams.team1
        : teamIndex === playingTeams.teamIndex2
        ? playingTeams.team2
        : null;

    if (!team) {
      return ctx.answerCbQuery("⛔ Команда не найдена!");
    }

    if (!team[playerIndex]) {
      return ctx.answerCbQuery("⛔ Игрок не найден!");
    }

    team[playerIndex].goals = (team[playerIndex].goals || 0) + 1;
    GlobalState.setPlayingTeams(playingTeams);

    await updatePlayingTeamsMessage(ctx);

    const message = await safeTelegramCall(ctx, "sendMessage", [
      ctx.chat.id,
      `⚽ Гол добавлен для ${team[playerIndex].name}! Теперь у него ${team[playerIndex].goals} гол(ов) в этом матче.`,
    ]);
    return deleteMessageAfterDelay(ctx, message.message_id);
  });
};