const { GlobalState } = require("../store");
// const { sendPrivateMessage } = require("../message/sendPrivateMessage");
const { deleteMessageAfterDelay } = require("./deleteMessageAfterDelay");

// Функция для проверки времени и отправки уведомления о матче
function checkTimeAndNotify(bot) {
  let collectionDate = GlobalState.getCollectionDate(); // Получаем дату и время матча
  let notificationSent = GlobalState.getNotificationSent(); // Проверяем, было ли уже отправлено уведомление
  let isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
  const players = GlobalState.getPlayers(); // Получаем список игроков
  const groupChatId = GlobalState.getGroupId(); // ID группы

  // Если матч не начат, нет даты или уведомление уже отправлено — ничего не делаем
  if (!isMatchStarted || !collectionDate || notificationSent) return;

  const now = new Date(); // Текущее время
  const timeDiff = collectionDate - now; // Разница во времени между сейчас и матчем

  // Если время матча уже прошло, останавливаем матч
  if (timeDiff <= 0) {
    GlobalState.setStart(false); // Останавливаем матч
    return;
  }

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // Время в миллисекундах (3 часа)
  if (timeDiff <= THREE_HOURS_MS) {
    // Формируем сокращённый текст дополнительной информации
    const additionalInfo = `\n📌 <b>Важно:</b>\n` +
      `• В 19:00 формируются составы. После этого записаться или выйти нельзя.\n` +
      `• Неявка без предупреждения (за 3 часа): первое — предупреждение, повторно — ограничение участия.\n` +
      `Спасибо за ответственный подход!`;

    // Отправляем напоминание в группу
    bot.telegram
      .sendMessage(
        groupChatId,
        `⏰ <b>Матч начнётся через 3 часа!</b>\n\n` +
          `📅 <b>Когда:</b> ${collectionDate.toLocaleString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            day: "numeric",
            month: "long",
          })}\n` +
          `💸 <a href="https://www.tbank.ru/cf/5jUDsBhRfBT">Оплатить участие (400 ₽)</a>\n` +
          `✅ Приходите за 15 минут!\n\n` +
          `📢 Следите за фото и трансляциями в <a href="https://vk.com/ramafootball">группе VK</a>!\n` +
          `🏅 Рейтинг игроков: <a href="https://football.pavelsolntsev.ru">тут</a>\n` +
          additionalInfo,
        {
          parse_mode: "HTML",
          link_preview_options: {
            url: "https://vk.com/ramafootball",
            prefer_large_media: true, // Для большего превью
          },
        }
      )
      .then((message) => {
        deleteMessageAfterDelay(
          { telegram: bot.telegram, chat: { id: groupChatId } },
          message.message_id,
          THREE_HOURS_MS
        );
      })
      .catch((error) => {
        console.error(`Ошибка при отправке сообщения в группу ${groupChatId}:`, error);
      });

    // Отправляем уведомления в личные сообщения игрокам
    players.forEach((player) => {
      bot.telegram
        .sendMessage(
          player.id,
          `⏰ <b>Матч начнётся через 3 часа!</b>\n\n` +
            `📅 <b>Когда:</b> ${collectionDate.toLocaleString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "long",
            })}\n\n` +
            `✅ <b>Что нужно сделать:</b>\n` +
            `  • Подготовить экипировку\n` +
            `  • <a href="https://www.tbank.ru/cf/5jUDsBhRfBT">Оплатить участие (400 ₽)</a>\n` +
            `  • Прибыть за 15 минут до начала\n\n` +
            `📢 <b>Напоминание:</b> После матча смотрите снимки и трансляции в нашей <a href="https://vk.com/ramafootball">группе VK</a>!\n` +
            `🏅 <b>Рейтинг:</b> Посмотреть рейтинг игроков можно тут: <a href="https://football.pavelsolntsev.ru">https://football.pavelsolntsev.ru/</a>\n` +
            additionalInfo,
          {
            parse_mode: "HTML",
            link_preview_options: {
              url: "https://vk.com/ramafootball",
              prefer_large_media: true, // Для большего превью
            },
          }
        )
        .catch((error) => {
          console.error(`Ошибка при отправке личного сообщения пользователю ${player.id}:`, error);
        });
    });

    GlobalState.setNotificationSent(true); // Помечаем, что уведомление отправлено
  }
}

module.exports = { checkTimeAndNotify };