const { GlobalState } = require('../store');
const { deleteMessageAfterDelay } = require('./deleteMessageAfterDelay');
const { sendPrivateMessage } = require('../message/sendPrivateMessage');
const { locations } = require('../utils/sendPlayerList');

async function checkTimeAndNotify(bot) {
  const collectionDate = GlobalState.getCollectionDate();
  const notificationSent = GlobalState.getNotificationSent();
  const isMatchStarted = GlobalState.getStart();
  const players = GlobalState.getPlayers();
  const groupChatId = GlobalState.getGroupId();

  if (!isMatchStarted || !collectionDate || notificationSent) return;

  const now = new Date();
  const timeDiff = collectionDate - now;

  // Если время уже наступило, выходим
  if (timeDiff <= 0) return;

  const currentLocationKey = GlobalState.getLocation();
  const loc = locations[currentLocationKey] || locations.prof;

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  // Проверяем, что до начала осталось 3 часа или меньше, но время еще не наступило
  // Важно: timeDiff должен быть > 0 и <= THREE_HOURS_MS
  if (timeDiff > 0 && timeDiff <= THREE_HOURS_MS) {
    let groupMessageText;
    let privateMessageText;

    if (currentLocationKey === 'tr') {
      const commonText =
        '🏆 <b>⚡ Турнир РФОИ ⚡</b>\n\n' +
        '⏰ <b>Начало через 3 часа!</b>\n\n' +
        '📍 <b>Локация:</b> Красное Знамя\n' +
        `📅 <b>Когда:</b> ${collectionDate.toLocaleString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'long',
        })}\n\n` +
        '✅ <b>Что нужно сделать:</b>\n' +
        '  • Прибыть за 15 минут до начала\n' +
        '  • Остаться на совместное фото в конце матча\n' +
        '\n🌐 <b>Рейтинг игроков:</b> <a href="https://football.pavelsolntsev.ru">football.pavelsolntsev.ru</a>\n' +
        '🏆 <b>Список команд:</b> <a href="https://football.pavelsolntsev.ru/tournament/">football.pavelsolntsev.ru/tournament</a>\n' +
        '📣 <b>Группа ВКонтакте:</b> <a href="https://vk.com/ramafootball">VK RamaFootball</a>\n';

      groupMessageText = commonText;
      privateMessageText = commonText;
    } else {
      // ===== Обычное уведомление =====
      const additionalInfo =
        '\n📌 <b>Важно:</b>\n' +
        '• Cоставы формируются за 2 часа до матча. После этого записаться или выйти нельзя.\n' +
        '• Неявка без предупреждения (за 3 часа): первое — предупреждение, повторно — ограничение участия.\n' +
        'Спасибо за ответственный подход!';

      const baseText =
        '⏰ <b>Матч начнётся через 3 часа!</b>\n\n' +
        `📍 <b>Локация:</b> ${loc.name} \n` +
        `📅 <b>Когда:</b> ${collectionDate.toLocaleString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'long',
        })}\n\n` +
        '✅ <b>Что нужно сделать:</b>\n' +
        '  • Подготовить экипировку\n' +
        `  • <a href="https://messenger.online.sberbank.ru/sl/JWnaTcQf0aviSEAxy">Оплатить участие (${loc.sum} ₽)</a>\n` +
        '  • Прибыть за 15 минут до начала\n' +
        '  • Остаться на совместное фото в конце матча\n' +
        '\n🌐 <b>Рейтинг игроков:</b> <a href="https://football.pavelsolntsev.ru">football.pavelsolntsev.ru</a>\n' +
        '🏆 <b>Список команд:</b> <a href="https://football.pavelsolntsev.ru/tournament/">football.pavelsolntsev.ru/tournament</a>\n' +
        '📣 <b>Группа ВКонтакте:</b> <a href="https://vk.com/ramafootball">VK RamaFootball</a>\n' +
        additionalInfo;

      groupMessageText = baseText;
      privateMessageText = baseText;
    }

    try {
      await bot.telegram.getChat(groupChatId);
      const message = await bot.telegram.sendMessage(
        groupChatId,
        groupMessageText,
        {
          parse_mode: 'HTML',
          link_preview_options: {
            url: 'https://vk.com/ramafootball',
            prefer_large_media: true,
          },
        },
      );

      deleteMessageAfterDelay(
        { telegram: bot.telegram, chat: { id: groupChatId } },
        message.message_id,
        THREE_HOURS_MS,
      );

      // Отправляем личные сообщения игрокам (ошибки здесь не критичны)
      for (const player of players) {
        try {
          await sendPrivateMessage(bot, player.id, privateMessageText, {
            parse_mode: 'HTML',
            link_preview_options: {
              url: 'https://vk.com/ramafootball',
              prefer_large_media: true,
            },
          });
        } catch (playerError) {
          // Игнорируем ошибки при отправке личных сообщений
          // Групповое сообщение уже отправлено, это не критично
          console.error(
            `Ошибка при отправке личного сообщения игроку ${player.id}:`,
            playerError,
          );
        }
      }

      // Устанавливаем флаг только после успешной отправки всех сообщений
      GlobalState.setNotificationSent(true);
    } catch (error) {
      console.error(
        `Ошибка при отправке сообщения в группу ${groupChatId}:`,
        error,
      );
      // Устанавливаем флаг даже при ошибке, чтобы не пытаться отправлять бесконечно
      GlobalState.setNotificationSent(true);
      return;
    }
  }
}

module.exports = { checkTimeAndNotify };
