const GlobalState = (() => {

  // Получаем ID группы и ID администратора из переменных окружения
  const ADMIN_ID = Number(process.env.ADMIN_ID)

  const GROUP_ID = Number(process.env.ID)

  const IMAGE_URL = process.env.IMAGE_URL

  // старт матча
  let isMatchStarted = false
  
  // Максимальное количество игроков
  let MAX_PLAYERS = 14

  // Массив для хранения игроков (объекты с id, именем и username)
  let players = [];

  // Массив для хранения игроков в очереди
  let queue = [];

  // Дата и время сбора на матч
  let collectionDate = null;

  // Переменная для отслеживания отправки уведомления о матче
  let notificationSent = false;

  // Переменная для хранения ID сообщения со списком игроков
  let listMessageId = null;
  
  const Store = {

    getAdminId: () => ADMIN_ID,

    getGroupId: () => GROUP_ID,

    getStart: () => isMatchStarted,
    setStart: status => isMatchStarted = status,

    getMaxPlayers: () => MAX_PLAYERS,
    setMaxPlayers: number => MAX_PLAYERS = number,

    getPlayers: () => players,
    setPlayers: array => players = array,

    getQueue: () => queue,
    setQueue: array => queue = array,
    
    getCollectionDate: () => collectionDate,
    setCollectionDate: status => collectionDate = status,

    getLocation: () => location,
    setLocation: string => location = string,
    
    getNotificationSent: () => notificationSent,
    setNotificationSent: status => notificationSent = status,

    getListMessageId: () => listMessageId,
    setListMessageId: status => listMessageId = status,

    getIMAGE_URL: () => IMAGE_URL,
    setIMAGE_URL: string => IMAGE_URL = string,
  }
  return Object.freeze(Store);
})();

module.exports = { GlobalState };