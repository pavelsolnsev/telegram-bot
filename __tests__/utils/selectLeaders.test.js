const { selectLeaders } = require('../../utils/selectLeaders');

describe('selectLeaders', () => {
  test('должен выбрать лидеров по голам, ассистам и сейвам', () => {
    const players = [
      { id: 1, username: 'a', goals: 2, assists: 1, saves: 0 },
      { id: 2, username: 'b', goals: 5, assists: 0, saves: 3 },
      { id: 3, username: 'c', goals: 4, assists: 4, saves: 5 },
    ];

    const leaders = selectLeaders(players);

    expect(leaders.scorer.players).toHaveLength(1);
    expect(leaders.scorer.players[0].username).toBe('b');
    expect(leaders.scorer.goals).toBe(5);

    expect(leaders.assistant.players).toHaveLength(1);
    expect(leaders.assistant.players[0].username).toBe('c');
    expect(leaders.assistant.assists).toBe(4);

    expect(leaders.goalkeeper.players).toHaveLength(1);
    expect(leaders.goalkeeper.players[0].username).toBe('c');
    expect(leaders.goalkeeper.saves).toBe(5);
  });

  test('должен выбрать всех игроков с одинаковым максимумом', () => {
    const players = [
      { id: 1, username: 'a', goals: 3, assists: 2, saves: 1 },
      { id: 2, username: 'b', goals: 3, assists: 2, saves: 1 },
      { id: 3, username: 'c', goals: 2, assists: 1, saves: 0 },
    ];

    const leaders = selectLeaders(players);

    expect(leaders.scorer.players).toHaveLength(2);
    expect(leaders.scorer.goals).toBe(3);
    expect(leaders.scorer.players.map(p => p.username)).toContain('a');
    expect(leaders.scorer.players.map(p => p.username)).toContain('b');

    expect(leaders.assistant.players).toHaveLength(2);
    expect(leaders.assistant.assists).toBe(2);
    expect(leaders.assistant.players.map(p => p.username)).toContain('a');
    expect(leaders.assistant.players.map(p => p.username)).toContain('b');

    expect(leaders.goalkeeper.players).toHaveLength(2);
    expect(leaders.goalkeeper.saves).toBe(1);
    expect(leaders.goalkeeper.players.map(p => p.username)).toContain('a');
    expect(leaders.goalkeeper.players.map(p => p.username)).toContain('b');
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

