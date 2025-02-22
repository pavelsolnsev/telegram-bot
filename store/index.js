const GlobalState = (() => {
  // Получаем ID группы и ID администратора из переменных окружения
  const ADMIN_ID = Number(process.env.ADMIN_ID);
  const GROUP_ID = Number(process.env.ID);
  const IMAGE_URL = process.env.IMAGE_URL;

  // Флаги и данные для матча
  let isMatchStarted = false;
  let MAX_PLAYERS = 14;  // Максимальное количество игроков
  let players = [];       // Массив игроков (объекты с id, именем и username)
  let queue = [];         // Очередь игроков
  let teams = [];
  let collectionDate = null;  // Дата и время сбора игроков
  let notificationSent = false;  // Флаг отправки уведомлений о матче
  let listMessageId = null;  // ID сообщения со списком игроков
  let location = 'Локации нету'; // Локация

  // Новая переменная для хранения последнего количества команд
  let lastTeamCount = null; // число команд

  // Новая переменная для хранения ID последнего сообщения с командами
  let lastTeamsMessage = null; // объект с chatId и messageId

  const Store = {
    // Геттеры и сеттеры для всех переменных состояния
    getAdminId: () => ADMIN_ID,
    getGroupId: () => GROUP_ID,
    getStart: () => isMatchStarted,
    setStart: (status) => isMatchStarted = status,
    getMaxPlayers: () => MAX_PLAYERS,
    setMaxPlayers: (number) => MAX_PLAYERS = number,
    getPlayers: () => players,
    setPlayers: (array) => players = array,
    getQueue: () => queue,
    setQueue: (array) => queue = array,
    getCollectionDate: () => collectionDate,
    setCollectionDate: (date) => collectionDate = date,
    getLocation: () => location,
    setLocation: (string) => location = string,
    getNotificationSent: () => notificationSent,
    setNotificationSent: (status) => notificationSent = status,
    getListMessageId: () => listMessageId,
    setListMessageId: (id) => listMessageId = id,
    getIMAGE_URL: () => IMAGE_URL,
    setIMAGE_URL: (url) => IMAGE_URL = url,
    getTeams: () => teams,
    setTeams: (newTeams) => teams = newTeams,
    getLastTeamCount: () => lastTeamCount,
    setLastTeamCount: (num) => lastTeamCount = num,

    // Методы для работы с последним сообщением с составами команд
    setLastTeamsMessageId: (chatId, messageId) => {
      lastTeamsMessage = { chatId, messageId };
    },
    getLastTeamsMessageId: () => lastTeamsMessage,
  };

  return Object.freeze(Store); // Защищаем объект от изменений
})();

module.exports = { GlobalState };
