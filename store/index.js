const GlobalState = (() => {
  const ADMIN_ID = process.env.ADMIN_ID.split(',').map(id => Number(id.trim()));
  const GROUP_ID = Number(process.env.ID);
  const IMAGE_URL = process.env.IMAGE_URL;

  let consecutiveGames = {};
  let isMatchStarted = false;
  let isMatchFinished = false;
  let isTeamsDivided = false;
  let isStatsInitialized = false;
  let isEndCommandAllowed = true;
  let isTeamCommandAllowed = true;
  let MAX_PLAYERS = 20;
  let players = [];
  let teamsBase = [];
  let queue = [];
  let teams = [];
  let collectionDate = null;
  let notificationSent = false;
  let listMessageId = null;
  let lastTeamCount = null;
  let lastTeamsMessage = null;
  let playingTeams = null;
  let playingTeamsMessageId = null;
  let teamStats = {};
  let allPlayersHistory = [];
  let listMessageChatId = null;
  let matchHistory = {};
  let location = null;
  let teamCount = 0;
  let matchHistoryStack = [];
  let matchResults = [];
  let lastResultMessage = null;
  let isTableAllowed = false;

  const Store = {
    getConsecutiveGames: () => consecutiveGames,
    setConsecutiveGames: (obj) => consecutiveGames = obj,
    getTeamCount: () => teamCount,
    setTeamCount: (count) => teamCount = count,
    getAdminId: () => ADMIN_ID,
    getGroupId: () => GROUP_ID,
    getStart: () => isMatchStarted,
    setStart: (status) => isMatchStarted = status,
    getIsMatchFinished: () => isMatchFinished,
    setIsMatchFinished: (status) => isMatchFinished = status,
    getDivided: () => isTeamsDivided,
    setDivided: (status) => isTeamsDivided = status,
    getIsStatsInitialized: () => isStatsInitialized,
    setIsStatsInitialized: (status) => isStatsInitialized = status,
    getTeamsBase: () => teamsBase,
    setTeamsBase: (teams) => teamsBase = teams,
    getIsTableAllowed: () => isTableAllowed,
    setIsTableAllowed: (status) => isTableAllowed = status,
    getMaxPlayers: () => MAX_PLAYERS,
    setMaxPlayers: (number) => MAX_PLAYERS = number,
    getPlayers: () => players,
    setPlayers: (array) => players = array,
    getQueue: () => queue,
    setQueue: (array) => queue = array,
    getMatchResults: () => matchResults,
    addMatchResult: (result) => matchResults.push(result),
    clearMatchResults: () => { matchResults = []; },
    getLastResultMessageId: () => lastResultMessage,
    setLastResultMessageId: (chatId, messageId) => {
      lastResultMessage = { chatId, messageId };
    },
    getIsEndCommandAllowed: () => isEndCommandAllowed,
    setIsEndCommandAllowed: (status) => isEndCommandAllowed = status,
    getIsTeamCommandAllowed: () => isTeamCommandAllowed,
    setIsTeamCommandAllowed: (status) => isTeamCommandAllowed = status,
    getCollectionDate: () => collectionDate,
    setCollectionDate: (date) => collectionDate = date,
    getNotificationSent: () => notificationSent,
    setNotificationSent: (status) => notificationSent = status,
    getListMessageId: () => listMessageId,
    setListMessageId: (id) => listMessageId = id,
    getListMessageChatId: () => listMessageChatId,
    setListMessageChatId: (chatId) => listMessageChatId = chatId,
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
    getMatchHistory: () => matchHistory,
    setMatchHistory: (history) => matchHistory = history,
    getLocation: () => location,
    setLocation: (loc) => location = loc,
    pushMatchHistory: (state) => {
      matchHistoryStack.push(state);
    },
    popMatchHistory: () => {
      return matchHistoryStack.pop();
    },
    clearMatchHistory: () => {
      matchHistoryStack = [];
    }
  };

  return Object.freeze(Store);
})();

module.exports = { GlobalState };