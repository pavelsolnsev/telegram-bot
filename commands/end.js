const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const savePlayersToDatabase = require("../database/savePlayers");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");

module.exports = (bot, GlobalState) => {
  bot.hears(/^e!$/i, async (ctx) => {
    const listMessageId = GlobalState.getListMessageId();
    const listMessageChatId = GlobalState.getListMessageChatId(); // ID группы
    const isMatchStarted = GlobalState.getStart();
    const ADMIN_ID = GlobalState.getAdminId();

    await ctx.deleteMessage().catch(() => {});


    if (ctx.chat.id < 0) {
      const msg = await ctx.reply("Напиши мне в ЛС.");
      return deleteMessageAfterDelay(ctx, msg.message_id);
    }

    if (ctx.from.id !== ADMIN_ID) {
      const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    if (!isMatchStarted) {
      const message = await ctx.reply("⚠️ Матч не начат!");
      return deleteMessageAfterDelay(ctx, message.message_id);
    }

    // Удаляем сообщение со списком игроков из группы
    if (listMessageId && listMessageChatId) {
      await ctx.telegram.deleteMessage(listMessageChatId, listMessageId).catch((error) => {
        console.error("Ошибка удаления сообщения из группы:", error);
      });
      GlobalState.setListMessageId(null);
      GlobalState.setListMessageChatId(null);
    }


    const allTeams = GlobalState.getTeams();
    const teamStats = GlobalState.getTeamStats();
    const teamsBase = GlobalState.getTeamsBase()
    const allPlayers = allTeams.flat();

    // Сохраняем игроков в базу данных и обновляем историю
    await savePlayersToDatabase(allPlayers);
    GlobalState.appendToPlayersHistory(allPlayers);

    // Формируем и отправляем сообщение с таблицей в группу
    if (listMessageChatId && allTeams.length > 0) {
      const teamsMessage = buildTeamsMessage(teamsBase, "Итоги матча", teamStats, allTeams);
      try {
        const sentMessage = await ctx.telegram.sendMessage(listMessageChatId, teamsMessage, {
          parse_mode: "HTML",
        });

        // Закрепляем сообщение в группе
        await ctx.telegram.pinChatMessage(listMessageChatId, sentMessage.message_id, {
          disable_notification: true, // Закрепляем без уведомления участников
        }).catch((error) => {
          console.error("Ошибка закрепления сообщения:", error);
        });

        // Удаляем сообщение через 10 секунд
        deleteMessageAfterDelay({ chat: { id: listMessageChatId }, telegram: ctx.telegram }, sentMessage.message_id, 7200000);
      } catch (error) {
        console.error("Ошибка отправки таблицы в группу:", error);
      }
    }
 
    // Сбрасываем состояние
    GlobalState.setPlayers([]);
    GlobalState.setQueue([]);
    GlobalState.setCollectionDate(null);
    GlobalState.setLocation("Локация пока не определена");
    GlobalState.setMaxPlayers(14);
    GlobalState.setStart(false);
    GlobalState.setNotificationSent(false);
    GlobalState.setTeams([]);
    GlobalState.setTeamStats({});
    GlobalState.setPlayingTeams(null);
    GlobalState.setPlayingTeamsMessageId(null);
    GlobalState.setLastTeamCount(null);
    GlobalState.setLastTeamsMessageId(null);
    GlobalState.setDivided(false);
    GlobalState.setIsStatsInitialized(false);

    // Отправляем подтверждение в личку
    const message = await ctx.reply("✅ Сбор успешно завершён!");
    deleteMessageAfterDelay(ctx, message.message_id);
  });
};