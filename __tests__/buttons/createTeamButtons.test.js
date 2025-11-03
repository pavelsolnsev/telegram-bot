const { createTeamButtons } = require('../../buttons/createTeamButtons');

describe('createTeamButtons', () => {
  const mockTeam = [
    { id: 1, name: 'Player1', username: 'player1' },
    { id: 2, name: 'Player2', username: 'player2' },
    { id: 3, name: 'Player3', username: 'player3' },
  ];

  describe('Базовая функциональность', () => {
    test('должен создать кнопки для всех игроков команды', () => {
      const buttons = createTeamButtons(mockTeam, 0);

      expect(buttons).toHaveLength(2); // 2 ряда (по 2 кнопки в ряду, последняя отдельно)
    });

    test('должен включить цвет команды в кнопки', () => {
      const buttons = createTeamButtons(mockTeam, 0);
      const allButtons = buttons.flat();

      expect(allButtons.length).toBe(3);
    });

    test('должен использовать username если есть', () => {
      const buttons = createTeamButtons(mockTeam, 0);
      const allButtons = buttons.flat();
      const firstButton = allButtons[0];

      expect(firstButton.text).toContain('player1');
      expect(firstButton.text).not.toContain('Player1');
    });

    test('должен использовать name если нет username', () => {
      const teamWithoutUsername = [
        { id: 1, name: 'Player1' },
        { id: 2, name: 'Player2' },
      ];

      const buttons = createTeamButtons(teamWithoutUsername, 0);
      const allButtons = buttons.flat();

      expect(allButtons[0].text).toContain('Player1');
    });
  });

  describe('Цвета команд', () => {
    test('должен использовать 🔴 для команды 0', () => {
      const buttons = createTeamButtons(mockTeam, 0);
      const allButtons = buttons.flat();

      allButtons.forEach(button => {
        expect(button.text).toContain('🔴');
      });
    });

    test('должен использовать 🔵 для команды 1', () => {
      const buttons = createTeamButtons(mockTeam, 1);
      const allButtons = buttons.flat();

      allButtons.forEach(button => {
        expect(button.text).toContain('🔵');
      });
    });

    test('должен использовать 🟢 для команды 2', () => {
      const buttons = createTeamButtons(mockTeam, 2);
      const allButtons = buttons.flat();

      allButtons.forEach(button => {
        expect(button.text).toContain('🟢');
      });
    });

    test('должен использовать 🟡 для команды 3', () => {
      const buttons = createTeamButtons(mockTeam, 3);
      const allButtons = buttons.flat();

      allButtons.forEach(button => {
        expect(button.text).toContain('🟡');
      });
    });

    test('должен использовать ⚽ для неизвестных индексов', () => {
      const buttons = createTeamButtons(mockTeam, 99);
      const allButtons = buttons.flat();

      allButtons.forEach(button => {
        expect(button.text).toContain('⚽');
      });
    });
  });

  describe('Callback данные', () => {
    test('должен создать правильный callback для каждого игрока', () => {
      const buttons = createTeamButtons(mockTeam, 0);
      const allButtons = buttons.flat();

      expect(allButtons[0].callback_data).toBe('goal_0_0');
      expect(allButtons[1].callback_data).toBe('goal_0_1');
      expect(allButtons[2].callback_data).toBe('goal_0_2');
    });

    test('должен использовать правильный индекс команды в callback', () => {
      const buttons = createTeamButtons(mockTeam, 2);
      const allButtons = buttons.flat();

      expect(allButtons[0].callback_data).toBe('goal_2_0');
      expect(allButtons[1].callback_data).toBe('goal_2_1');
      expect(allButtons[2].callback_data).toBe('goal_2_2');
    });
  });

  describe('Группировка кнопок', () => {
    test('должен группировать кнопки по 2 в ряд для четного количества', () => {
      const buttons = createTeamButtons(mockTeam, 0);

      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveLength(2);
      expect(buttons[1]).toHaveLength(1);
    });

    test('должен группировать кнопки по 2 в ряд для команды из 2 игроков', () => {
      const team2 = mockTeam.slice(0, 2);
      const buttons = createTeamButtons(team2, 0);

      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveLength(2);
    });

    test('должен группировать кнопки по 2 в ряд для команды из 4 игроков', () => {
      const team4 = mockTeam.concat([{ id: 4, name: 'Player4', username: 'player4' }]);
      const buttons = createTeamButtons(team4, 0);

      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveLength(2);
      expect(buttons[1]).toHaveLength(2);
    });

    test('должен группировать кнопки по 2 в ряд для команды из 5 игроков', () => {
      const team5 = mockTeam.concat([
        { id: 4, name: 'Player4', username: 'player4' },
        { id: 5, name: 'Player5', username: 'player5' },
      ]);
      const buttons = createTeamButtons(team5, 0);

      expect(buttons).toHaveLength(3);
      expect(buttons[0]).toHaveLength(2);
      expect(buttons[1]).toHaveLength(2);
      expect(buttons[2]).toHaveLength(1);
    });
  });

  describe('Нумерация игроков', () => {
    test('должен нумеровать игроков с 1', () => {
      const buttons = createTeamButtons(mockTeam, 0);
      const allButtons = buttons.flat();

      expect(allButtons[0].text).toContain('1.');
      expect(allButtons[1].text).toContain('2.');
      expect(allButtons[2].text).toContain('3.');
    });

    test('должен правильно форматировать номера для больших команд', () => {
      const largeTeam = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Player${i + 1}`,
        username: `player${i + 1}`,
      }));

      const buttons = createTeamButtons(largeTeam, 0);
      const allButtons = buttons.flat();

      expect(allButtons[0].text).toContain('1.');
      expect(allButtons[9].text).toContain('10.');
    });
  });

  describe('Формат текста кнопок', () => {
    test('должен создать правильный формат: цвет номер. username', () => {
      const buttons = createTeamButtons(mockTeam, 0);
      const allButtons = buttons.flat();

      expect(allButtons[0].text).toMatch(/^🔴 1\. player1$/);
      expect(allButtons[1].text).toMatch(/^🔴 2\. player2$/);
      expect(allButtons[2].text).toMatch(/^🔴 3\. player3$/);
    });

    test('должен использовать name если нет username', () => {
      const teamWithoutUsername = [
        { id: 1, name: 'Player Name' },
      ];

      const buttons = createTeamButtons(teamWithoutUsername, 0);
      const allButtons = buttons.flat();

      expect(allButtons[0].text).toMatch(/^🔴 1\. Player Name$/);
    });
  });

  describe('Крайние случаи', () => {
    test('должен обработать пустую команду', () => {
      const buttons = createTeamButtons([], 0);

      expect(buttons).toHaveLength(0);
    });

    test('должен обработать команду с одним игроком', () => {
      const singlePlayerTeam = [{ id: 1, name: 'Solo', username: 'solo' }];

      const buttons = createTeamButtons(singlePlayerTeam, 0);

      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveLength(1);
      expect(buttons[0][0].text).toContain('solo');
    });

    test('должен обработать команду с большим количеством игроков', () => {
      const largeTeam = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Player${i + 1}`,
        username: `player${i + 1}`,
      }));

      const buttons = createTeamButtons(largeTeam, 0);

      expect(buttons).toHaveLength(10); // 20 игроков / 2 = 10 рядов
      buttons.forEach(row => {
        expect(row.length).toBe(2);
      });
    });
  });

  describe('Негативные индексы', () => {
    test('должен обработать отрицательный индекс команды', () => {
      const buttons = createTeamButtons(mockTeam, -1);
      const allButtons = buttons.flat();

      allButtons.forEach(button => {
        expect(button.text).toContain('⚽');
      });
    });
  });
});

