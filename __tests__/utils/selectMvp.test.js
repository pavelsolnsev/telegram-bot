const { selectMvp } = require('../../utils/selectMvp');

describe('selectMvp', () => {
  describe('базовые сценарии', () => {
    test('должен вернуть null для пустого массива игроков', () => {
      const result = selectMvp([]);
      expect(result).toBeNull();
    });

    test('должен вернуть единственного игрока', () => {
      const player = { id: 1, name: 'Player1', goals: 1, assists: 0, saves: 0 };
      const result = selectMvp([player]);
      expect(result).toEqual(player);
    });
  });

  describe('выбор по общему количеству меток', () => {
    test('сейвы учитываются с весом 0.85 — 6 голов выигрывают у 5 голов + 1 сейва', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 6, assists: 0, saves: 0 }; // 6.0
      const playerB = { id: 2, name: 'PlayerB', goals: 5, assists: 0, saves: 1 }; // 5 + 0.85 = 5.85

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(1); // PlayerA — голы важнее сейвов
    });

    test('игрок с большим количеством меток должен стать MVP (4 метки vs 3 гола)', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 3, assists: 0, saves: 0 }; // 3 метки
      const playerB = { id: 2, name: 'PlayerB', goals: 2, assists: 1, saves: 1 }; // 4 метки

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2); // PlayerB - больше меток
    });

    test('игрок с 5 метками (2+2+1) vs игрок с 4 голами', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 4, assists: 0, saves: 0 }; // 4 метки
      const playerB = { id: 2, name: 'PlayerB', goals: 2, assists: 2, saves: 1 }; // 5 меток

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2); // PlayerB - больше меток
    });

    test('игрок только с ассистами и сейвами может стать MVP', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 0, saves: 0 }; // 1 метка
      const playerB = { id: 2, name: 'PlayerB', goals: 0, assists: 2, saves: 1 }; // 3 метки

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2); // PlayerB - больше меток
    });
  });

  describe('приоритет голов при равном количестве меток', () => {
    test('3 гола vs 3 ассиста - выигрывает игрок с голами', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 3, assists: 0, saves: 0 }; // 3 метки, 3 гола
      const playerB = { id: 2, name: 'PlayerB', goals: 0, assists: 3, saves: 0 }; // 3 метки, 0 голов

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(1); // PlayerA - больше голов при равных метках
    });

    test('3 гола vs 3 сейва - выигрывает игрок с голами', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 3, assists: 0, saves: 0 };
      const playerB = { id: 2, name: 'PlayerB', goals: 0, assists: 0, saves: 3 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(1);
    });

    test('2 гола + 1 ассист vs 1 гол + 2 ассиста - выигрывает с большим числом голов', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 2, assists: 1, saves: 0 }; // 3 метки, 2 гола
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 2, saves: 0 }; // 3 метки, 1 гол

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(1); // PlayerA - больше голов
    });
  });

  describe('приоритет ассистов при равных метках и голах', () => {
    test('2 гола + 2 ассиста vs 2 гола + 1 ассист + 1 сейв - выигрывает с большим числом ассистов', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 2, assists: 2, saves: 0 }; // 4 метки, 2 гола, 2 ассиста
      const playerB = { id: 2, name: 'PlayerB', goals: 2, assists: 1, saves: 1 }; // 4 метки, 2 гола, 1 ассист

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(1); // PlayerA - больше ассистов
    });

    test('1 гол + 2 сейва vs 1 гол + 2 ассиста - выигрывает с ассистами', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 0, saves: 2 }; // 3 метки, 1 гол, 0 ассистов
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 2, saves: 0 }; // 3 метки, 1 гол, 2 ассиста

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2); // PlayerB - больше ассистов
    });
  });

  describe('приоритет сейвов при равных метках, голах и ассистах', () => {
    test('1 гол + 1 ассист + 2 сейва vs 1 гол + 1 ассист + 1 сейв - выигрывает с большим числом сейвов', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 2 }; // 4 метки
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1 }; // 3 метки

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(1); // PlayerA - больше меток (4 vs 3)
    });
  });

  describe('обработка undefined значений', () => {
    test('должен корректно обрабатывать отсутствие goals', () => {
      const playerA = { id: 1, name: 'PlayerA', assists: 1, saves: 0 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 0, saves: 0 };

      const result = selectMvp([playerA, playerB]);
      // У обоих по 1 метке, но у playerB есть гол
      expect(result.id).toBe(2);
    });

    test('должен корректно обрабатывать отсутствие assists', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, saves: 0 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 0 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2); // Больше меток (2 vs 1)
    });

    test('должен корректно обрабатывать отсутствие saves', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 0 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 0, saves: 1 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2); // Больше меток (2 vs 1)
    });

    test('игрок без меток vs игрок с метками', () => {
      const playerA = { id: 1, name: 'PlayerA' }; // 0 меток
      const playerB = { id: 2, name: 'PlayerB', goals: 1 }; // 1 метка

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2);
    });
  });

  describe('множество игроков', () => {
    test('должен выбрать MVP среди 4 игроков', () => {
      const players = [
        { id: 1, name: 'Player1', goals: 2, assists: 0, saves: 0 }, // 2 метки
        { id: 2, name: 'Player2', goals: 1, assists: 1, saves: 1 }, // 3 метки
        { id: 3, name: 'Player3', goals: 0, assists: 2, saves: 2 }, // 4 метки
        { id: 4, name: 'Player4', goals: 1, assists: 0, saves: 0 }, // 1 метка
      ];

      const result = selectMvp(players);
      expect(result.id).toBe(3); // Больше всех меток
    });

    test('должен выбрать по голам при равных метках среди нескольких игроков', () => {
      const players = [
        { id: 1, name: 'Player1', goals: 1, assists: 2, saves: 0 }, // 3 метки, 1 гол
        { id: 2, name: 'Player2', goals: 2, assists: 1, saves: 0 }, // 3 метки, 2 гола
        { id: 3, name: 'Player3', goals: 0, assists: 3, saves: 0 }, // 3 метки, 0 голов
      ];

      const result = selectMvp(players);
      expect(result.id).toBe(2); // Больше всех голов при равных метках
    });
  });

  describe('приоритет очков команды при равных метках, голах, ассистах и сейвах', () => {
    test('при равной статистике приоритет у игрока из команды с большим числом очков', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1 };
      const allTeams = [[playerA], [playerB]];
      const teamStats = {
        0: { wins: 1, draws: 0, losses: 1 }, // 3 очка
        1: { wins: 2, draws: 0, losses: 0 }, // 6 очков
      };

      const result = selectMvp([playerA, playerB], { allTeams, teamStats });
      expect(result.id).toBe(2); // PlayerB — команда с 6 очками
    });

    test('без options очки команды не учитываются — переход к приросту рейтинга и далее', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1 };

      const result = selectMvp([playerA, playerB]);
      expect([1, 2]).toContain(result.id);
    });
  });

  describe('приоритет прироста рейтинга при равных метках и очках команды', () => {
    test('при равной статистике приоритет у игрока с большим ratingTournamentDelta', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1, ratingTournamentDelta: 2.1 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1, ratingTournamentDelta: 3.5 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2); // PlayerB — больший прирост рейтинга
    });

    test('цепочка: очки команды равны — сравниваем прирост рейтинга', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1, ratingTournamentDelta: 1.0 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1, ratingTournamentDelta: 2.5 };
      const allTeams = [[playerA], [playerB]];
      const teamStats = {
        0: { wins: 1, draws: 0 },
        1: { wins: 1, draws: 0 },
      };

      const result = selectMvp([playerA, playerB], { allTeams, teamStats });
      expect(result.id).toBe(2); // PlayerB — больше прирост рейтинга при равных очках команды
    });

    test('прирост рейтинга 0 vs отсутствие поля — оба считаются 0, переход к следующим критериям', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1, ratingTournamentDelta: 0 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(1); // Детерминированный выбор по меньшему id
    });
  });

  describe('разница мячей команды при равных очках', () => {
    test('при равных очках приоритет у игрока из команды с лучшей разницей мячей', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1 };
      const allTeams = [[playerA], [playerB]];
      const teamStats = {
        0: { wins: 2, draws: 0, losses: 1, goalsScored: 5, goalsConceded: 3 }, // +2
        1: { wins: 2, draws: 0, losses: 1, goalsScored: 7, goalsConceded: 2 }, // +5
      };

      const result = selectMvp([playerA, playerB], { allTeams, teamStats });
      expect(result.id).toBe(2);
    });
  });

  describe('приоритет по жёлтым карточкам (меньше = лучше)', () => {
    test('при равной статистике приоритет игроку без жёлтых карточек', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1, yellowCards: 1 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1, yellowCards: 0 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2);
    });
  });

  describe('приоритет по личным победам', () => {
    test('при равной статистике приоритет игроку с большим числом побед', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1, wins: 1 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1, wins: 2 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2);
    });
  });

  describe('приоритет по рейтингу на старте турнира', () => {
    test('при равной статистике приоритет игроку с более высоким рейтингом на старте', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1, ratingAtTournamentStart: 20 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1, ratingAtTournamentStart: 50 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(2);
    });
  });

  describe('полное равенство - детерминированный выбор по id', () => {
    test('при полном равенстве возвращается игрок с меньшим id', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1 };

      const result = selectMvp([playerA, playerB]);
      expect(result.id).toBe(1);
    });

    test('выбор стабилен при многократном вызове', () => {
      const playerA = { id: 10, name: 'PlayerA', goals: 1, assists: 1, saves: 1 };
      const playerB = { id: 5, name: 'PlayerB', goals: 1, assists: 1, saves: 1 };

      for (let i = 0; i < 10; i++) {
        const result = selectMvp([playerA, playerB]);
        expect(result.id).toBe(5);
      }
    });
  });

  describe('игроки без статистики', () => {
    test('все игроки без меток - должен вернуть одного из них', () => {
      const players = [
        { id: 1, name: 'Player1' },
        { id: 2, name: 'Player2' },
      ];

      const result = selectMvp(players);
      expect([1, 2]).toContain(result.id);
    });
  });
});
