const { selectLeaders } = require('../../utils/selectLeaders');

describe('selectLeaders', () => {
  test('должен выбрать лидеров по голам, ассистам и сейвам', () => {
    const players = [
      { id: 1, username: 'a', goals: 2, assists: 1, saves: 0 },
      { id: 2, username: 'b', goals: 5, assists: 0, saves: 3 },
      { id: 3, username: 'c', goals: 4, assists: 4, saves: 5 },
    ];

    const leaders = selectLeaders(players);

    expect(leaders.scorer.player.username).toBe('b');
    expect(leaders.scorer.goals).toBe(5);

    expect(leaders.assistant.player.username).toBe('c');
    expect(leaders.assistant.assists).toBe(4);

    expect(leaders.goalkeeper.player.username).toBe('c');
    expect(leaders.goalkeeper.saves).toBe(5);
  });

  test('должен вернуть null, если нет значений по показателю', () => {
    const players = [
      { id: 1, username: 'a', goals: 0, assists: 0, saves: 0 },
      { id: 2, username: 'b', goals: null, assists: undefined, saves: 0 },
    ];

    const leaders = selectLeaders(players);

    expect(leaders.scorer).toBeNull();
    expect(leaders.assistant).toBeNull();
    expect(leaders.goalkeeper).toBeNull();
  });
});

