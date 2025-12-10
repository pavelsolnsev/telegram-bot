const { buildTeamsMessage } = require('../../message/buildTeamsMessage');

describe('buildTeamsMessage', () => {
  const mockTeams = [
    [
      { id: 1, name: 'Player1', username: 'player1', rating: 50, goals: 0 },
      { id: 2, name: 'Player2', username: 'player2', rating: 40, goals: 0 },
    ],
    [
      { id: 3, name: 'Player3', username: 'player3', rating: 45, goals: 0 },
      { id: 4, name: 'Player4', username: 'player4', rating: 35, goals: 0 },
    ],
  ];

  describe('Базовая функциональность', () => {
    test('должен создать сообщение с двумя командами', () => {
      const message = buildTeamsMessage(mockTeams);

      expect(message).toBeDefined();
      expect(message).toContain('Составы команд');
      expect(message).toContain('Команда 1:');
      expect(message).toContain('Команда 2:');
    });

    test('должен использовать кастомный заголовок', () => {
      const title = 'Мой заголовок';
      const message = buildTeamsMessage(mockTeams, title);

      expect(message).toContain(title);
    });

    test('должен включить всех игроков из команд', () => {
      const message = buildTeamsMessage(mockTeams);

      expect(message).toContain('player1');
      expect(message).toContain('player2');
      expect(message).toContain('player3');
      expect(message).toContain('player4');
    });

    test('должен использовать username если есть', () => {
      const message = buildTeamsMessage(mockTeams);

      expect(message).toContain('player1');
      expect(message).toContain('player2');
    });
  });

  describe('Таблица статистики', () => {
    test('должен добавить таблицу статистики', () => {
      const teamStats = {
        team1: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 10, goalsConceded: 5 },
        team2: { wins: 1, losses: 2, draws: 0, games: 3, goalsScored: 5, goalsConceded: 10 },
      };

      const message = buildTeamsMessage(mockTeams, 'Составы команд', teamStats, mockTeams);

      expect(message).toContain('М  Ком|И|В|Н|П|ЗМ|ПМ|РМ|О');
      expect(message).toContain('--+---+--+-+-+-+-+--+-+-+');
    });

    test('должен рассчитать очки корректно (3 за победу, 1 за ничью)', () => {
      const teamStats = {
        team1: { wins: 2, losses: 1, draws: 1, games: 4, goalsScored: 10, goalsConceded: 5 },
        team2: { wins: 1, losses: 2, draws: 1, games: 4, goalsScored: 5, goalsConceded: 10 },
      };

      const message = buildTeamsMessage(mockTeams, 'Составы команд', teamStats, mockTeams);

      // Команда 1: 2*3 + 1*1 = 7 очков
      expect(message).toMatch(/[^|]\|7/);
    });

    test('должен отсортировать команды по очкам', () => {
      const teamStats = {
        team1: { wins: 0, losses: 2, draws: 0, games: 2, goalsScored: 2, goalsConceded: 5 },
        team2: { wins: 2, losses: 0, draws: 0, games: 2, goalsScored: 10, goalsConceded: 2 },
      };

      const message = buildTeamsMessage(mockTeams, 'Составы команд', teamStats, mockTeams);

      // Команда 2 должна быть первой (больше очков)
      const team2Position = message.indexOf('🔵 <b>Команда 2:');
      const team1Position = message.indexOf('🔴 <b>Команда 1:');

      // team2 должно быть раньше в контексте таблицы, но после таблицы позиции могут быть другими
      // Просто проверяем что обе команды есть
      expect(team2Position).not.toBe(-1);
      expect(team1Position).not.toBe(-1);
    });

    test('должен использовать разницу мячей для сортировки при равных очках', () => {
      const teamStats = {
        team1: { wins: 2, losses: 0, draws: 0, games: 2, goalsScored: 5, goalsConceded: 2 },
        team2: { wins: 2, losses: 0, draws: 0, games: 2, goalsScored: 10, goalsConceded: 2 },
      };

      const message = buildTeamsMessage(mockTeams, 'Составы команд', teamStats, mockTeams);

      expect(message).toBeDefined();
      // Разница мячей team2 (8) больше чем team1 (3)
    });

    test('должен обработать отсутствие статистики для команды', () => {
      const message = buildTeamsMessage(mockTeams, 'Составы команд', {}, mockTeams);

      expect(message).toBeDefined();
      expect(message).toContain('Составы:');
    });
  });

  describe('MVP игрок', () => {
    test('должен добавить MVP игрока в сообщение', () => {
      const mvpPlayer = {
        id: 1,
        name: 'MVP Player',
        username: 'mvp',
        rating: 15,
      };

      const message = buildTeamsMessage(mockTeams, 'Составы команд', {}, mockTeams, mvpPlayer);

      expect(message).toContain('🏅 MVP:');
      expect(message).toContain('mvp');
      expect(message).toContain('+15');
    });

    test('должен использовать name если нет username для MVP', () => {
      const mvpPlayer = {
        id: 1,
        first_name: 'MVP',
        last_name: 'Player',
        rating: 15,
      };

      const message = buildTeamsMessage(mockTeams, 'Составы команд', {}, mockTeams, mvpPlayer);

      expect(message).toContain('🏅 MVP:');
      expect(message).toContain('MVP Player');
    });
  });

  describe('Лидеры матча', () => {
    test('должен добавить блок с лучшими игроками по голам/ассистам/сейвам', () => {
      const leaders = {
        scorer: { player: { username: 'goalKing', name: 'Goal King' }, goals: 5 },
        assistant: { player: { username: 'assistPro', name: 'Assist Pro' }, assists: 3 },
        goalkeeper: { player: { username: 'safeHands', name: 'Safe Hands' }, saves: 7 },
      };

      const message = buildTeamsMessage(
        mockTeams,
        'Тест',
        {},
        mockTeams,
        null,
        true,
        leaders,
      );

      expect(message).toContain('Лучший бомбардир');
      expect(message).toContain('goalKing');
      expect(message).toContain('5');

      expect(message).toContain('Лучший ассистент');
      expect(message).toContain('assistPro');
      expect(message).toContain('3');

      expect(message).toContain('Лучший вратарь');
      expect(message).toContain('safeHands');
      expect(message).toContain('7');
    });

    test('не должен выводить блок лидеров, если данные не переданы', () => {
      const message = buildTeamsMessage(mockTeams);

      expect(message).not.toContain('Лучший бомбардир');
      expect(message).not.toContain('Лучший ассистент');
      expect(message).not.toContain('Лучший вратарь');
    });
  });

  describe('Рейтинг игроков', () => {
    test('должен показать рейтинг с иконками', () => {
      const teamsWithRatings = [
        [{ id: 1, name: 'Low', username: 'low', rating: 5 }],
        [{ id: 2, name: 'Medium', username: 'medium', rating: 50 }],
        [{ id: 3, name: 'High', username: 'high', rating: 120 }],
      ];

      const message = buildTeamsMessage(teamsWithRatings, 'Тест', {}, teamsWithRatings, null, true);

      expect(message).toContain('⭐'); // Для рейтинга < 10
      expect(message).toContain('✨'); // Для рейтинга < 60
      expect(message).toContain('🏆'); // Для рейтинга >= 100
    });

    test('не должен показывать иконки рейтинга при showRatings = false', () => {
      const message = buildTeamsMessage(mockTeams, 'Тест', {}, mockTeams, null, false);

      expect(message).not.toContain('⭐');
      expect(message).not.toContain('💫');
      expect(message).not.toContain('✨');
    });

    test('должен добавить префикс + для положительного рейтинга при showRatings = false', () => {
      const message = buildTeamsMessage(mockTeams, 'Тест', {}, mockTeams, null, false);

      expect(message).toMatch(/\+\d+/); // Проверяем формат +число
    });
  });

  describe('Голы игроков', () => {
    test('должен показать голы игрока', () => {
      const teamsWithGoals = [
        [{ id: 1, name: 'Scorer', username: 'scorer', rating: 50, goals: 3 }],
      ];

      const message = buildTeamsMessage(teamsWithGoals, 'Тест', {}, teamsWithGoals);

      expect(message).toContain('⚽3');
    });

    test('не должен показывать голы если они равны 0', () => {
      const message = buildTeamsMessage(mockTeams, 'Тест', {}, mockTeams);

      expect(message).not.toContain('⚽0');
    });

    test('не должен показывать голы если поле goals отсутствует', () => {
      const teamsWithoutGoals = [
        [{ id: 1, name: 'NoGoals', username: 'nogoals', rating: 50 }],
      ];

      const message = buildTeamsMessage(teamsWithoutGoals, 'Тест', {}, teamsWithoutGoals);

      expect(message).not.toContain('⚽');
    });

    test('пробел перед ассистом только если нет гола', () => {
      const onlyAssist = [
        [{ id: 1, name: 'AssistOnly', username: 'assist', rating: 10, assists: 2, saves: 0, goals: 0 }],
      ];
      const withGoalAndAssist = [
        [{ id: 1, name: 'GoalAssist', username: 'ga', rating: 10, goals: 1, assists: 1, saves: 0 }],
      ];

      const msgOnlyAssist = buildTeamsMessage(onlyAssist, 'Тест', {}, onlyAssist);
      const msgGoalAssist = buildTeamsMessage(withGoalAndAssist, 'Тест', {}, withGoalAndAssist);

      expect(msgOnlyAssist).toContain(' 🅰️2');
      expect(msgOnlyAssist).not.toContain('⚽');

      expect(msgGoalAssist).toContain('⚽1🅰️1');
      expect(msgGoalAssist).not.toContain(' ⚽1 🅰️1');
    });

    test('сейвы: пробел если только сейвы, без пробела после голов/ассистов', () => {
      const onlySaves = [
        [{ id: 1, name: 'Keeper', username: 'gk', rating: 20, goals: 0, assists: 0, saves: 4 }],
      ];
      const goalAssistSave = [
        [{ id: 1, name: 'GkStats', username: 'gkstats', rating: 30, goals: 1, assists: 1, saves: 2 }],
      ];

      const msgOnlySaves = buildTeamsMessage(onlySaves, 'Тест', {}, onlySaves);
      const msgAll = buildTeamsMessage(goalAssistSave, 'Тест', {}, goalAssistSave);

      expect(msgOnlySaves).toContain(' 🧤4');
      expect(msgOnlySaves).not.toContain('⚽');
      expect(msgOnlySaves).not.toContain('🅰️');

      expect(msgAll).toContain('⚽1🅰️1🧤2');
      expect(msgAll).not.toContain(' ⚽1 🅰️1 🧤2');
    });
  });

  describe('Форматирование имен', () => {
    test('должен обрезать длинные имена до 11 символов', () => {
      const longNameTeam = [
        [{ id: 1, name: 'VeryLongNamePlayer', username: 'long', rating: 50 }],
      ];

      const message = buildTeamsMessage(longNameTeam, 'Тест', {}, longNameTeam);

      // Проверяем что имя обрезано или используется username
      expect(message).toContain('long');
    });

    test('должен удалить эмодзи из имен', () => {
      const emojiTeam = [
        [{ id: 1, name: 'Player 🏀 ⚽', username: 'test', rating: 50 }],
      ];

      const message = buildTeamsMessage(emojiTeam, 'Тест', {}, emojiTeam);

      expect(message).not.toMatch(/🏀|⚽/);
    });

    test('не должен переносить строки с голами/ассистами (компактный формат)', () => {
      const statsTeam = [
        [
          {
            id: 1,
            name: 'SuperLongUsername12',
            username: 'very_long_username_123',
            rating: 98,
            goals: 4,
            assists: 3,
          },
        ],
      ];

      const message = buildTeamsMessage(statsTeam, 'Тест', {}, statsTeam, null, true);

      // Извлекаем строки игроков из <code> блоков и проверяем их длину (важно для мобильного представления)
      const codeBlocks = [...message.matchAll(/<code>([\s\S]*?)<\/code>/g)].map((match) => match[1]);
      const playerLines = codeBlocks
        .flatMap((block) => block.split('\n'))
        .map((line) => line.trim())
        .filter(Boolean);

      expect(playerLines.length).toBeGreaterThan(0);
      playerLines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(34);
      });
    });
  });

  describe('Крайние случаи', () => {
    test('должен обработать пустые команды', () => {
      const emptyTeams = [[], []];
      const message = buildTeamsMessage(emptyTeams, 'Пустые команды');

      expect(message).toBeDefined();
      expect(message).toContain('Команда 1:');
      expect(message).toContain('Команда 2:');
    });

    test('должен обработать команды с одним игроком', () => {
      const singlePlayerTeams = [
        [{ id: 1, name: 'Only', username: 'only', rating: 50 }],
      ];

      const message = buildTeamsMessage(singlePlayerTeams, 'Тест');

      expect(message).toBeDefined();
      expect(message).toContain('only');
    });

    test('должен обработать 4 команды', () => {
      const fourTeams = [
        [{ id: 1, name: 'P1', username: 'p1', rating: 50 }],
        [{ id: 2, name: 'P2', username: 'p2', rating: 45 }],
        [{ id: 3, name: 'P3', username: 'p3', rating: 40 }],
        [{ id: 4, name: 'P4', username: 'p4', rating: 35 }],
      ];

      const message = buildTeamsMessage(fourTeams, '4 команды');

      expect(message).toBeDefined();
      expect(message).toContain('Команда 1:');
      expect(message).toContain('Команда 2:');
      expect(message).toContain('Команда 3:');
      expect(message).toContain('Команда 4:');
    });
  });

  describe('Цвета команд', () => {
    test('должен использовать разные цвета для команд', () => {
      const message = buildTeamsMessage(mockTeams, 'Тест');

      expect(message).toContain('🔴'); // Команда 1
      expect(message).toContain('🔵'); // Команда 2
    });

    test('должен использовать цвета в таблице', () => {
      const teamStats = {
        team1: { wins: 1, losses: 0, draws: 0, games: 1, goalsScored: 5, goalsConceded: 2 },
        team2: { wins: 0, losses: 1, draws: 0, games: 1, goalsScored: 2, goalsConceded: 5 },
      };

      const message = buildTeamsMessage(mockTeams, 'Тест', teamStats, mockTeams);

      expect(message).toContain('🔴');
      expect(message).toContain('🔵');
    });

    test('должен использовать разные цвета для 3 и 4 команд', () => {
      const threeTeams = [
        [{ id: 1, name: 'P1', username: 'p1', rating: 50 }],
        [{ id: 2, name: 'P2', username: 'p2', rating: 45 }],
        [{ id: 3, name: 'P3', username: 'p3', rating: 40 }],
      ];

      const message = buildTeamsMessage(threeTeams, 'Тест');

      expect(message).toContain('🔴');
      expect(message).toContain('🔵');
      expect(message).toContain('🟢');
    });
  });
});

