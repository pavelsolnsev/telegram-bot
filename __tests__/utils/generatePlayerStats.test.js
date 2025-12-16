const { generatePlayerStats } = require('../../utils/generatePlayerStats');

describe('generatePlayerStats', () => {
  test('должен добавлять блок "Разбор рейтинга" с раздельными строками при наличии разбиения рейтинга', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 3,
      assists: 1,
      saves: 2,
      rating: 110.3,
      wins: 2,
      draws: 1,
      losses: 0,
      gamesPlayed: 3,
      // Разбор рейтинга
      ratingGoalsDelta: 5.1,
      ratingAssistsDelta: 2.0,
      ratingSavesDelta: 1.5,
      ratingCleanSheetsDelta: 0.5,
      ratingWinsDelta: 4.0,
      ratingDrawsDelta: 0.5,
      ratingLossesDelta: 0,
      ratingShutoutWinDelta: 1.0,
      ratingTournamentDelta: 10.3,
    };

    const teamIndex = 0;
    const teamStats = {
      team1: {
        wins: 2,
        losses: 0,
        draws: 1,
        games: 3,
        goalsScored: 5,
        goalsConceded: 2,
      },
    };
    const allTeams = [[player]];
    const mvpPlayer = null;
    const teamColors = ['🔴'];

    const message = generatePlayerStats(
      player,
      teamIndex,
      teamStats,
      allTeams,
      mvpPlayer,
      teamColors,
    );

    expect(message).toContain('<b>Разбор рейтинга:</b>');
    expect(message).toContain('⚽ Голы: +5.1');
    expect(message).toContain('🎯 Ассисты: +2');
    expect(message).toContain('🧤 Сейвы: +1.5');
    const ratingBreakdownIndex = message.indexOf('<b>Разбор рейтинга:</b>');
    const ratingBreakdownSection = ratingBreakdownIndex !== -1 ? message.substring(ratingBreakdownIndex) : '';
    expect(ratingBreakdownSection).toContain('🧱 "Сухие" матчи (сейвы + команда не пропустила): +0.5');
    expect(message).toContain('🏆 Победы: +4');
    expect(message).toContain('🤝 Ничьи: +0.5');
    expect(message).not.toContain('📉 Штрафы за поражения:');
    expect(message).toContain('🧹 Сухие победы (3+ гола): +1');
    expect(message).toContain('Общий рейтинг: +10.3');
  });

  test('не должен показывать строки с нулевыми значениями в разделе "Разбор рейтинга"', () => {
    const player = {
      id: 1,
      name: 'Player1',
    };

    const message = generatePlayerStats(
      player,
      0,
      {},
      [[]],
      null,
      ['🔴'],
    );

    const ratingBreakdownIndex = message.indexOf('<b>Разбор рейтинга:</b>');
    const ratingBreakdownSection = message.substring(ratingBreakdownIndex);

    expect(message).toContain('<b>Разбор рейтинга:</b>');
    expect(ratingBreakdownSection).not.toContain('⚽ Голы:');
    expect(ratingBreakdownSection).not.toContain('🎯 Ассисты:');
    expect(ratingBreakdownSection).not.toContain('🧤 Сейвы:');
    expect(ratingBreakdownSection).not.toContain('🧱 "Сухие" матчи:');
    expect(ratingBreakdownSection).not.toContain('🏆 Победы:');
    expect(ratingBreakdownSection).not.toContain('🤝 Ничьи:');
    expect(ratingBreakdownSection).not.toContain('📉 Штрафы за поражения:');
    expect(ratingBreakdownSection).toContain('Общий рейтинг:');
  });

  test('должен показывать MVP команды без слова "Команда" после цвета', () => {
    const player1 = {
      id: 1,
      name: 'Player1',
      goals: 5,
      assists: 2,
      saves: 0,
    };
    const player2 = {
      id: 2,
      name: 'Player2',
      goals: 3,
      assists: 1,
      saves: 0,
    };

    const teamIndex = 0;
    const teamStats = {
      team1: {
        wins: 2,
        losses: 0,
        draws: 1,
        games: 3,
        goalsScored: 8,
        goalsConceded: 2,
      },
    };
    const allTeams = [[player1, player2]];
    const mvpPlayer = null;
    const teamColors = ['🔴'];

    const message = generatePlayerStats(
      player1,
      teamIndex,
      teamStats,
      allTeams,
      mvpPlayer,
      teamColors,
    );

    // Проверяем, что строка MVP команды содержит только цвет, без слова "Команда"
    expect(message).toContain('⭐ MVP команды 🔴');
    expect(message).not.toContain('⭐ MVP команды 🔴 Команда');
  });

  test('должен скрывать все строки с нулевыми значениями в разделе "Разбор рейтинга"', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 2,
      ratingGoalsDelta: 0,
      ratingAssistsDelta: 0,
      ratingSavesDelta: 0,
      ratingCleanSheetsDelta: 0,
      ratingWinsDelta: 0,
      ratingDrawsDelta: 0,
      ratingLossesDelta: -1.2,
    };

    const message = generatePlayerStats(
      player,
      0,
      {},
      [[player]],
      null,
      ['🔴'],
    );

    const ratingBreakdownIndex = message.indexOf('<b>Разбор рейтинга:</b>');
    const ratingBreakdownSection = message.substring(ratingBreakdownIndex);

    expect(message).toContain('<b>Разбор рейтинга:</b>');
    expect(ratingBreakdownSection).not.toContain('⚽ Голы:');
    expect(ratingBreakdownSection).not.toContain('🎯 Ассисты:');
    expect(ratingBreakdownSection).not.toContain('🧤 Сейвы:');
    expect(ratingBreakdownSection).not.toContain('🧱 "Сухие" матчи:');
    expect(ratingBreakdownSection).not.toContain('🏆 Победы:');
    expect(ratingBreakdownSection).not.toContain('🤝 Ничьи:');
    expect(ratingBreakdownSection).toContain('📉 Штрафы за поражения: -1.2');
    expect(ratingBreakdownSection).toContain('Общий рейтинг:');
  });

  test('должен показывать достижения позиции команды', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 2,
    };
    const teamStats = {
      team1: { wins: 3, losses: 0, draws: 0, games: 3, goalsScored: 10, goalsConceded: 2 },
      team2: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 8, goalsConceded: 5 },
      team3: { wins: 1, losses: 2, draws: 0, games: 3, goalsScored: 5, goalsConceded: 8 },
    };
    const allTeams = [[player], [{ id: 2, goals: 1 }], [{ id: 3, goals: 0 }]];

    const message = generatePlayerStats(player, 0, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);

    expect(message).toContain('🏅 Золото');
    expect(message).toContain('<b>Достижения команды:</b>');
  });

  test('должен показывать достижения серий побед', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 2,
      maxConsecutiveWins: 4,
    };
    const teamStats = {
      team1: { wins: 3, losses: 0, draws: 0, games: 3, goalsScored: 10, goalsConceded: 2 },
    };
    const allTeams = [[player]];

    const message = generatePlayerStats(player, 0, teamStats, allTeams, null, ['🔴']);

    expect(message).toContain('🔥 Серия побед (4 подряд)');
    expect(message).toContain('<b>Достижения команды:</b>');
  });

  test('должен показывать достижения непобедимости', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 2,
      maxConsecutiveUnbeaten: 5,
    };
    const teamStats = {
      team1: { wins: 3, losses: 0, draws: 2, games: 5, goalsScored: 10, goalsConceded: 2 },
    };
    const allTeams = [[player]];

    const message = generatePlayerStats(player, 0, teamStats, allTeams, null, ['🔴']);

    expect(message).toContain('💪 Непобедимые (5 матчей без поражений)');
    expect(message).toContain('<b>Достижения команды:</b>');
  });

  test('должен показывать достижения лучших игроков', () => {
    const topScorer = { id: 1, name: 'Player1', goals: 5, assists: 1, saves: 0 };
    const topAssister = { id: 2, name: 'Player2', goals: 2, assists: 4, saves: 0 };
    const topGoalkeeper = { id: 3, name: 'Player3', goals: 0, assists: 0, saves: 6 };
    const allTeams = [[topScorer], [topAssister], [topGoalkeeper]];
    const teamStats = {
      team1: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 8, goalsConceded: 5 },
      team2: { wins: 1, losses: 2, draws: 0, games: 3, goalsScored: 6, goalsConceded: 7 },
      team3: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 5, goalsConceded: 3 },
    };

    const message1 = generatePlayerStats(topScorer, 0, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);
    const message2 = generatePlayerStats(topAssister, 1, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);
    const message3 = generatePlayerStats(topGoalkeeper, 2, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);

    expect(message1).toContain('👑 Лучший бомбардир турнира (5 голов)');
    expect(message2).toContain('🎯 Лучший ассистент турнира (4 передач)');
    expect(message3).toContain('🧤 Лучший вратарь турнира (6 сейвов)');
  });

  test('должен показывать комбинации достижений', () => {
    const universal = { id: 1, name: 'Player1', goals: 3, assists: 2, saves: 2 };
    const doubleThreat = { id: 2, name: 'Player2', goals: 4, assists: 3, saves: 0 };
    const gkScorer = { id: 3, name: 'Player3', goals: 3, assists: 0, saves: 3 };
    const allTeams = [[universal], [doubleThreat], [gkScorer]];
    const teamStats = {
      team1: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 8, goalsConceded: 5 },
      team2: { wins: 1, losses: 2, draws: 0, games: 3, goalsScored: 6, goalsConceded: 7 },
      team3: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 5, goalsConceded: 3 },
    };

    const message1 = generatePlayerStats(universal, 0, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);
    const message2 = generatePlayerStats(doubleThreat, 1, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);
    const message3 = generatePlayerStats(gkScorer, 2, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);

    expect(message1).toContain('⚽️🎯🧤 Универсал');
    expect(message1).toContain('⚽🎯 Двойная угроза');
    expect(message1).toContain('🧤⚽ Вратарь-бомбардир');
    expect(message2).toContain('⚽🎯 Двойная угроза');
    expect(message3).toContain('🧤⚽ Вратарь-бомбардир');
  });

  test('не должен показывать базовые достижения, если есть "Лучший ... турнира"', () => {
    const topScorer = { id: 1, name: 'Player1', goals: 8, assists: 0, saves: 0 };
    const topAssister = { id: 2, name: 'Player2', goals: 0, assists: 6, saves: 0 };
    const topGoalkeeper = { id: 3, name: 'Player3', goals: 0, assists: 0, saves: 5 };
    const allTeams = [[topScorer], [topAssister], [topGoalkeeper]];
    const teamStats = {
      team1: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 8, goalsConceded: 5 },
      team2: { wins: 1, losses: 2, draws: 0, games: 3, goalsScored: 6, goalsConceded: 7 },
      team3: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 5, goalsConceded: 3 },
    };

    const message1 = generatePlayerStats(topScorer, 0, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);
    const message2 = generatePlayerStats(topAssister, 1, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);
    const message3 = generatePlayerStats(topGoalkeeper, 2, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);

    expect(message1).toContain('👑 Лучший бомбардир турнира (8 голов)');
    expect(message1).not.toContain('⚽️ Бомбардир (8 голов)');
    expect(message2).toContain('🎯 Лучший ассистент турнира (6 передач)');
    expect(message2).not.toContain('🎯 Ассистент (6 передач)');
    expect(message3).toContain('🧤 Лучший вратарь турнира (5 сейвов)');
    expect(message3).not.toContain('🧤 Вратарь (5 сейвов)');
  });

  test('должен показывать достижение "Восходящая звезда" при большом приросте рейтинга', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 5,
      ratingTournamentDelta: 15.5,
    };
    const teamStats = {
      team1: { wins: 3, losses: 0, draws: 0, games: 3, goalsScored: 10, goalsConceded: 2 },
    };
    const allTeams = [[player]];

    const message = generatePlayerStats(player, 0, teamStats, allTeams, null, ['🔴']);

    expect(message).toContain('📈 Восходящая звезда прироста рейтинга (+15.5)');
  });

  test('должен показывать достижение "Надежная защита"', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 2,
    };
    const teamStats = {
      team1: { wins: 3, losses: 0, draws: 0, games: 3, goalsScored: 10, goalsConceded: 1 },
      team2: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 8, goalsConceded: 5 },
      team3: { wins: 1, losses: 2, draws: 0, games: 3, goalsScored: 5, goalsConceded: 8 },
    };
    const allTeams = [[player], [{ id: 2 }], [{ id: 3 }]];

    const message = generatePlayerStats(player, 0, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);

    expect(message).toContain('🛡️ Команда пропустила меньше всего голов');
  });

  test('должен показывать достижение "Команда забила больше всех голов"', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 2,
    };
    const teamStats = {
      team1: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 15, goalsConceded: 5 },
      team2: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 8, goalsConceded: 3 },
      team3: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 5, goalsConceded: 8 },
    };
    const allTeams = [[player], [{ id: 2 }], [{ id: 3 }]];

    const message = generatePlayerStats(player, 0, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);

    expect(message).toContain('⚽ Команда забила больше всех голов');
  });

  test('должен разделять достижения на команды и личные', () => {
    const player = {
      id: 1,
      name: 'Player1',
      goals: 5,
      assists: 2,
      saves: 1,
      maxConsecutiveWins: 3,
    };
    const teamStats = {
      team1: { wins: 3, losses: 0, draws: 0, games: 3, goalsScored: 10, goalsConceded: 1 },
      team2: { wins: 2, losses: 1, draws: 0, games: 3, goalsScored: 8, goalsConceded: 5 },
      team3: { wins: 1, losses: 2, draws: 0, games: 3, goalsScored: 5, goalsConceded: 8 },
    };
    const allTeams = [[player], [{ id: 2, goals: 2 }], [{ id: 3, goals: 1 }]];

    const message = generatePlayerStats(player, 0, teamStats, allTeams, null, ['🔴', '🔵', '🟢']);

    expect(message).toContain('<b>Достижения команды:</b>');
    expect(message).toContain('<b>Личные достижения:</b>');
    expect(message).toContain('🏅 Золото');
    expect(message).toContain('🛡️ Команда пропустила меньше всего голов');
    expect(message).toContain('⚽ Команда забила больше всех голов');
    expect(message).toContain('🔥 Серия побед (3 подряд)');
    expect(message).toContain('👑 Лучший бомбардир турнира (5 голов)');
    expect(message).toContain('⚽️🎯🧤 Универсал');
  });
});


