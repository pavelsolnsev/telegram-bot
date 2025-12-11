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

  describe('полное равенство - случайный выбор', () => {
    test('при полном равенстве статистики должен вернуть одного из кандидатов', () => {
      const playerA = { id: 1, name: 'PlayerA', goals: 1, assists: 1, saves: 1 };
      const playerB = { id: 2, name: 'PlayerB', goals: 1, assists: 1, saves: 1 };

      const result = selectMvp([playerA, playerB]);
      expect([1, 2]).toContain(result.id); // Должен быть один из них
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
