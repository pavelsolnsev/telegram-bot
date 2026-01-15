const { checkUnevenDistribution } = require('../../utils/checkUnevenDistribution');

describe('checkUnevenDistribution', () => {
  describe('Равномерное распределение', () => {
    test('должен вернуть isUneven: false для равномерного распределения', () => {
      const teams = [
        [{ id: 1 }, { id: 2 }],
        [{ id: 3 }, { id: 4 }],
      ];

      const result = checkUnevenDistribution(teams);

      expect(result.isUneven).toBe(false);
      expect(result.difference).toBe(0);
    });

    test('должен вернуть isUneven: false для трех команд с равным количеством', () => {
      const teams = [
        [{ id: 1 }, { id: 2 }],
        [{ id: 3 }, { id: 4 }],
        [{ id: 5 }, { id: 6 }],
      ];

      const result = checkUnevenDistribution(teams);

      expect(result.isUneven).toBe(false);
      expect(result.difference).toBe(0);
    });
  });

  describe('Неравномерное распределение', () => {
    test('должен определить неравномерное распределение 6 и 5 игроков', () => {
      const teams = [
        [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }],
        [{ id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }, { id: 11 }],
      ];

      const result = checkUnevenDistribution(teams);

      expect(result.isUneven).toBe(true);
      expect(result.difference).toBe(1);
      expect(result.maxTeamIndex).toBe(0);
      expect(result.minTeamIndex).toBe(1);
      expect(result.maxTeamSize).toBe(6);
      expect(result.minTeamSize).toBe(5);
    });

    test('должен определить неравномерное распределение для 3 команд', () => {
      const teams = [
        [{ id: 1 }, { id: 2 }, { id: 3 }],
        [{ id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }],
        [{ id: 8 }, { id: 9 }],
      ];

      const result = checkUnevenDistribution(teams);

      expect(result.isUneven).toBe(true);
      expect(result.difference).toBe(2);
      expect(result.maxTeamIndex).toBe(1);
      expect(result.minTeamIndex).toBe(2);
      expect(result.maxTeamSize).toBe(4);
      expect(result.minTeamSize).toBe(2);
    });

    test('должен определить неравномерное распределение 21 игрока на 4 команды', () => {
      const teams = [
        [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }],
        [{ id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }, { id: 11 }],
        [{ id: 12 }, { id: 13 }, { id: 14 }, { id: 15 }, { id: 16 }],
        [{ id: 17 }, { id: 18 }, { id: 19 }, { id: 20 }, { id: 21 }],
      ];

      const result = checkUnevenDistribution(teams);

      expect(result.isUneven).toBe(true);
      expect(result.difference).toBe(1);
      expect(result.maxTeamIndex).toBe(0);
      expect(result.maxTeamSize).toBe(6);
      expect(result.minTeamSize).toBe(5);
    });
  });

  describe('Граничные случаи', () => {
    test('должен обработать пустой массив команд', () => {
      const result = checkUnevenDistribution([]);

      expect(result.isUneven).toBe(false);
      expect(result.maxTeamIndex).toBe(-1);
      expect(result.minTeamIndex).toBe(-1);
      expect(result.difference).toBe(0);
    });

    test('должен обработать null или undefined', () => {
      const result1 = checkUnevenDistribution(null);
      const result2 = checkUnevenDistribution(undefined);

      expect(result1.isUneven).toBe(false);
      expect(result2.isUneven).toBe(false);
    });

    test('должен обработать команды с пустыми массивами', () => {
      const teams = [[], [], []];

      const result = checkUnevenDistribution(teams);

      expect(result.isUneven).toBe(false);
      expect(result.difference).toBe(0);
    });

    test('должен обработать команду с одним игроком', () => {
      const teams = [
        [{ id: 1 }],
        [{ id: 2 }, { id: 3 }],
      ];

      const result = checkUnevenDistribution(teams);

      expect(result.isUneven).toBe(true);
      expect(result.difference).toBe(1);
      expect(result.maxTeamIndex).toBe(1);
      expect(result.minTeamIndex).toBe(0);
    });

    test('должен игнорировать некорректные команды', () => {
      const teams = [
        [{ id: 1 }, { id: 2 }],
        null,
        [{ id: 3 }, { id: 4 }, { id: 5 }],
        'invalid',
      ];

      const result = checkUnevenDistribution(teams);

      expect(result.isUneven).toBe(true);
      expect(result.difference).toBe(1);
      expect(result.maxTeamIndex).toBe(2);
      expect(result.minTeamIndex).toBe(0);
    });
  });
});
