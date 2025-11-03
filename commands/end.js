const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const savePlayersToDatabase = require("../database/savePlayers");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");
const { locations } = require("../utils/sendPlayerList");

module.exports = (bot, GlobalState) => {
  // Обработчик pinned_message для удаления системных сообщений
  bot.on("pinned_message", async (ctx) => {
    try {
      await ctx.deleteMessage().catch((error) => {
        console.error(
          "Ошибка при удалении системного сообщения о закреплении:",
          error.message
        );
      });
    } catch (error) {
      console.error(
        "Общая ошибка в обработчике pinned_message:",
        error.message
      );
    }
  });

  bot.hears(/^e!$/i, async (ctx) => {
    try {
      const listMessageId = GlobalState.getListMessageId();
      const listMessageChatId = GlobalState.getListMessageChatId();
      const isMatchStarted = GlobalState.getStart();
      const ADMIN_ID = GlobalState.getAdminId();
      const isEndCommandAllowed = GlobalState.getIsEndCommandAllowed();

      // Удаляем сообщение с командой
      await ctx.deleteMessage().catch(() => {});

      // Проверка прав администратора
      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await ctx.reply("⛔ У вас нет прав для этой команды.");
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Проверка, начат ли матч
      if (!isMatchStarted) {
        const message = await ctx.reply("⚠️ Матч не начат!");
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Проверка, разрешена ли команда e!
      if (!isEndCommandAllowed) {
        const message = await ctx.reply(
          "⛔ Команда e! запрещена, пока не начат матч между командами (используйте pl)."
        );
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Удаляем сообщение со списком игроков из группы
      if (listMessageId && listMessageChatId) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await ctx.telegram
            .deleteMessage(listMessageChatId, listMessageId)
            .catch((error) => {
              if (
                error.response?.error_code === 400 &&
                error.response?.description.includes(
                  "message to delete not found"
                )
              ) {
                console.warn("Сообщение для удаления не найдено:", {
                  chat_id: listMessageChatId,
                  message_id: listMessageId,
                });
              } else {
                console.error(
                  "Ошибка при удалении сообщения из группы:",
                  error.message
                );
              }
            });
          GlobalState.setListMessageId(null);
          GlobalState.setListMessageChatId(null);
        } catch (error) {
          console.error("Общая ошибка при удалении сообщения:", error.message);
        }
      }

      const allTeams = GlobalState.getTeams();
      const teamStats = GlobalState.getTeamStats();
      const teamsBase = GlobalState.getTeamsBase();
      const allPlayers = allTeams.flat();

      const currentLocationKey = GlobalState.getLocation();
      const loc = locations[currentLocationKey] || locations.prof;


      // Находим лучшего игрока (MVP)
      const mvpCandidates = allPlayers.reduce((best, player) => {
        if (!best.length) return [player];
        const topPlayer = best[0];

        if (player.goals > topPlayer.goals) return [player];
        if (player.goals < topPlayer.goals) return best;

        const playerPoints = player.wins * 3 + player.draws;
        const topPlayerPoints = topPlayer.wins * 3 + topPlayer.draws;

        if (playerPoints > topPlayerPoints) return [player];
        if (playerPoints < topPlayerPoints) return best;

        if (player.rating > topPlayer.rating) return [player];
        if (player.rating === topPlayer.rating) return [...best, player];

        return best;
      }, []);

      const mvpPlayer =
        mvpCandidates[Math.floor(Math.random() * mvpCandidates.length)];

      try {
        await savePlayersToDatabase(allPlayers);
        GlobalState.appendToPlayersHistory(allPlayers);
      } catch (error) {
        if (error.code === "ECONNRESET") {
          console.error(
            "Ошибка подключения к базе данных (ECONNRESET). Не удалось сохранить игроков:",
            error.message
          );
          const message = await ctx.reply(
            "⚠️ Ошибка подключения к базе данных. Данные не сохранены."
          );
          return deleteMessageAfterDelay(ctx, message.message_id, 6000);
        } else {
          console.error(
            "Ошибка при сохранении игроков в базу данных:",
            error.message
          );
          const message = await ctx.reply(
            "⚠️ Ошибка при сохранении данных игроков."
          );
          return deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }

      

      // Формируем сообщение с итогами и локацией
      if (listMessageChatId && allTeams.length > 0) {
        const collectionDate = GlobalState.getCollectionDate();
        let formattedDate = "";
        if (collectionDate) {
          const day = String(collectionDate.getDate()).padStart(2, "0");
          const month = String(collectionDate.getMonth() + 1).padStart(2, "0");
          const year = collectionDate.getFullYear();
          formattedDate = ` ${day}.${month}.${year}`;
        }

        // Добавляем локацию в заголовок
        const matchTitle = `Итоги матча${formattedDate} • ${loc.name}`;

        const teamsMessage = buildTeamsMessage(
          teamsBase,
          matchTitle,
          teamStats,
          allTeams,
          mvpPlayer,
          false
        );

        const paymentReminder =
          `<b>💰 Напоминаем об оплате участия: ${loc.sum} ₽</b>\n` +
          `- <b>Перевод СБЕРБАНК</b> (Павел С.):\n` +
          `  📱 <a href="tel:89166986185"><code>89166986185</code></a>\n` +
          `  🔗 <a href="https://messenger.online.sberbank.ru/sl/JWnaTcQf0aviSEAxy">Оплатить участие</a>\n` +
          `  ❗ <b>Укажите в комментарии к переводу ваш ник из списка на игру</b>\n`;

        const vkLinkMessage =
          `${teamsMessage}\n\n` +
          '🌐 <b>Рейтинг игроков:</b> <a href="https://football.pavelsolntsev.ru">football.pavelsolntsev.ru</a>\n' +
          '🏆 <b>Список команд:</b> <a href="https://football.pavelsolntsev.ru/tournament/">football.pavelsolntsev.ru/tournament</a>\n' +
          '📣 <b>Группа ВКонтакте:</b> <a href="https://vk.com/ramafootball">VK RamaFootball</a>\n\n' +
          `Чтобы просмотреть историю матчей, напишите <b>«результаты»</b> в личные сообщения <a href="http://t.me/football_ramen_bot">боту</a>.\n\n` +
          (currentLocationKey === "tr" ? "" : paymentReminder);

        try {
          const sentMessage = await ctx.telegram.sendMessage(
            listMessageChatId,
            vkLinkMessage,
            {
              parse_mode: "HTML",
              disable_notification: true,
            }
          );

          await ctx.telegram
            .unpinChatMessage(listMessageChatId, sentMessage.message_id)
            .catch((error) => {
              console.log(
                "Сообщение не было закреплено или ошибка при откреплении:",
                error.message
              );
            });
        } catch (error) {
          console.error("Ошибка при отправке таблицы в группу:", error.message);
        }
      }

      // Сбрасываем состояние
      GlobalState.setPlayers([]);
      GlobalState.setQueue([]);
      GlobalState.setCollectionDate(null);
      GlobalState.setMaxPlayers(20);
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
      GlobalState.setIsMatchFinished(false);
      GlobalState.setIsEndCommandAllowed(true);
      GlobalState.setIsTeamCommandAllowed(true);
      GlobalState.setMatchHistory({});
      GlobalState.setConsecutiveGames({});
      GlobalState.setIsTableAllowed(false);
      GlobalState.setReferee('Карен');

      const message = await ctx.reply("✅ Сбор успешно завершён!");
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    } catch (error) {
      console.error("Необработанная ошибка в обработчике команды e!:", error.message);
      const message = await ctx.reply("⚠️ Произошла ошибка при обработке команды.");
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};
