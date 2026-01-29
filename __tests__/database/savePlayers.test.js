const mockQuery = jest.fn();

jest.mock('../../database/database', () => ({
  query: mockQuery,
}));

const savePlayersToDatabase = require('../../database/savePlayers');

describe('savePlayersToDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('добавляет mvp и инкрементирует его в запросе', async () => {
    // Первая выборка возвращает текущий рейтинг
    mockQuery
      .mockResolvedValueOnce([[{ id: 1, rating: 5 }]]) // SELECT
      .mockResolvedValueOnce([]); // INSERT ... ON DUPLICATE

    const players = [
      {
        id: 1,
        name: 'Player1',
        username: 'player1',
        rating: 0, // изменение рейтинга за матч
        mvp: 1,
      },
    ];

    await savePlayersToDatabase(players);

    // Проверяем, что второй вызов (INSERT) содержит колонку mvp
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const insertCall = mockQuery.mock.calls[1];
    const [query, valuesWrapper] = insertCall;

    expect(query).toContain('mvp');
    expect(query).toContain('mvp = mvp + VALUES(mvp)');

    const [[firstRow]] = valuesWrapper;
    expect(firstRow).toEqual([
      1, // id
      'Player1', // name
      'player1', // username
      0, // goals
      0, // assists
      0, // saves
      0, // gamesPlayed
      0, // wins
      0, // draws
      0, // losses
      5, // rating (5 base + 0 change)
      1, // mvp
      0, // yellowCards
    ]);
  });
});

