const { buildPlayingTeamsMessage } = require('../../message/buildPlayingTeamsMessage');

describe('buildPlayingTeamsMessage', () => {
  const mockTeam1 = [
    { id: 1, name: 'Player1', username: 'player1', goals: 0 },
    { id: 2, name: 'Player2', username: 'player2', goals: 0 },
  ];

  const mockTeam2 = [
    { id: 3, name: 'Player3', username: 'player3', goals: 0 },
    { id: 4, name: 'Player4', username: 'player4', goals: 0 },
  ];

  describe('Базовые сообщения', () => {
    test('должен создать сообщение для играющих команд', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');

      expect(message).toContain('⚽');
      expect(message).toContain('Команды на поле');
      expect(message).toContain('Команда 1');
      expect(message).toContain('Команда 2');
    });

    test('должен создать сообщение для завершенных матчей', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'finished');

      expect(message).toContain('🏁 Итог матча 🏁');
      expect(message).toContain('Счет:');
    });

    test('должен использовать цвета команд', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');

      expect(message).toContain('🔴'); // Команда 1
      expect(message).toContain('🔵'); // Команда 2
    });

    test('должен включить всех игроков из обеих команд', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');

      expect(message).toContain('player1');
      expect(message).toContain('player2');
      expect(message).toContain('player3');
      expect(message).toContain('player4');
    });
  });

  describe('Индексы команд', () => {
    test('должен использовать правильные индексы команд', () => {
      const message1 = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');
      const message2 = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 2, 3, 'playing');

      expect(message1).toContain('Команда 1');
      expect(message1).toContain('Команда 2');

      expect(message2).toContain('Команда 3');
      expect(message2).toContain('Команда 4');
    });

    test('должен использовать правильные цвета для разных индексов', () => {
      const message012 = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');
      const message23 = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 2, 3, 'playing');

      expect(message012).toContain('🔴');
      expect(message012).toContain('🔵');

      expect(message23).toContain('🟢');
      expect(message23).toContain('🟡');
    });
  });

  describe('Голы игроков', () => {
    test('должен показать голы игроков', () => {
      const team1WithGoals = [
        { id: 1, name: 'Player1', username: 'player1', goals: 2 },
        { id: 2, name: 'Player2', username: 'player2', goals: 1 },
      ];

      const message = buildPlayingTeamsMessage(team1WithGoals, mockTeam2, 0, 1, 'playing');

      expect(message).toContain('⚽2');
      expect(message).toContain('⚽1');
    });

    test('не должен показывать голы если они равны 0', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');

      expect(message).not.toContain('⚽0');
    });

    test('должен посчитать общее количество голов для finished статуса', () => {
      const team1WithGoals = [
        { id: 1, name: 'Player1', username: 'player1', goals: 3 },
        { id: 2, name: 'Player2', username: 'player2', goals: 1 },
      ];
      const team2WithGoals = [
        { id: 3, name: 'Player3', username: 'player3', goals: 2 },
        { id: 4, name: 'Player4', username: 'player4', goals: 1 },
      ];

      const message = buildPlayingTeamsMessage(team1WithGoals, team2WithGoals, 0, 1, 'finished');

      expect(message).toContain('4:3');
      expect(message).toContain('🔴 побеждает!');
    });

    test('должен показать победу второй команды', () => {
      const team1WithGoals = [
        { id: 1, name: 'Player1', username: 'player1', goals: 2 },
      ];
      const team2WithGoals = [
        { id: 2, name: 'Player2', username: 'player2', goals: 5 },
      ];

      const message = buildPlayingTeamsMessage(team1WithGoals, team2WithGoals, 0, 1, 'finished');

      expect(message).toContain('2:5');
      expect(message).toContain('🔵 побеждает!');
    });

    test('должен показать ничью', () => {
      const team1WithGoals = [
        { id: 1, name: 'Player1', username: 'player1', goals: 2 },
      ];
      const team2WithGoals = [
        { id: 2, name: 'Player2', username: 'player2', goals: 2 },
      ];

      const message = buildPlayingTeamsMessage(team1WithGoals, team2WithGoals, 0, 1, 'finished');

      expect(message).toContain('2:2');
      expect(message).toContain('🤝 Ничья!');
    });

    test('пробел перед ассистом только если нет гола', () => {
      const teamOnlyAssist = [
        { id: 1, name: 'AssistOnly', username: 'assist', goals: 0, assists: 2, saves: 0 },
      ];
      const teamGoalAssist = [
        { id: 1, name: 'GoalAssist', username: 'ga', goals: 1, assists: 1, saves: 0 },
      ];

      const msgOnlyAssist = buildPlayingTeamsMessage(teamOnlyAssist, teamOnlyAssist, 0, 1, 'playing');
      const msgGoalAssist = buildPlayingTeamsMessage(teamGoalAssist, teamGoalAssist, 0, 1, 'playing');

      const onlyAssistLines = [...msgOnlyAssist.matchAll(/<code>([\s\S]*?)<\/code>/g)]
        .flatMap((m) => m[1].split('\n').map((l) => l.trim()).filter(Boolean));
      const goalAssistLines = [...msgGoalAssist.matchAll(/<code>([\s\S]*?)<\/code>/g)]
        .flatMap((m) => m[1].split('\n').map((l) => l.trim()).filter(Boolean));

      expect(onlyAssistLines.some((l) => l.includes(' 🅰️2'))).toBe(true);
      expect(onlyAssistLines.some((l) => l.includes('⚽'))).toBe(false);

      expect(goalAssistLines.some((l) => l.includes('⚽1🅰️1'))).toBe(true);
      expect(goalAssistLines.some((l) => l.includes(' ⚽1 🅰️1'))).toBe(false);
    });

    test('сейвы: пробел если только сейвы, без пробела после голов/ассистов', () => {
      const onlySaves = [
        { id: 1, name: 'Keeper', username: 'gk', goals: 0, assists: 0, saves: 3 },
      ];
      const goalsAssistsSaves = [
        { id: 1, name: 'GkStats', username: 'gkstats', goals: 1, assists: 1, saves: 2 },
      ];

      const msgOnlySaves = buildPlayingTeamsMessage(onlySaves, onlySaves, 0, 1, 'playing');
      const msgAll = buildPlayingTeamsMessage(goalsAssistsSaves, goalsAssistsSaves, 0, 1, 'playing');

      const onlySavesLines = [...msgOnlySaves.matchAll(/<code>([\s\S]*?)<\/code>/g)]
        .flatMap((m) => m[1].split('\n').map((l) => l.trim()).filter(Boolean));
      const allLines = [...msgAll.matchAll(/<code>([\s\S]*?)<\/code>/g)]
        .flatMap((m) => m[1].split('\n').map((l) => l.trim()).filter(Boolean));

      expect(onlySavesLines.some((l) => l.includes(' 🧤3'))).toBe(true);
      expect(onlySavesLines.some((l) => l.includes('⚽'))).toBe(false);
      expect(onlySavesLines.some((l) => l.includes('🅰️'))).toBe(false);

      expect(allLines.some((l) => l.includes('⚽1🅰️1🧤2'))).toBe(true);
      expect(allLines.some((l) => l.includes(' ⚽1 🅰️1 🧤2'))).toBe(false);
    });
  });

  describe('Отображение данных из разных источников', () => {
    test('должен использовать team1/team2 для статуса playing', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');

      // Проверяем что используются данные из переданных команд
      expect(message).toContain('player1');
      expect(message).toContain('player2');
      expect(message).toContain('player3');
      expect(message).toContain('player4');
    });

    test('должен использовать updatedTeams для статуса finished', () => {
      const updatedTeams = [
        [{ id: 1, name: 'Updated1', username: 'updated1', goals: 0 }],
        [{ id: 2, name: 'Updated2', username: 'updated2', goals: 0 }],
      ];

      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'finished', updatedTeams);

      // Используются updatedTeams
      expect(message).toContain('updated1');
      expect(message).toContain('updated2');
    });

    test('должен использовать fallback на team1/team2 если updatedTeams не передан', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'finished');

      expect(message).toContain('player1');
      expect(message).toContain('player2');
      expect(message).toContain('player3');
      expect(message).toContain('player4');
    });
  });

  describe('Форматирование имен', () => {
    test('должен использовать username если есть', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');

      expect(message).toContain('player1');
      expect(message).not.toContain('Player1');
    });

    test('должен использовать name если нет username', () => {
      const teamWithoutUsername = [
        { id: 1, name: 'Player1', goals: 0 },
      ];

      const message = buildPlayingTeamsMessage(teamWithoutUsername, mockTeam2, 0, 1, 'playing');

      expect(message).toContain('Player1');
    });

    test('должен обрезать длинные имена', () => {
      const longNameTeam = [
        { id: 1, name: 'VeryLongPlayerName', username: 'long', goals: 0 },
      ];

      const message = buildPlayingTeamsMessage(longNameTeam, mockTeam2, 0, 1, 'playing');

      expect(message).toContain('long');
    });

    test('не должен переносить строки с голами и ассистами (компактный формат)', () => {
      const teamWithStats = [
        { id: 1, name: 'SuperLongUsername12', username: 'long_username_123', goals: 3, assists: 2 },
      ];
      const message = buildPlayingTeamsMessage(teamWithStats, teamWithStats, 0, 1, 'playing');

      // Извлекаем строки игроков из <code> блоков и проверяем их длину (важно для мобильного представления)
      const codeBlocks = [...message.matchAll(/<code>([\s\S]*?)<\/code>/g)].map((match) => match[1]);
      const playerLines = codeBlocks
        .flatMap((block) => block.split('\n'))
        .map((line) => line.trim())
        .filter(Boolean);

      expect(playerLines.length).toBeGreaterThan(0);
      playerLines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(32);
      });
    });
  });

  describe('Крайние случаи', () => {
    test('должен обработать пустые команды', () => {
      const message = buildPlayingTeamsMessage([], [], 0, 1, 'playing');

      expect(message).toBeDefined();
      expect(message).toContain('Команда 1');
      expect(message).toContain('Команда 2');
    });

    test('должен обработать команды с одним игроком', () => {
      const singlePlayerTeam = [{ id: 1, name: 'Solo', username: 'solo', goals: 0 }];

      const message = buildPlayingTeamsMessage(singlePlayerTeam, singlePlayerTeam, 0, 1, 'playing');

      expect(message).toBeDefined();
      expect(message).toContain('solo');
    });

    test('должен обработать команды с большим количеством игроков', () => {
      const largeTeam = Array.from({ length: 16 }, (_, i) => ({
        id: i + 1,
        name: `Player${i + 1}`,
        username: `player${i + 1}`,
        goals: 0,
      }));

      const message = buildPlayingTeamsMessage(largeTeam, largeTeam, 0, 1, 'playing');

      expect(message).toBeDefined();
      expect(message).toContain('player1');
      expect(message).toContain('player16');
    });

    test('должен использовать дефолтный статус если не указан', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1);

      expect(message).toContain('⚽');
      expect(message).toContain('Команды на поле');
    });

    test('должен обработать неизвестный статус', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'unknown');

      expect(message).toBeDefined();
      expect(message).toContain('Команды на поле');
    });
  });

  describe('Нумерация игроков', () => {
    test('должен нумеровать игроков с 1', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'playing');

      expect(message).toContain(' 1.');
      expect(message).toContain(' 2.');
    });

    test('должен правильно форматировать однозначные и двухзначные номера', () => {
      const team10 = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Player${i + 1}`,
        username: `player${i + 1}`,
        goals: 0,
      }));

      const message = buildPlayingTeamsMessage(team10, team10, 0, 1, 'playing');

      expect(message).toContain(' 1.'); // однозначное
      expect(message).toContain(' 9.');
      expect(message).toContain('10.'); // двухзначное
    });
  });

  describe('Счет матча', () => {
    test('должен правильно рассчитать счет с нулевыми голами', () => {
      const message = buildPlayingTeamsMessage(mockTeam1, mockTeam2, 0, 1, 'finished');

      expect(message).toContain('0:0');
      expect(message).toContain('🤝 Ничья!');
    });

    test('должен обработать команды с разной длиной', () => {
      const shortTeam = [{ id: 1, name: 'Player1', username: 'player1', goals: 3 }];
      const longTeam = Array.from({ length: 5 }, (_, i) => ({
        id: i + 2,
        name: `Player${i + 2}`,
        username: `player${i + 2}`,
        goals: 0,
      }));

      const message = buildPlayingTeamsMessage(shortTeam, longTeam, 0, 1, 'finished');

      expect(message).toContain('3:0');
      expect(message).toContain('🔴 побеждает!');
    });

    test('должен обработать игроков без поля goals', () => {
      const teamWithoutGoals = [
        { id: 1, name: 'Player1', username: 'player1' },
      ];

      const message = buildPlayingTeamsMessage(teamWithoutGoals, teamWithoutGoals, 0, 1, 'finished');

      expect(message).toBeDefined();
      expect(message).toContain('0:0');
    });
  });
});

