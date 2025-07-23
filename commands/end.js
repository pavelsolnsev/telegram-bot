const { deleteMessageAfterDelay } = require("../utils/deleteMessageAfterDelay");
const savePlayersToDatabase = require("../database/savePlayers");
const { buildTeamsMessage } = require("../message/buildTeamsMessage");

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

      // Находим лучшего игрока (MVP) по новым критериям
      const mvpCandidates = allPlayers.reduce((best, player) => {
        if (!best.length) return [player];
        const topPlayer = best[0];

        // 1. Сравниваем по количеству голов
        if (player.goals > topPlayer.goals) return [player];
        if (player.goals < topPlayer.goals) return best;

        // 2. Если голы равны, сравниваем по очкам (3 за победу, 1 за ничью, 0 за поражение)
        const playerPoints = player.wins * 3 + player.draws;
        const topPlayerPoints = topPlayer.wins * 3 + topPlayer.draws;

        if (playerPoints > topPlayerPoints) return [player];
        if (playerPoints < topPlayerPoints) return best;

        // 3. Если очки равны, сравниваем по рейтингу
        if (player.rating > topPlayer.rating) return [player];
        if (player.rating === topPlayer.rating) return [...best, player];

        return best;
      }, []);

      // Выбираем случайного игрока из кандидатов с одинаковой статистикой
      const mvpPlayer =
        mvpCandidates[Math.floor(Math.random() * mvpCandidates.length)];

      // Сохраняем игроков в базу данных
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

      // Отправляем сообщение с таблицей в группу
      if (listMessageChatId && allTeams.length > 0) {
        const collectionDate = GlobalState.getCollectionDate();
        let formattedDate = "";
        if (collectionDate) {
          const day = String(collectionDate.getDate()).padStart(2, "0");
          const month = String(collectionDate.getMonth() + 1).padStart(2, "0");
          const year = collectionDate.getFullYear();
          formattedDate = ` ${day}.${month}.${year}`;
        }

        const matchTitle = `Итоги матча${formattedDate}`;

        // Формируем сообщение с командами, передавая MVP
        const teamsMessage = buildTeamsMessage(
          teamsBase,
          matchTitle,
          teamStats,
          allTeams,
          mvpPlayer,
          false
        );
        const vkLinkMessage =
          `${teamsMessage}\n\n` +
          `<b>📸 Смотрите фото и видео матча!</b>\n` +
          `Список игроков можно посмотреть здесь <a href="https://football.pavelsolntsev.ru">football.pavelsolntsev.ru</a>\n` +
          `Все материалы доступны в нашей группе: <a href="https://vk.com/ramafootball">VK RamaFootball</a>`;

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

      // Сбрасываем состояние, включая matchHistory и consecutiveGames
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
      // Отправляем подтверждение
      const message = await ctx.reply("✅ Сбор успешно завершён!");
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    } catch (error) {
      console.error(
        "Необработанная ошибка в обработчике команды e!:",
        error.message
      );
      const message = await ctx.reply(
        "⚠️ Произошла ошибка при обработке команды."
      );
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};