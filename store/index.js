const GlobalState = (() => {
  const ADMIN_ID = Number(process.env.ADMIN_ID);
  const GROUP_ID = Number(process.env.ID);
  const IMAGE_URL = process.env.IMAGE_URL;

  let isMatchStarted = false;
  let MAX_PLAYERS = 14;
  let players = [];
  let queue = [];
  let teams = [];
  let collectionDate = null;
  let notificationSent = false;
  let listMessageId = null;
  let location = 'Локации нету';
  let lastTeamCount = null;
  let lastTeamsMessage = null;
  let playingTeams = null;
  let playingTeamsMessageId = null;

  // Новая глобальная переменная для статистики команд
  let teamStats = {};

  const Store = {
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

    setLastTeamsMessageId: (chatId, messageId) => {
      lastTeamsMessage = { chatId, messageId };
    },
    getLastTeamsMessageId: () => lastTeamsMessage,

    setPlayingTeams: (newPlayingTeams) => {
      playingTeams = newPlayingTeams;
    },
    getPlayingTeams: () => playingTeams,

    setPlayingTeamsMessageId: (chatId, messageId) => {
      playingTeamsMessageId = { chatId, messageId };
    },
    getPlayingTeamsMessageId: () => playingTeamsMessageId,

    // Геттер и сеттер для статистики команд
    getTeamStats: () => teamStats,
    setTeamStats: (stats) => teamStats = stats,
  };

  return Object.freeze(Store);
})();

module.exports = { GlobalState };
