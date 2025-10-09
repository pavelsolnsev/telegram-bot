const { GlobalState } = require("../store");
const { deleteMessageAfterDelay } = require("./deleteMessageAfterDelay");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");
const { locations } = require("../utils/sendPlayerList");

async function checkTimeAndNotify(bot) {
  let collectionDate = GlobalState.getCollectionDate();
  let notificationSent = GlobalState.getNotificationSent();
  let isMatchStarted = GlobalState.getStart();
  const players = GlobalState.getPlayers();
  const groupChatId = GlobalState.getGroupId();

  if (!isMatchStarted || !collectionDate || notificationSent) return;

  const now = new Date();
  const timeDiff = collectionDate - now;

  if (timeDiff <= 0) {
    return;
  }

  const currentLocationKey = GlobalState.getLocation();
  const loc = locations[currentLocationKey] || locations.prof;

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  if (timeDiff <= THREE_HOURS_MS) {
    const additionalInfo =
      `\n📌 <b>Важно:</b>\n` +
      `• Cоставы формируются за 2 часа до матча. После этого записаться или выйти нельзя.\n` +
      `• Неявка без предупреждения (за 3 часа): первое — предупреждение, повторно — ограничение участия.\n` +
      `Спасибо за ответственный подход!`;

    try {
      await bot.telegram.getChat(groupChatId);
      const message = await bot.telegram.sendMessage(
        groupChatId,
        `⏰ <b>Матч начнётся через 3 часа!</b>\n\n` +
          `📍 <b>Локация:</b> ${loc.name} \n` +
          `📅 <b>Когда:</b> ${collectionDate.toLocaleString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            day: "numeric",
            month: "long",
          })}\n\n` +
          `✅ <b>Что нужно сделать:</b>\n` +
          `  • Подготовить экипировку\n` +
          `  • Оплатить участие (${loc.sum} ₽)\n` +
          `  • Прибыть за 15 минут до начала\n\n` +
          `📢 <b>Напоминание:</b> После матча смотрите снимки и трансляции в нашей <a href="https://vk.com/ramafootball">группе VK</a>!\n` +
          `🏅 <b>Рейтинг:</b> Посмотреть рейтинг игроков можно тут: <a href="https://football.pavelsolntsev.ru">https://football.pavelsolntsev.ru/</a>\n` +
          additionalInfo,
        {
          parse_mode: "HTML",
          link_preview_options: {
            url: "https://vk.com/ramafootball",
            prefer_large_media: true,
          },
        }
      );
      deleteMessageAfterDelay(
        { telegram: bot.telegram, chat: { id: groupChatId } },
        message.message_id,
        THREE_HOURS_MS
      );
    } catch (error) {
      console.error(
        `Ошибка при отправке сообщения в группу ${groupChatId}:`,
        error
      );
      return;
    }

    const privateMessageText =
      `⏰ <b>Матч начнётся через 3 часа!</b>\n\n` +
      `📍 <b>Локация:</b> ${loc.name} \n` +
      `📅 <b>Когда:</b> ${collectionDate.toLocaleString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "long",
      })}\n\n` +
      `✅ <b>Что нужно сделать:</b>\n` +
      `  • Подготовить экипировку\n` +
      `  • Оплатить участие (${loc.sum} ₽)\n` +
      `  • Прибыть за 15 минут до начала\n\n` +
      `📢 <b>Напоминание:</b> После матча смотрите снимки и трансляции в нашей <a href="https://vk.com/ramafootball">группе VK</a>!\n` +
      `🏅 <b>Рейтинг:</b> Посмотреть рейтинг игроков можно тут: <a href="https://football.pavelsolntsev.ru">https://football.pavelsolntsev.ru/</a>\n` +
      additionalInfo;

    for (const player of players) {
      await sendPrivateMessage(bot, player.id, privateMessageText, {
        parse_mode: "HTML",
        link_preview_options: {
          url: "https://vk.com/ramafootball",
          prefer_large_media: true,
        },
      });
    }

    GlobalState.setNotificationSent(true);
  }
}

module.exports = { checkTimeAndNotify };
