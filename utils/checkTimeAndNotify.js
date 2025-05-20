const { GlobalState } = require("../store");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");

// Функция для проверки времени и отправки уведомления о матче
function checkTimeAndNotify(bot) {
  let collectionDate = GlobalState.getCollectionDate(); // Получаем дату и время матча
  let notificationSent = GlobalState.getNotificationSent(); // Проверяем, было ли уже отправлено уведомление
  let isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
  const players = GlobalState.getPlayers(); // Получаем список игроков

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
    // Если до матча осталось менее 3 часов
    // Отправляем уведомление каждому игроку
    players.forEach((player) => {
      sendPrivateMessage(
        bot,
        player.id,
        `⏰ <b>Матч уже через 3 часа!</b>\n\n` +
          `📅 <b>Когда:</b> ${collectionDate.toLocaleString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            day: "numeric",
            month: "long",
          })}\n\n` +
          `✅ <b>Что нужно сделать:</b>\n` +
          `  • Подготовить экипировку\n` +
          `  • Оплатить участие (400 ₽)\n` +
          `  • Прибыть за 15 минут до начала\n\n` +
          `💸 <b>Оплата:</b>\n` +
          `  • <b>Онлайн:</b> <code>📲 89166986185</code> или <code>💳 2200700430851708</code>\n` +
          `  • <b>Наличные:</b> На месте\n\n` +
          `📢 <b>Напоминание:</b> После матча смотрите снимки и трансляции в нашей <a href="https://vk.com/ramafootball">группе VK</a>!\n` +
          `🏅 <b>Рейтинг:</b> Посмотреть рейтинг игроков можно тут: <a href="googlechrome://football.pavelsolntsev.ru">https://football.pavelsolntsev.ru/</a>`
      );
    });
    GlobalState.setNotificationSent(true); // Помечаем, что уведомление отправлено
  }
}

module.exports = { checkTimeAndNotify };
