const { divideIntoTeams } = require('../../utils/divideIntoTeams');

describe('divideIntoTeams', () => {
  describe('Основные случаи', () => {
    test('должен корректно разделить игроков на 2 команды', () => {
      const players = [
        { id: 1, name: 'Player1', rating: 100 },
        { id: 2, name: 'Player2', rating: 90 },
        { id: 3, name: 'Player3', rating: 80 },
        { id: 4, name: 'Player4', rating: 70 },
      ];

      const teams = divideIntoTeams(players, 2);

      expect(teams.length).toBe(2);
      expect(teams[0].length).toBe(2);
      expect(teams[1].length).toBe(2);
    });

    test('должен использовать змейку для распределения', () => {
      const players = [
        { id: 1, name: 'Player1', rating: 100 },
        { id: 2, name: 'Player2', rating: 90 },
        { id: 3, name: 'Player3', rating: 80 },
        { id: 4, name: 'Player4', rating: 70 },
      ];

      const teams = divideIntoTeams(players, 2);

      // Проверяем змейку: первый раунд (100, 90) идет 0,1, второй (80, 70) идет 1,0
      expect(teams[0][0].rating).toBe(100);
      expect(teams[1][0].rating).toBe(90);
      expect(teams[1][1].rating).toBe(80);
      expect(teams[0][1].rating).toBe(70);
    });

    test('должен корректно разделить игроков на 3 команды', () => {
      const players = [
        { id: 1, name: 'Player1', rating: 100 },
        { id: 2, name: 'Player2', rating: 90 },
        { id: 3, name: 'Player3', rating: 80 },
        { id: 4, name: 'Player4', rating: 70 },
        { id: 5, name: 'Player5', rating: 60 },
        { id: 6, name: 'Player6', rating: 50 },
      ];

      const teams = divideIntoTeams(players, 3);

      expect(teams.length).toBe(3);
      expect(teams[0].length).toBe(2);
      expect(teams[1].length).toBe(2);
      expect(teams[2].length).toBe(2);
    });

    test('должен корректно разделить игроков на 4 команды', () => {
      const players = Array.from({ length: 16 }, (_, i) => ({
        id: i + 1,
        name: `Player${i + 1}`,
        rating: 100 - i,
      }));

      const teams = divideIntoTeams(players, 4);

      expect(teams.length).toBe(4);
      teams.forEach(team => {
        expect(team.length).toBe(4);
      });
    });
  });

  describe('Крайние случаи', () => {
    test('должен вернуть пустые команды если игроков нет', () => {
      const teams = divideIntoTeams([], 2);

      expect(teams.length).toBe(2);
      expect(teams[0].length).toBe(0);
      expect(teams[1].length).toBe(0);
    });

    test('должен вернуть пустые команды если игроков меньше чем команд', () => {
      const players = [
        { id: 1, name: 'Player1', rating: 100 },
      ];

      const teams = divideIntoTeams(players, 3);

      expect(teams.length).toBe(3);
      // Функция возвращает пустые команды, так как игроков меньше чем команд
      expect(teams[0].length).toBe(0);
      expect(teams[1].length).toBe(0);
      expect(teams[2].length).toBe(0);
    });

    test('должен обработать null без ошибок', () => {
      const teams = divideIntoTeams(null, 2);

      expect(teams.length).toBe(2);
      expect(teams[0].length).toBe(0);
      expect(teams[1].length).toBe(0);
    });

    test('должен обработать undefined без ошибок', () => {
      const teams = divideIntoTeams(undefined, 2);

      expect(teams.length).toBe(2);
      expect(teams[0].length).toBe(0);
      expect(teams[1].length).toBe(0);
    });
  });

  describe('Сортировка по рейтингу', () => {
    test('должен сортировать игроков по убыванию рейтинга', () => {
      const players = [
        { id: 1, name: 'Player1', rating: 70 },
        { id: 2, name: 'Player2', rating: 100 },
        { id: 3, name: 'Player3', rating: 50 },
        { id: 4, name: 'Player4', rating: 90 },
      ];

      const teams = divideIntoTeams(players, 2);

      // Первым должен быть Player2 с рейтингом 100
      expect(teams[0][0].rating).toBe(100);
    });

    test('должен обработать игроков без рейтинга', () => {
      const players = [
        { id: 1, name: 'Player1', rating: 100 },
        { id: 2, name: 'Player2' },
        { id: 3, name: 'Player3', rating: 50 },
        { id: 4, name: 'Player4', rating: null },
      ];

      const teams = divideIntoTeams(players, 2);

      expect(teams.length).toBe(2);
      expect(teams[0].length + teams[1].length).toBe(4);
    });

    test('должен обработать отрицательные рейтинги', () => {
      const players = [
        { id: 1, name: 'Player1', rating: -10 },
        { id: 2, name: 'Player2', rating: 50 },
        { id: 3, name: 'Player3', rating: -5 },
        { id: 4, name: 'Player4', rating: 100 },
      ];

      const teams = divideIntoTeams(players, 2);

      expect(teams.length).toBe(2);
      expect(teams[0][0].rating).toBe(100);
    });
  });

  describe('Неравномерное распределение', () => {
    test('должен корректно распределить нечетное количество игроков', () => {
      const players = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Player${i + 1}`,
        rating: 100 - i,
      }));

      const teams = divideIntoTeams(players, 2);

      expect(teams[0].length + teams[1].length).toBe(5);
      // Разница должна быть не больше 1
      expect(Math.abs(teams[0].length - teams[1].length)).toBeLessThanOrEqual(1);
    });

    test('должен корректно распределить 10 игроков на 3 команды', () => {
      const players = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Player${i + 1}`,
        rating: 100 - i,
      }));

      const teams = divideIntoTeams(players, 3);

      expect(teams[0].length + teams[1].length + teams[2].length).toBe(10);
      const lengths = teams.map(t => t.length);
      const minLength = Math.min(...lengths);
      const maxLength = Math.max(...lengths);
      expect(maxLength - minLength).toBeLessThanOrEqual(1);
    });
  });

  describe('Не модифицирует исходный массив', () => {
    test('должен создать новые массивы, не модифицируя исходные', () => {
      const players = [
        { id: 1, name: 'Player1', rating: 100 },
        { id: 2, name: 'Player2', rating: 90 },
        { id: 3, name: 'Player3', rating: 80 },
        { id: 4, name: 'Player4', rating: 70 },
      ];

      const originalPlayers = JSON.parse(JSON.stringify(players));
      divideIntoTeams(players, 2);

      expect(players).toEqual(originalPlayers);
    });
  });
});

