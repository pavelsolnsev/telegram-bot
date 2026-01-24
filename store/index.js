const GlobalState = (() => {
  // Безопасная инициализация ADMIN_ID с проверкой на существование
  let ADMIN_ID = [];
  if (process.env.ADMIN_ID && typeof process.env.ADMIN_ID === 'string') {
    try {
      ADMIN_ID = process.env.ADMIN_ID.split(',').map((id) => {
        const numId = Number(id.trim());
        return isNaN(numId) ? null : numId;
      }).filter(id => id !== null);
    } catch (error) {
      console.error('Ошибка при парсинге ADMIN_ID:', error);
      ADMIN_ID = [];
    }
  } else {
    console.warn('ADMIN_ID не установлен в переменных окружения');
  }

  // Безопасная инициализация GROUP_ID с проверкой на существование
  let GROUP_ID = null;
  if (process.env.ID) {
    GROUP_ID = Number(process.env.ID);
    if (isNaN(GROUP_ID)) {
      console.warn('GROUP_ID (process.env.ID) не является валидным числом');
      GROUP_ID = null;
    }
  } else {
    console.warn('GROUP_ID (process.env.ID) не установлен в переменных окружения');
  }

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
  let lastMatchIndex = {}; // Индекс последнего матча между парами команд
  let location = null;
  let teamCount = 0;
  let matchHistoryStack = [];
  let matchResults = [];
  let lastResultMessage = null;
  let isTableAllowed = false;
  let referee = 'Не назначен';
  let matchMessagesByNumber = {};
  let teamNames = {}; // Хранит названия команд: { 0: 'Леон', 1: 'Барселона', ... }

  const Store = {
    getConsecutiveGames: () => consecutiveGames,
    setConsecutiveGames: (obj) => (consecutiveGames = obj),
    getTeamCount: () => teamCount,
    setTeamCount: (count) => (teamCount = count),
    getAdminId: () => ADMIN_ID,
    getGroupId: () => GROUP_ID,
    getStart: () => isMatchStarted,
    setStart: (status) => (isMatchStarted = status),
    getIsMatchFinished: () => isMatchFinished,
    setIsMatchFinished: (status) => (isMatchFinished = status),
    getDivided: () => isTeamsDivided,
    setDivided: (status) => (isTeamsDivided = status),
    getIsStatsInitialized: () => isStatsInitialized,
    setIsStatsInitialized: (status) => (isStatsInitialized = status),
    getTeamsBase: () => teamsBase,
    setTeamsBase: (teams) => (teamsBase = teams),
    getIsTableAllowed: () => isTableAllowed,
    setIsTableAllowed: (status) => (isTableAllowed = status),

    getReferee: () => referee,
    setReferee: (name) => (referee = name),
    resetReferee: () => (referee = 'Не назначен'),

    getTeamNames: () => teamNames,
    setTeamName: (teamIndex, name) => {
      if (teamIndex >= 0 && teamIndex < 4) {
        teamNames[teamIndex] = name;
      }
    },
    getTeamName: (teamIndex) => teamNames[teamIndex] || null,
    resetTeamNames: () => (teamNames = {}),

    getMaxPlayers: () => MAX_PLAYERS,
    setMaxPlayers: (number) => (MAX_PLAYERS = number),
    getPlayers: () => players,
    setPlayers: (array) => (players = array),
    getQueue: () => queue,
    setQueue: (array) => (queue = array),
    getMatchResults: () => matchResults,
    addMatchResult: (result) => matchResults.push(result),
    clearMatchResults: () => {
      matchResults = [];
    },
    getLastResultMessageId: () => lastResultMessage,
    setLastResultMessageId: (chatId, messageId) => {
      lastResultMessage = { chatId, messageId };
    },
    clearLastResultMessageId: () => {
      lastResultMessage = null;
    },
    getIsEndCommandAllowed: () => isEndCommandAllowed,
    setIsEndCommandAllowed: (status) => (isEndCommandAllowed = status),
    getIsTeamCommandAllowed: () => isTeamCommandAllowed,
    setIsTeamCommandAllowed: (status) => (isTeamCommandAllowed = status),
    getCollectionDate: () => collectionDate,
    setCollectionDate: (date) => (collectionDate = date),
    getNotificationSent: () => notificationSent,
    setNotificationSent: (status) => (notificationSent = status),
    getListMessageId: () => listMessageId,
    setListMessageId: (id) => (listMessageId = id),
    getListMessageChatId: () => listMessageChatId,
    setListMessageChatId: (chatId) => (listMessageChatId = chatId),
    getTeams: () => teams,
    setTeams: (newTeams) => (teams = newTeams),
    getLastTeamCount: () => lastTeamCount,
    setLastTeamCount: (num) => (lastTeamCount = num),
    setLastTeamsMessageId: (chatId, messageId) => {
      lastTeamsMessage = { chatId, messageId };
    },
    getLastTeamsMessageId: () => lastTeamsMessage,
    setPlayingTeams: (newPlayingTeams) => {
      playingTeams = newPlayingTeams;
    },
    getPlayingTeams: () => playingTeams,
    setPlayingTeamsMessageId: (chatId, messageId) => {
      if (chatId === null && messageId === null) {
        playingTeamsMessageId = null;
      } else {
        playingTeamsMessageId = { chatId, messageId };
      }
    },
    getPlayingTeamsMessageId: () => playingTeamsMessageId,
    getTeamStats: () => teamStats,
    setTeamStats: (stats) => (teamStats = stats),
    getAllPlayersHistory: () => allPlayersHistory,
    setAllPlayersHistory: (players) => (allPlayersHistory = players),
    appendToPlayersHistory: (newPlayers) => {
      newPlayers.forEach((newPlayer) => {
        const existingPlayer = allPlayersHistory.find(
          (p) => p.id === newPlayer.id,
        );
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
    setMatchHistory: (history) => (matchHistory = history),
    getLastMatchIndex: () => lastMatchIndex,
    setLastMatchIndex: (index) => (lastMatchIndex = index),
    getLocation: () => location,
    setLocation: (loc) => (location = loc),
    pushMatchHistory: (state) => {
      matchHistoryStack.push(state);
    },
    popMatchHistory: () => {
      return matchHistoryStack.pop();
    },
    clearMatchHistory: () => {
      matchHistoryStack = [];
    },
    getMatchHistoryStackLength: () => {
      return matchHistoryStack.length;
    },
    setMatchMessageByNumber: (matchNumber, chatId, messageId) => {
      matchMessagesByNumber[matchNumber] = { chatId, messageId };
    },
    getMatchMessageByNumber: (matchNumber) => {
      return matchMessagesByNumber[matchNumber] || null;
    },
    removeMatchMessageByNumber: (matchNumber) => {
      delete matchMessagesByNumber[matchNumber];
    },
    clearMatchMessagesByNumber: () => {
      matchMessagesByNumber = {};
    },

    /**
     * Полный сброс турнирного состояния в памяти.
     * По умолчанию сохраняет результаты матчей (matchResults),
     * чтобы они оставались доступными до старта нового турнира.
     */
    resetTournamentState: ({ preserveMatchResults = true } = {}) => {
      consecutiveGames = {};
      isMatchStarted = false;
      isMatchFinished = false;
      isTeamsDivided = false;
      isStatsInitialized = false;
      isEndCommandAllowed = true;
      isTeamCommandAllowed = true;
      MAX_PLAYERS = 20;

      players = [];
      teamsBase = [];
      queue = [];
      teams = [];
      collectionDate = null;
      notificationSent = false;
      listMessageId = null;
      listMessageChatId = null;
      lastTeamCount = null;
      lastTeamsMessage = null;
      playingTeams = null;
      playingTeamsMessageId = null;
      teamStats = {};
      allPlayersHistory = [];

      matchHistory = {};
      lastMatchIndex = {};
      location = null;
      teamCount = 0;
      matchHistoryStack = [];

      if (!preserveMatchResults) {
        matchResults = [];
      }
      lastResultMessage = null;

      isTableAllowed = false;
      referee = 'Не назначен';
      matchMessagesByNumber = {};
      teamNames = {};
    },
  };

  return Object.freeze(Store);
})();

module.exports = { GlobalState };
