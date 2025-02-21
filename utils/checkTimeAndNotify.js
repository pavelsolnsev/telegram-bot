const { GlobalState } = require("../store");
const { sendPrivateMessage } = require("../message/sendPrivateMessage");

// Функция для проверки времени и отправки уведомления о матче
function checkTimeAndNotify(bot) {
  let collectionDate = GlobalState.getCollectionDate(); // Получаем дату и время матча
  let notificationSent = GlobalState.getNotificationSent(); // Проверяем, было ли уже отправлено уведомление
  let isMatchStarted = GlobalState.getStart(); // Проверяем, начат ли матч
  const players = GlobalState.getPlayers(); // Получаем список игроков
  let location = GlobalState.getLocation(); // Получаем место проведения

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
  if (timeDiff <= THREE_HOURS_MS) { // Если до матча осталось менее 3 часов
    // Отправляем уведомление каждому игроку
    players.forEach(player => {
      sendPrivateMessage(
        bot, 
        player.id, 
        `⏰ <b>До начала матча осталось менее 3 часов!</b>\n\n` +
        `Не забудьте:\n` +
        `✅ Подготовить экипировку\n` +
        `✅ Оплатить участие\n` +
        `✅ Прийти за 15 минут до начала\n\n` +
        `📍 Место: ${location}\n` +  
        `🕒 Время: ${collectionDate.toLocaleString("ru-RU", { 
          hour: "2-digit", 
          minute: "2-digit",
          day: "numeric",
          month: "long"
        })}`
      );
    });
    GlobalState.setNotificationSent(true); // Помечаем, что уведомление отправлено
  }
}

module.exports = { checkTimeAndNotify };
