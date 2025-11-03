const { GlobalState } = require('../../store');

describe('GlobalState', () => {
  beforeEach(() => {
    // Reset state перед каждым тестом
    GlobalState.setPlayers([]);
    GlobalState.setQueue([]);
    GlobalState.setTeams([]);
    GlobalState.setTeamStats({});
    GlobalState.setStart(false);
    GlobalState.setDivided(false);
    GlobalState.setIsMatchFinished(false);
    GlobalState.setIsStatsInitialized(false);
    GlobalState.setNotificationSent(false);
    GlobalState.setListMessageId(null);
    GlobalState.setLastTeamCount(null);
    GlobalState.setIsEndCommandAllowed(true);
    GlobalState.setIsTeamCommandAllowed(true);
    GlobalState.setPlayingTeams(null);
    GlobalState.setPlayingTeamsMessageId(null);
    GlobalState.clearMatchResults();
  });

  describe('Управление игроками', () => {
    test('должен устанавливать и получать список игроков', () => {
      const players = [
        { id: 1, name: 'Player1' },
        { id: 2, name: 'Player2' },
      ];

      GlobalState.setPlayers(players);

      expect(GlobalState.getPlayers()).toEqual(players);
    });

    test('должен устанавливать и получать очередь', () => {
      const queue = [
        { id: 3, name: 'Player3' },
        { id: 4, name: 'Player4' },
      ];

      GlobalState.setQueue(queue);

      expect(GlobalState.getQueue()).toEqual(queue);
    });
  });

  describe('Управление командами', () => {
    test('должен устанавливать и получать команды', () => {
      const teams = [
        [{ id: 1, name: 'Player1' }],
        [{ id: 2, name: 'Player2' }],
      ];

      GlobalState.setTeams(teams);
      GlobalState.setTeamsBase(teams);

      expect(GlobalState.getTeams()).toEqual(teams);
      expect(GlobalState.getTeamsBase()).toEqual(teams);
    });

    test('должен устанавливать и получать статистику команд', () => {
      const stats = {
        team1: { wins: 2, losses: 1, draws: 0 },
        team2: { wins: 1, losses: 2, draws: 0 },
      };

      GlobalState.setTeamStats(stats);

      expect(GlobalState.getTeamStats()).toEqual(stats);
    });

    test('должен устанавливать и получать играющие команды', () => {
      const playingTeams = {
        team1: [{ id: 1, name: 'Player1' }],
        team2: [{ id: 2, name: 'Player2' }],
        teamIndex1: 0,
        teamIndex2: 1,
      };

      GlobalState.setPlayingTeams(playingTeams);

      expect(GlobalState.getPlayingTeams()).toEqual(playingTeams);
    });

    test('должен устанавливать и получать ID сообщения играющих команд', () => {
      const messageId = { chatId: 123, messageId: 456 };

      GlobalState.setPlayingTeamsMessageId(123, 456);

      expect(GlobalState.getPlayingTeamsMessageId()).toEqual(messageId);
    });
  });

  describe('Управление состоянием матча', () => {
    test('должен устанавливать и получать статус начала матча', () => {
      GlobalState.setStart(true);
      expect(GlobalState.getStart()).toBe(true);

      GlobalState.setStart(false);
      expect(GlobalState.getStart()).toBe(false);
    });

    test('должен устанавливать и получать статус деления на команды', () => {
      GlobalState.setDivided(true);
      expect(GlobalState.getDivided()).toBe(true);

      GlobalState.setDivided(false);
      expect(GlobalState.getDivided()).toBe(false);
    });

    test('должен устанавливать и получать статус завершения матча', () => {
      GlobalState.setIsMatchFinished(true);
      expect(GlobalState.getIsMatchFinished()).toBe(true);

      GlobalState.setIsMatchFinished(false);
      expect(GlobalState.getIsMatchFinished()).toBe(false);
    });

    test('должен устанавливать и получать статус инициализации статистики', () => {
      GlobalState.setIsStatsInitialized(true);
      expect(GlobalState.getIsStatsInitialized()).toBe(true);

      GlobalState.setIsStatsInitialized(false);
      expect(GlobalState.getIsStatsInitialized()).toBe(false);
    });
  });

  describe('Управление правами команд', () => {
    test('должен устанавливать и получать статус команды end', () => {
      GlobalState.setIsEndCommandAllowed(false);
      expect(GlobalState.getIsEndCommandAllowed()).toBe(false);

      GlobalState.setIsEndCommandAllowed(true);
      expect(GlobalState.getIsEndCommandAllowed()).toBe(true);
    });

    test('должен устанавливать и получать статус команды tm', () => {
      GlobalState.setIsTeamCommandAllowed(false);
      expect(GlobalState.getIsTeamCommandAllowed()).toBe(false);

      GlobalState.setIsTeamCommandAllowed(true);
      expect(GlobalState.getIsTeamCommandAllowed()).toBe(true);
    });
  });

  describe('Управление датой сбора', () => {
    test('должен устанавливать и получать дату сбора', () => {
      const date = new Date(2024, 0, 15, 19, 0);

      GlobalState.setCollectionDate(date);

      expect(GlobalState.getCollectionDate()).toEqual(date);
    });
  });

  describe('Управление уведомлениями', () => {
    test('должен устанавливать и получать статус отправки уведомления', () => {
      GlobalState.setNotificationSent(true);
      expect(GlobalState.getNotificationSent()).toBe(true);

      GlobalState.setNotificationSent(false);
      expect(GlobalState.getNotificationSent()).toBe(false);
    });
  });

  describe('Управление сообщениями', () => {
    test('должен устанавливать и получать ID сообщения списка', () => {
      GlobalState.setListMessageId(123);
      expect(GlobalState.getListMessageId()).toBe(123);

      GlobalState.setListMessageChatId(456);
      expect(GlobalState.getListMessageChatId()).toBe(456);
    });

    test('должен устанавливать и получать ID последнего сообщения команд', () => {
      const messageId = { chatId: 123, messageId: 456 };

      GlobalState.setLastTeamsMessageId(123, 456);

      expect(GlobalState.getLastTeamsMessageId()).toEqual(messageId);
    });
  });

  describe('Управление результатами матча', () => {
    test('должен добавлять результаты матча', () => {
      const result = { team1: 5, team2: 3 };

      GlobalState.addMatchResult(result);

      expect(GlobalState.getMatchResults()).toContain(result);
    });

    test('должен получать все результаты матча', () => {
      const results = [
        { team1: 5, team2: 3 },
        { team1: 2, team2: 2 },
      ];

      GlobalState.addMatchResult(results[0]);
      GlobalState.addMatchResult(results[1]);

      expect(GlobalState.getMatchResults()).toEqual(results);
    });

    test('должен очищать результаты матча', () => {
      GlobalState.addMatchResult({ team1: 5, team2: 3 });
      GlobalState.clearMatchResults();

      expect(GlobalState.getMatchResults()).toEqual([]);
    });

    test('должен устанавливать и получать ID последнего сообщения результата', () => {
      GlobalState.setLastResultMessageId(123, 456);

      expect(GlobalState.getLastResultMessageId()).toEqual({ chatId: 123, messageId: 456 });
    });
  });

  describe('Управление локацией', () => {
    test('должен устанавливать и получать локацию', () => {
      GlobalState.setLocation('zalkz');
      expect(GlobalState.getLocation()).toBe('zalkz');

      GlobalState.setLocation('prof');
      expect(GlobalState.getLocation()).toBe('prof');
    });
  });

  describe('Управление судьей', () => {
    test('должен устанавливать и получать судью', () => {
      GlobalState.setReferee('Карен');
      expect(GlobalState.getReferee()).toBe('Карен');

      GlobalState.setReferee('Другой');
      expect(GlobalState.getReferee()).toBe('Другой');
    });

    test('должен сбросить судью на дефолтное значение', () => {
      GlobalState.setReferee('Другой');
      GlobalState.resetReferee();
      expect(GlobalState.getReferee()).toBe('Карен');
    });
  });

  describe('Управление максимумом игроков', () => {
    test('должен устанавливать и получать максимум игроков', () => {
      GlobalState.setMaxPlayers(20);
      expect(GlobalState.getMaxPlayers()).toBe(20);

      GlobalState.setMaxPlayers(32);
      expect(GlobalState.getMaxPlayers()).toBe(32);
    });
  });

  describe('История игроков', () => {
    test('должен устанавливать и получать историю всех игроков', () => {
      const history = [
        { id: 1, name: 'Player1', goals: 10 },
        { id: 2, name: 'Player2', goals: 5 },
      ];

      GlobalState.setAllPlayersHistory(history);
      expect(GlobalState.getAllPlayersHistory()).toEqual(history);
    });

    test('должен добавлять игроков в историю', () => {
      const initialHistory = [
        { id: 1, name: 'Player1', goals: 10, gamesPlayed: 5 },
      ];

      GlobalState.setAllPlayersHistory(initialHistory);

      const newPlayers = [
        { id: 2, name: 'Player2', goals: 5, gamesPlayed: 3 },
        { id: 1, name: 'Player1', goals: 3, gamesPlayed: 2 },
      ];

      GlobalState.appendToPlayersHistory(newPlayers);

      const finalHistory = GlobalState.getAllPlayersHistory();
      expect(finalHistory).toHaveLength(2);
      expect(finalHistory.find(p => p.id === 1).goals).toBe(13); // 10 + 3
      expect(finalHistory.find(p => p.id === 1).gamesPlayed).toBe(7); // 5 + 2
      expect(finalHistory.find(p => p.id === 2).goals).toBe(5);
    });
  });

  describe('Стек истории матчей', () => {
    test('должен пушить и попировать состояние матча', () => {
      const state1 = { teams: [], players: [] };
      const state2 = { teams: [], players: ['Player1'] };

      GlobalState.pushMatchHistory(state1);
      GlobalState.pushMatchHistory(state2);

      const popped = GlobalState.popMatchHistory();
      expect(popped).toEqual(state2);
    });

    test('должен очищать стек истории матчей', () => {
      GlobalState.pushMatchHistory({ teams: [] });
      GlobalState.pushMatchHistory({ teams: [] });
      GlobalState.clearMatchHistory();

      expect(GlobalState.popMatchHistory()).toBeUndefined();
    });
  });
});

