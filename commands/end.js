const { Markup } = require('telegraf');
const { deleteMessageAfterDelay } = require('../utils/deleteMessageAfterDelay');
const savePlayersToDatabase = require('../database/savePlayers');
const saveTeamsToDatabase = require('../database/saveTeams');
const { buildTeamsMessage } = require('../message/buildTeamsMessage');
const { locations } = require('../utils/sendPlayerList');
const { selectLeaders } = require('../utils/selectLeaders');
const { selectMvp } = require('../utils/selectMvp');
const { sendPrivateMessage } = require('../message/sendPrivateMessage');
const { generatePlayerStats } = require('../utils/generatePlayerStats');
const { getTeamColor } = require('../utils/getTeamColor');

module.exports = (bot, GlobalState) => {
  // Обработчик pinned_message для удаления системных сообщений
  bot.on('pinned_message', async (ctx) => {
    try {
      await ctx.deleteMessage().catch((error) => {
        console.error(
          'Ошибка при удалении системного сообщения о закреплении:',
          error.message,
        );
      });
    } catch (error) {
      console.error(
        'Общая ошибка в обработчике pinned_message:',
        error.message,
      );
    }
  });

  bot.hears(/^e!$/i, async (ctx) => {
    try {
      // Проверка на валидность ctx.from и ctx.chat
      if (!ctx.from || typeof ctx.from.id !== 'number') {
        console.error('Ошибка: некорректный ctx.from в команде e!');
        return;
      }
      if (!ctx.chat || typeof ctx.chat.id !== 'number') {
        console.error('Ошибка: некорректный ctx.chat в команде e!');
        return;
      }

      const listMessageId = GlobalState.getListMessageId();
      const listMessageChatId = GlobalState.getListMessageChatId();
      const isMatchStarted = GlobalState.getStart();
      const ADMIN_ID = GlobalState.getAdminId();
      const isEndCommandAllowed = GlobalState.getIsEndCommandAllowed();

      // Проверка на валидность ADMIN_ID
      if (!Array.isArray(ADMIN_ID)) {
        console.error('Ошибка: ADMIN_ID не является массивом');
        return;
      }

      // Удаляем сообщение с командой
      await ctx.deleteMessage().catch(() => {});

      // Проверка прав администратора
      if (!ADMIN_ID.includes(ctx.from.id)) {
        const message = await ctx.reply('⛔ У вас нет прав для этой команды.');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Проверка, начат ли матч
      if (!isMatchStarted) {
        const message = await ctx.reply('⚠️ Матч не начат!');
        return deleteMessageAfterDelay(ctx, message.message_id, 6000);
      }

      // Проверка, разрешена ли команда e!
      if (!isEndCommandAllowed) {
        const message = await ctx.reply(
          '⛔ Команда e! запрещена, пока не начат матч между командами (используйте pl).',
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
                  'message to delete not found',
                )
              ) {
                console.warn('Сообщение для удаления не найдено:', {
                  chat_id: listMessageChatId,
                  message_id: listMessageId,
                });
              } else {
                console.error(
                  'Ошибка при удалении сообщения из группы:',
                  error.message,
                );
              }
            });
          GlobalState.setListMessageId(null);
          GlobalState.setListMessageChatId(null);
        } catch (error) {
          console.error('Общая ошибка при удалении сообщения:', error.message);
        }
      }

      const allTeams = GlobalState.getTeams();
      const teamStats = GlobalState.getTeamStats();
      const teamsBase = GlobalState.getTeamsBase();
      const allPlayers = allTeams.flat();
      const leaders = selectLeaders(allPlayers);

      // Находим игроков с желтыми карточками
      const playersWithYellowCards = allPlayers.filter(player => (player.yellowCards || 0) > 0);

      const currentLocationKey = GlobalState.getLocation();
      const loc = locations[currentLocationKey] || locations.prof;


      // Находим лучшего игрока (MVP)
      const mvpPlayer = selectMvp(allPlayers, { allTeams, teamStats });

      const teamMvps = allTeams.map((team) => selectMvp(team)).filter(Boolean);

      let playersWithMvpBonus;
      try {
        // Применяем бонусы за MVP к рейтингу игроков
        // +1 за общий MVP турнира, +0.5 за MVP команды (если не получил общий MVP)
        playersWithMvpBonus = allPlayers.map((player) => {
          if (!player || !player.id) return player;

          const isTournamentMvp = player.id === mvpPlayer?.id;
          // Находим, является ли игрок MVP своей команды
          let playerTeamIndex = -1;
          for (let i = 0; i < allTeams.length; i++) {
            if (allTeams[i] && allTeams[i].some((p) => p && p.id === player.id)) {
              playerTeamIndex = i;
              break;
            }
          }

          const teamMvp = playerTeamIndex >= 0 && playerTeamIndex < teamMvps.length ? teamMvps[playerTeamIndex] : null;
          const isTeamMvp = teamMvp && player.id === teamMvp.id && !isTournamentMvp;

          let mvpBonus = 0;
          if (isTournamentMvp) {
            mvpBonus = 1.0; // +1 за общий MVP турнира
          } else if (isTeamMvp) {
            mvpBonus = 0.5; // +0.5 за MVP команды (только если не получил общий MVP)
          }

          return {
            ...player,
            mvp: isTournamentMvp ? 1 : 0,
            rating: (player.rating || 0) + mvpBonus,
          };
        });

        await savePlayersToDatabase(playersWithMvpBonus);
        GlobalState.appendToPlayersHistory(allPlayers);
      } catch (error) {
        if (error.code === 'ECONNRESET') {
          console.error(
            'Ошибка подключения к базе данных (ECONNRESET). Не удалось сохранить игроков:',
            error.message,
          );
          const message = await ctx.reply(
            '⚠️ Ошибка подключения к базе данных. Данные не сохранены.',
          );
          return deleteMessageAfterDelay(ctx, message.message_id, 6000);
        } else {
          console.error(
            'Ошибка при сохранении игроков в базу данных:',
            error.message,
          );
          const message = await ctx.reply(
            '⚠️ Ошибка при сохранении данных игроков.',
          );
          return deleteMessageAfterDelay(ctx, message.message_id, 6000);
        }
      }

      // Сохраняем команды в базу данных
      try {
        const teamNames = GlobalState.getTeamNames();
        const collectionDate = GlobalState.getCollectionDate() || new Date();

        await saveTeamsToDatabase(allTeams, teamNames, teamStats, collectionDate);
      } catch (error) {
        // Не прерываем выполнение, если не удалось сохранить команды
        // Логируем ошибку, но продолжаем работу
        console.error(
          'Ошибка при сохранении команд в базу данных:',
          error.message,
        );
      }

      // Отправляем персональную статистику каждому участнику, если это турнир
      if (currentLocationKey === 'tr' && allTeams.length > 0) {
        // Отправляем персональную статистику каждому участнику (используем playersWithMvpBonus — рейтинг с учётом MVP, как в БД)
        try {
          for (const player of playersWithMvpBonus) {
            if (!player || !player.id) continue;
            // Находим команду игрока
            let playerTeamIndex = -1;
            for (let i = 0; i < allTeams.length; i++) {
              if (allTeams[i].some(p => p && p.id === player.id)) {
                playerTeamIndex = i;
                break;
              }
            }

            if (playerTeamIndex >= 0) {
              const playerStatsMessage = generatePlayerStats(
                player,
                playerTeamIndex,
                teamStats,
                allTeams,
                mvpPlayer,
                GlobalState.getCollectionDate?.(),
                teamsBase,
              );

              try {
                await sendPrivateMessage(bot, player.id, playerStatsMessage, {
                  parse_mode: 'HTML',
                });
                // Небольшая задержка между отправками, чтобы не перегружать API
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (playerError) {
                // Игнорируем ошибки при отправке отдельным игрокам
                console.log(`Не удалось отправить статистику игроку ${player.id}:`, playerError.message);
              }
            }
          }
        } catch (error) {
          console.error('Ошибка при отправке персональной статистики:', error.message);
          // Не прерываем выполнение, если не удалось отправить статистику
        }
      }

      // Формируем сообщение с итогами и локацией
      if (listMessageChatId && allTeams.length > 0) {
        const collectionDate = GlobalState.getCollectionDate();
        let formattedDate = '';
        if (collectionDate) {
          const day = String(collectionDate.getDate()).padStart(2, '0');
          const month = String(collectionDate.getMonth() + 1).padStart(2, '0');
          const year = collectionDate.getFullYear();
          formattedDate = ` ${day}.${month}.${year}`;
        }

        // Добавляем локацию в заголовок
        const matchTitle = `Итоги матча${formattedDate} • ${loc.name}`;

        let teamsMessage = buildTeamsMessage(
          teamsBase,
          matchTitle,
          teamStats,
          allTeams,
          mvpPlayer,
          false,
          leaders,
          playersWithYellowCards,
        );

        if (teamMvps.length > 0) {
          // Функция для форматирования имени MVP команды с сокращением (максимум 16 символов)
          const formatTeamMvpName = (player) => {
            const name = player?.username || player?.name || `${player?.first_name || ''} ${player?.last_name || ''}`.trim();
            if (!name) return 'Unknown';

            const nameStr = String(name);
            // Удаляем эмодзи и декоративные Unicode-символы
            // eslint-disable-next-line no-misleading-character-class
            const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{FF00}-\u{FFEF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
            const cleanName = nameStr.replace(emojiRegex, '').trim();

            if (!cleanName) return 'Unknown';

            const chars = Array.from(cleanName);
            if (chars.length <= 16) {
              return cleanName;
            }
            return chars.slice(0, Math.max(2, 16 - 2)).join('') + '..';
          };

          teamsMessage += '\n<b>Лидеры своих команд</b>\n';
          const teamMvpLines = teamMvps.map((p, idx) => {
            const color = getTeamColor(idx);
            const name = formatTeamMvpName(p);
            return `${color} MVP: ${name}`;
          }).join('\n');
          teamsMessage += `\n${teamMvpLines}`;
        }

        const paymentReminder =
          `<b>💰 Напоминаем об оплате участия: ${loc.sum} ₽</b>\n` +
          '- <b>Перевод СБЕРБАНК</b> (Павел С.):\n' +
          '  📱 <a href="tel:89166986185"><code>89166986185</code></a>\n' +
          '  🔗 <a href="https://messenger.online.sberbank.ru/sl/JWnaTcQf0aviSEAxy">Оплатить участие</a>\n' +
          '  ❗ <b>Укажите в комментарии к переводу ваш ник из списка на игру</b>\n';

        const vkLinkMessage =
          `${teamsMessage}\n\n` +
          '🌐 <b>Рейтинг игроков:</b> <a href="https://football.pavelsolntsev.ru">football.pavelsolntsev.ru</a>\n' +
          '🏆 <b>Список команд:</b> <a href="https://football.pavelsolntsev.ru/tournament/">football.pavelsolntsev.ru/tournament</a>\n' +
          'ℹ️ <b>Информация:</b> <a href="https://football.pavelsolntsev.ru/info">football.pavelsolntsev.ru/info</a>\n' +
          '📣 <b>Группа ВКонтакте:</b> <a href="https://vk.com/rmsfootball">VK RmsFootball</a>\n\n' +
          'Чтобы просмотреть историю матчей, напишите <a href="http://t.me/football_ramen_bot">боту</a> <b>«результаты»</b> в личном сообщении.\n\n' +
          (currentLocationKey === 'tr' ? '' : paymentReminder);

        try {
          const sentMessage = await ctx.telegram.sendMessage(
            listMessageChatId,
            vkLinkMessage,
            {
              parse_mode: 'HTML',
              disable_notification: true,
              reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('📊 Результаты', 'show_results')],
              ]).reply_markup,
            },
          );

          await ctx.telegram
            .unpinChatMessage(listMessageChatId, sentMessage.message_id)
            .catch((error) => {
              console.log(
                'Сообщение не было закреплено или ошибка при откреплении:',
                error.message,
              );
            });
        } catch (error) {
          console.error('Ошибка при отправке таблицы в группу:', error.message);
        }
      }

      // Полностью сбрасываем турнирное состояние в памяти,
      // но сохраняем результаты матчей до старта нового турнира.
      GlobalState.resetTournamentState({ preserveMatchResults: true });

      const message = await ctx.reply('✅ Сбор успешно завершён!');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    } catch (error) {
      console.error('Необработанная ошибка в обработчике команды e!:', error.message);
      const message = await ctx.reply('⚠️ Произошла ошибка при обработке команды.');
      deleteMessageAfterDelay(ctx, message.message_id, 6000);
    }
  });
};
