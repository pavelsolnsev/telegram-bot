const GlobalState = (() => {
  const ADMIN_ID = Number(process.env.ADMIN_ID);
  const GROUP_ID = Number(process.env.ID);
  const IMAGE_URL = process.env.IMAGE_URL;

  let isMatchStarted = false;
  let isTeamsDivided = false;
  let isStatsInitialized = false;
  let MAX_PLAYERS = 14;
  let players = [];
  let teamsBase = [];
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
  let teamStats = {};
  let allPlayersHistory = []; // Глобальная переменная для истории всех игроков
  let isTextMessage = false; // Новый флаг для отслеживания типа сообщения

  const Store = {
    getAdminId: () => ADMIN_ID,
    getGroupId: () => GROUP_ID,
    getStart: () => isMatchStarted,
    setStart: (status) => isMatchStarted = status,
    getDivided: () => isTeamsDivided,
    setDivided: (status) => isTeamsDivided = status,
    getIsStatsInitialized: () => isStatsInitialized,
    setIsStatsInitialized: (status) => isStatsInitialized = status,
    getTeamsBase: () => teamsBase,
    setTeamsBase: (teams) => teamsBase = teams,
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

    getTeamStats: () => teamStats,
    setTeamStats: (stats) => teamStats = stats,

    // Методы для работы с историей игроков
    getAllPlayersHistory: () => allPlayersHistory,
    setAllPlayersHistory: (players) => allPlayersHistory = players,
    appendToPlayersHistory: (newPlayers) => {
      newPlayers.forEach(newPlayer => {
        const existingPlayer = allPlayersHistory.find(p => p.id === newPlayer.id);
        if (existingPlayer) {
          existingPlayer.goals += newPlayer.goals;
          existingPlayer.gamesPlayed += newPlayer.gamesPlayed;
          existingPlayer.wins += newPlayer.wins;
          existingPlayer.draws += newPlayer.draws;
          existingPlayer.losses += newPlayer.losses;
          existingPlayer.rating += newPlayer.rating;
        } else {
          allPlayersHistory.push({ ...newPlayer });
        }
      });
    },

    // Новые методы для работы с isTextMessage
    getIsTextMessage: () => isTextMessage,
    setIsTextMessage: (value) => isTextMessage = value,
  };

  return Object.freeze(Store);
})();

module.exports = { GlobalState };