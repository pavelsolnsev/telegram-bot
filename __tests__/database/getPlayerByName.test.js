// Тесты для getPlayerByName из database/getPlayerByName.js

// Мокаем базу данных перед импортом модуля
const mockQuery = jest.fn();
jest.mock('../../database/database', () => ({
  query: mockQuery,
}));

const getPlayerByName = require('../../database/getPlayerByName');

describe('getPlayerByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Генерация ID из имени', () => {
    test('должен генерировать стабильный ID для одного и того же имени', async () => {
      // Мокаем пустой результат поиска (игрок не найден)
      mockQuery
        .mockResolvedValueOnce([[]]) // Поиск по username/name - не найден
        .mockResolvedValueOnce([[]]); // Проверка ID - свободен

      const result1 = await getPlayerByName('Иван');

      // Очищаем моки для второго вызова
      mockQuery.mockClear();
      mockQuery
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result2 = await getPlayerByName('Иван');

      // ID должны быть одинаковыми для одного и того же имени
      expect(result1.id).toBe(result2.id);
      expect(result1.username).toBe('Иван');
      expect(result2.username).toBe('Иван');
    });

    test('должен генерировать разные ID для разных имен', async () => {
      mockQuery
        .mockResolvedValueOnce([[]]) // Поиск по username/name - не найден
        .mockResolvedValueOnce([[]]); // Проверка ID - свободен

      const result1 = await getPlayerByName('Иван');

      mockQuery.mockClear();
      mockQuery
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result2 = await getPlayerByName('Петр');

      // ID должны быть разными для разных имен
      expect(result1.id).not.toBe(result2.id);
    });

    test('должен генерировать ID в диапазоне 200000-299999', async () => {
      mockQuery
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await getPlayerByName('TestPlayer');

      expect(result.id).toBeGreaterThanOrEqual(200000);
      expect(result.id).toBeLessThan(300000);
    });
  });

  describe('Поиск существующего игрока', () => {
    test('должен найти игрока по username', async () => {
      const existingPlayer = {
        id: 250000,
        name: 'Иван',
        username: 'Иван',
      };

      mockQuery.mockResolvedValueOnce([[existingPlayer]]);

      const result = await getPlayerByName('Иван');

      expect(result.id).toBe(existingPlayer.id);
      expect(result.username).toBe('Иван');
      expect(result.name).toBe('Иван');
      expect(result.found).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('должен найти игрока по name, если username пустой', async () => {
      const existingPlayer = {
        id: 250001,
        name: 'Петр',
        username: null,
      };

      mockQuery.mockResolvedValueOnce([[existingPlayer]]);

      const result = await getPlayerByName('Петр');

      expect(result.id).toBe(existingPlayer.id);
      expect(result.username).toBe('Петр'); // username должен быть установлен из name
      expect(result.name).toBe('Петр');
      expect(result.found).toBe(true);
    });

    test('должен быть нечувствителен к регистру', async () => {
      const existingPlayer = {
        id: 250002,
        name: 'Иван',
        username: 'Иван',
      };

      mockQuery.mockResolvedValueOnce([[existingPlayer]]);

      const result = await getPlayerByName('иван');

      expect(result.id).toBe(existingPlayer.id);
      expect(result.found).toBe(true);
    });

    test('должен игнорировать пробелы в начале и конце', async () => {
      const existingPlayer = {
        id: 250003,
        name: 'Иван',
        username: 'Иван',
      };

      mockQuery.mockResolvedValueOnce([[existingPlayer]]);

      const result = await getPlayerByName('  Иван  ');

      expect(result.id).toBe(existingPlayer.id);
      expect(result.found).toBe(true);
    });
  });

  describe('Создание нового игрока', () => {
    test('должен создать нового игрока с username', async () => {
      mockQuery
        .mockResolvedValueOnce([[]]) // Поиск по username/name - не найден
        .mockResolvedValueOnce([[]]); // Проверка ID - свободен

      const result = await getPlayerByName('НовыйИгрок');

      expect(result.id).toBeGreaterThanOrEqual(200000);
      expect(result.id).toBeLessThan(300000);
      expect(result.username).toBe('НовыйИгрок');
      expect(result.name).toBe('НовыйИгрок');
      expect(result.found).toBe(false);
    });

    test('должен использовать имя как username', async () => {
      mockQuery
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await getPlayerByName('Test User');

      expect(result.username).toBe('Test User');
      expect(result.name).toBe('Test User');
    });
  });

  describe('Обработка коллизий ID', () => {
    test('должен использовать существующий ID, если имя совпадает', async () => {
      const existingPlayer = {
        id: 250100,
        name: 'Иван',
        username: 'Иван',
      };

      mockQuery
        .mockResolvedValueOnce([[]]) // Поиск по username/name - не найден
        .mockResolvedValueOnce([[existingPlayer]]); // ID занят, но имя совпадает

      const result = await getPlayerByName('Иван');

      expect(result.id).toBe(existingPlayer.id);
      expect(result.username).toBe('Иван');
      expect(result.found).toBe(true);
    });

    test('должен генерировать альтернативный ID при коллизии', async () => {
      const conflictingPlayer = {
        id: 250200,
        name: 'ДругойИгрок',
        username: 'ДругойИгрок',
      };

      mockQuery
        .mockResolvedValueOnce([[]]) // Поиск по username/name - не найден
        .mockResolvedValueOnce([[conflictingPlayer]]) // ID занят другим игроком
        .mockResolvedValueOnce([[]]) // Повторный поиск по имени - не найден
        .mockResolvedValueOnce([[]]); // Альтернативный ID свободен

      const result = await getPlayerByName('НовыйИгрок');

      expect(result.id).toBeGreaterThanOrEqual(300000);
      expect(result.id).toBeLessThan(400000);
      expect(result.username).toBe('НовыйИгрок');
      expect(result.found).toBe(false);
    });

    test('должен использовать смещение, если альтернативный ID тоже занят', async () => {
      const conflictingPlayer1 = {
        id: 250300,
        name: 'ДругойИгрок1',
        username: 'ДругойИгрок1',
      };
      const conflictingPlayer2 = {
        id: 350300,
        name: 'ДругойИгрок2',
        username: 'ДругойИгрок2',
      };

      mockQuery
        .mockResolvedValueOnce([[]]) // Поиск по username/name - не найден
        .mockResolvedValueOnce([[conflictingPlayer1]]) // Первый ID занят
        .mockResolvedValueOnce([[]]) // Повторный поиск по имени - не найден
        .mockResolvedValueOnce([[conflictingPlayer2]]); // Альтернативный ID тоже занят

      const result = await getPlayerByName('НовыйИгрок');

      // Альтернативный ID тоже занят, поэтому используется смещение (alternativeId + 1)
      expect(result.id).toBeGreaterThanOrEqual(300000);
      expect(result.id).toBeLessThan(400000);
      expect(result.id).not.toBe(conflictingPlayer1.id); // Не должен быть равен первому занятому ID
      expect(result.id).not.toBe(conflictingPlayer2.id); // Не должен быть равен второму занятому ID
      expect(result.username).toBe('НовыйИгрок');
      expect(result.found).toBe(false);
    });
  });

  describe('Обработка ошибок', () => {
    test('должен повторить попытку при ошибке подключения', async () => {
      const error = new Error('Connection error');
      error.code = 'ER_CON_COUNT_ERROR';

      mockQuery
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([[]]) // Поиск по username/name - не найден
        .mockResolvedValueOnce([[]]); // Проверка ID - свободен

      const result = await getPlayerByName('Иван');

      expect(result).toBeDefined();
      expect(result.username).toBe('Иван');
      expect(mockQuery).toHaveBeenCalledTimes(3); // 1 ошибка + 2 успешных запроса
    });

    test('должен вернуть результат даже после всех попыток при ошибке', async () => {
      const error = new Error('Database error');

      mockQuery.mockRejectedValue(error);

      const result = await getPlayerByName('Иван');

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThanOrEqual(200000);
      expect(result.id).toBeLessThan(300000);
      expect(result.username).toBe('Иван');
      expect(result.found).toBe(false);
      expect(mockQuery).toHaveBeenCalledTimes(3); // 3 попытки
    });

    test('должен обработать ошибку без кода', async () => {
      const error = new Error('Unknown error');

      mockQuery.mockRejectedValue(error);

      const result = await getPlayerByName('Иван');

      expect(result).toBeDefined();
      expect(result.username).toBe('Иван');
    });
  });

  describe('Крайние случаи', () => {
    test('должен обработать пустое имя', async () => {
      mockQuery
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await getPlayerByName('   ');

      expect(result).toBeDefined();
      expect(result.username).toBe('');
    });

    test('должен обработать длинное имя', async () => {
      const longName = 'ОченьДлинноеИмяИгрокаКотороеМожетБытьОченьДлинным';

      mockQuery
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await getPlayerByName(longName);

      expect(result.username).toBe(longName);
      expect(result.id).toBeGreaterThanOrEqual(200000);
    });

    test('должен обработать имя с пробелами', async () => {
      mockQuery
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await getPlayerByName('Иван Петров');

      expect(result.username).toBe('Иван Петров');
    });
  });

  describe('Приоритет username над name', () => {
    test('должен использовать username, если он есть', async () => {
      const existingPlayer = {
        id: 250400,
        name: 'СтароеИмя',
        username: 'НовоеИмя',
      };

      mockQuery.mockResolvedValueOnce([[existingPlayer]]);

      const result = await getPlayerByName('НовоеИмя');

      expect(result.username).toBe('НовоеИмя');
      expect(result.id).toBe(existingPlayer.id);
    });

    test('должен использовать name как username, если username пустой', async () => {
      const existingPlayer = {
        id: 250401,
        name: 'ИмяБезUsername',
        username: null,
      };

      mockQuery.mockResolvedValueOnce([[existingPlayer]]);

      const result = await getPlayerByName('ИмяБезUsername');

      expect(result.username).toBe('ИмяБезUsername');
      expect(result.id).toBe(existingPlayer.id);
    });
  });
});

