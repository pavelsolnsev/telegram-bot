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
      ratingMatchResultsDelta: 3.4,
      ratingPenaltiesDelta: 0,
      ratingTournamentDelta: 9.3,
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
    expect(message).toContain('🧱 "Сухие" матчи: +0.5');
    expect(message).toContain('🏆 Результаты матчей: +3.4');
    expect(message).toContain('📉 Штрафы за поражения: 0');
    expect(message).toContain('Итого изменение рейтинга по турниру: +9.3');
  });

  test('не должен добавлять блок "Разбор рейтинга", если данные разбиения отсутствуют', () => {
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

    expect(message).toContain('<b>Разбор рейтинга:</b>');
    expect(message).toContain('⚽ Голы: 0');
    expect(message).toContain('🎯 Ассисты: 0');
    expect(message).toContain('🧤 Сейвы: 0');
    expect(message).toContain('🧱 "Сухие" матчи: 0');
    expect(message).toContain('🏆 Результаты матчей: 0');
    expect(message).toContain('📉 Штрафы за поражения: 0');
  });
});


