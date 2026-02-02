const { selectMvp } = require('./selectMvp');
const { getTeamName } = require('./getTeamName');

// Генерация персональной статистики игрока
const generatePlayerStats = (player, teamIndex, teamStats, allTeams, mvpPlayer, teamColors, collectionDate, teamsBase) => {
  const teamKey = `team${teamIndex + 1}`;
  const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0, goalsScored: 0, goalsConceded: 0 };
  const color = teamColors[teamIndex] || '⚽';
  const points = stats.wins * 3 + stats.draws * 1;

  // Определяем позицию команды
  const allTeamsWithStats = allTeams.map((team, idx) => {
    const key = `team${idx + 1}`;
    const teamStatsData = teamStats[key] || { wins: 0, losses: 0, draws: 0, games: 0, goalsScored: 0, goalsConceded: 0 };
    const teamPoints = teamStatsData.wins * 3 + teamStatsData.draws * 1;
    const goalDiff = teamStatsData.goalsScored - teamStatsData.goalsConceded;
    return { index: idx + 1, points: teamPoints, goalDifference: goalDiff };
  });

  const sortedTeams = [...allTeamsWithStats].sort((a, b) =>
    b.points - a.points || b.goalDifference - a.goalDifference,
  );
  const teamPosition = sortedTeams.findIndex(t => t.index === teamIndex + 1) + 1;

  // Проверяем, был ли игрок MVP команды
  const team = allTeams[teamIndex] || [];
  const teamMvp = selectMvp(team);
  const isTeamMvp = teamMvp && teamMvp.id === player.id;

  // Проверяем, был ли игрок главным MVP турнира
  const isTournamentMvp = mvpPlayer && mvpPlayer.id === player.id;

  // Статистика игрока
  const goals = player.goals || 0;
  const assists = player.assists || 0;
  const saves = player.saves || 0;
  const wins = player.wins || 0;
  const draws = player.draws || 0;
  const losses = player.losses || 0;
  const gamesPlayed = player.gamesPlayed || 0;

  // Разбор изменения рейтинга по компонентам (используем значения из игрока, если они заданы)
  const goalsDelta = typeof player.ratingGoalsDelta === 'number' ? player.ratingGoalsDelta : 0;
  const assistsDelta = typeof player.ratingAssistsDelta === 'number' ? player.ratingAssistsDelta : 0;
  const savesDelta = typeof player.ratingSavesDelta === 'number' ? player.ratingSavesDelta : 0;
  const cleanSheetsDelta = typeof player.ratingCleanSheetsDelta === 'number' ? player.ratingCleanSheetsDelta : 0;
  const winsDelta = typeof player.ratingWinsDelta === 'number' ? player.ratingWinsDelta : 0;
  const drawsDelta = typeof player.ratingDrawsDelta === 'number' ? player.ratingDrawsDelta : 0;
  const lossesDelta = typeof player.ratingLossesDelta === 'number' ? player.ratingLossesDelta : 0;
  const lossesBaseDelta = typeof player.ratingLossesBaseDelta === 'number' ? player.ratingLossesBaseDelta : 0;
  const lossesHeroReductionDelta = typeof player.ratingLossesHeroReduction === 'number' ? player.ratingLossesHeroReduction : 0;
  const lossesFighterReductionDelta = typeof player.ratingLossesFighterReduction === 'number' ? player.ratingLossesFighterReduction : 0;
  const lossesReductionRawDelta = typeof player.ratingLossesReduction === 'number' ? player.ratingLossesReduction : 0;
  // Для старых данных, где не было раздельных полей, используем общее значение ratingLossesReduction
  const lossesReductionDelta = (lossesHeroReductionDelta || lossesFighterReductionDelta)
    ? lossesHeroReductionDelta + lossesFighterReductionDelta
    : lossesReductionRawDelta;
  const shutoutWinDelta = typeof player.ratingShutoutWinDelta === 'number' ? player.ratingShutoutWinDelta : 0;
  const yellowCardsDelta = typeof player.ratingYellowCardsDelta === 'number' ? player.ratingYellowCardsDelta : 0;

  // Компоненты штрафа за поражения для пересчёта прироста рейтинга
  const lossesBaseComponent = lossesBaseDelta || lossesDelta;
  let lossesReductionComponent = 0;
  if (lossesHeroReductionDelta || lossesFighterReductionDelta) {
    // Новая схема: отдельно герой проигравших и «боролся до конца»
    lossesReductionComponent = lossesHeroReductionDelta + lossesFighterReductionDelta;
  } else if (lossesReductionRawDelta) {
    // Старые данные: только общее смягчение
    lossesReductionComponent = lossesReductionRawDelta;
  }

  const totalRatingDelta = typeof player.ratingTournamentDelta === 'number'
    ? player.ratingTournamentDelta
    : goalsDelta
      + assistsDelta
      + savesDelta
      + cleanSheetsDelta
      + winsDelta
      + drawsDelta
      + lossesBaseComponent
      + lossesReductionComponent
      + shutoutWinDelta
      + yellowCardsDelta;

  const round1 = (n) => Math.round(n * 10) / 10;
  const formatDelta = (value) => {
    const num = Number(value) || 0;
    const rounded = round1(num);
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}`;
  };

  let mvpBonus = 0;
  if (isTournamentMvp) {
    mvpBonus = 1.0;
  } else if (isTeamMvp) {
    mvpBonus = 0.5;
  }

  // Рейтинг в таблице (без MVP — таблица строится из allTeams)
  const tableRating = round1((Number(player.rating) || 0) - (mvpBonus || 0));

  // Фактический рейтинг на старте турнира (prevRating перед первым матчем)
  let actualBaseRating = null;
  if (typeof player.ratingAtTournamentStart === 'number') {
    actualBaseRating = player.ratingAtTournamentStart;
  }
  if (actualBaseRating === null && teamsBase && Array.isArray(teamsBase[teamIndex])) {
    const basePlayer = teamsBase[teamIndex].find(p => p && p.id === player.id);
    if (basePlayer) {
      actualBaseRating = Number(basePlayer.rating) || 0;
    }
  }
  if (actualBaseRating === null) {
    actualBaseRating = Math.max(0, tableRating - totalRatingDelta);
  }

  // Дельта для личной статистики: рейтинг С учётом MVP − база
  const displayRatingDelta = round1((Number(player.rating) || 0) - actualBaseRating);

  // Mod: база для расчёта = рейтинг на старте (как в updatePlayerStats — по индексу в команде)
  let modBaseRating = actualBaseRating;
  const playerTeam = allTeams[teamIndex] || [];
  const playerIdx = playerTeam.findIndex(p => p && p.id === player.id);
  if (teamsBase?.[teamIndex]?.[playerIdx] != null) {
    const basePlayerForMod = teamsBase[teamIndex][playerIdx];
    const r = Number(basePlayerForMod.rating);
    if (!Number.isNaN(r)) {
      modBaseRating = r;
    }
  }
  if (modBaseRating <= 0 && totalRatingDelta !== 0) {
    const computedBase = tableRating - totalRatingDelta;
    if (computedBase > 0) {
      modBaseRating = computedBase;
    }
  }
  const growthModifier = (rating) => Math.max(0.2, 1 - rating / 250);
  const mod = growthModifier(modBaseRating);

  // Компоненты с округлением до 0.1, сумма = displayRatingDelta
  const rawComponents = [
    { key: 'goals', value: goalsDelta },
    { key: 'assists', value: assistsDelta },
    { key: 'saves', value: savesDelta },
    { key: 'cleanSheets', value: cleanSheetsDelta },
    { key: 'wins', value: winsDelta },
    { key: 'draws', value: drawsDelta },
    { key: 'losses', value: lossesDelta },
    { key: 'shutoutWin', value: shutoutWinDelta },
    { key: 'yellowCards', value: yellowCardsDelta },
    { key: 'mvpBonus', value: mvpBonus },
  ];
  const roundedComponents = rawComponents.map(({ key, value }) => ({ key, value: round1(value) }));
  let componentsSum = roundedComponents.reduce((s, c) => s + c.value, 0);
  const correction = round1(displayRatingDelta - componentsSum);
  if (correction !== 0) {
    const idx = roundedComponents.findIndex(c => c.value !== 0);
    if (idx >= 0) {
      roundedComponents[idx].value = round1(roundedComponents[idx].value + correction);
    }
  }

  // Форматируем дату турнира
  let dateStr = '';
  if (collectionDate) {
    const day = String(collectionDate.getDate()).padStart(2, '0');
    const month = String(collectionDate.getMonth() + 1).padStart(2, '0');
    const year = collectionDate.getFullYear();
    dateStr = ` ${day}.${month}.${year}`;
  }
  let message = `<b>📊 Ваша статистика турнира${dateStr}</b>\n\n`;

  // Команда и позиция
  const teamName = getTeamName(teamIndex);
  const positionEmoji = teamPosition === 1 ? '🥇' : teamPosition === 2 ? '🥈' : teamPosition === 3 ? '🥉' : '📍';
  message += `${color} <b>${teamName}</b> ${positionEmoji} <b>${teamPosition} место</b>\n`;
  message += `Очки команды: <b>${points}</b>\n\n`;

  // Статистика игрока
  message += '<b>Ваши показатели:</b>\n';
  if (goals > 0) {
    message += `⚽️ Голы: ${goals}\n`;
  }
  if (assists > 0) {
    message += `🎯 Ассисты: ${assists}\n`;
  }
  if (saves > 0) {
    message += `🧤 Сейвы: ${saves}\n`;
  }
  if ((player.yellowCards || 0) > 0) {
    message += `🟨 Жёлтые карточки: ${player.yellowCards || 0}\n`;
  }
  if (isTournamentMvp) {
    message += `⭐ Рейтинг с MVP турнира: ${formatDelta(displayRatingDelta)}\n`;
  } else if (isTeamMvp) {
    message += `⭐ Рейтинг с MVP команды: ${formatDelta(displayRatingDelta)}\n`;
  } else {
    message += `⭐ Рейтинг: ${formatDelta(displayRatingDelta)}\n`;
  }
  message += `⚡ Mod: ${mod.toFixed(2)}\n\n`;

  // Статистика матчей
  message += '<b>Результаты:</b>\n';
  message += `Победы: ${wins}\n`;
  message += `Ничьи: ${draws}\n`;
  message += `Поражения: ${losses}\n`;
  message += `Игр сыграно: ${gamesPlayed}\n\n`;

  const getComponent = (key) => roundedComponents.find(c => c.key === key)?.value ?? 0;

  // Разбор рейтинга по компонентам (сумма компонентов = displayRatingDelta)
  message += '<b>Разбор рейтинга:</b>\n';
  if (getComponent('goals') !== 0) {
    message += `⚽ Голы: ${formatDelta(getComponent('goals'))}\n`;
  }
  if (getComponent('assists') !== 0) {
    message += `🎯 Ассисты: ${formatDelta(getComponent('assists'))}\n`;
  }
  if (getComponent('saves') !== 0) {
    message += `🧤 Сейвы: ${formatDelta(getComponent('saves'))}\n`;
  }
  if (getComponent('wins') !== 0) {
    message += `🏆 Победы: ${formatDelta(getComponent('wins'))}\n`;
  }
  if (getComponent('draws') !== 0) {
    message += `🤝 Ничьи: ${formatDelta(getComponent('draws'))}\n`;
  }
  if (getComponent('losses') !== 0) {
    // Смягчение штрафа за поражение (см. matchHelpers.js):
    // — Герой проигравших: 2+ гола в матче → +0.5 к штрафу
    // — Боролся до конца: голов < 2, но (голы + ассисты + сейвы) в матче ≥ 2 → +0.4 к штрафу
    // — Иначе для старых данных без разбивки показываем общее «смягчено»
    let reductionNote = '';
    if (lossesHeroReductionDelta) {
      reductionNote = ' (	Поражение + в этом матче 2+ гола у игрока)';
    } else if (lossesFighterReductionDelta) {
      reductionNote = ' (Поражение + голов < 2, но голы + ассисты + сейвы в матче ≥ 2)';
    } else if (lossesReductionDelta) {
      reductionNote = ' (смягчено, данные без разбивки)';
    }
    message += `📉 Штрафы за поражения: ${formatDelta(getComponent('losses'))}${reductionNote}\n`;
  }
  if (getComponent('shutoutWin') !== 0) {
    message += `🧹 Сухие победы (3+ гола): ${formatDelta(getComponent('shutoutWin'))}\n`;
  }
  if (getComponent('cleanSheets') !== 0) {
    message += `🧱 "Сухие" матчи (сейвы + команда не пропустила): ${formatDelta(getComponent('cleanSheets'))}\n`;
  }
  if (getComponent('yellowCards') !== 0) {
    message += `🟨 Штраф за желтые карточки: ${formatDelta(getComponent('yellowCards'))}\n`;
  }
  if (getComponent('mvpBonus') !== 0) {
    if (isTournamentMvp) {
      message += `🏆 Бонус за MVP турнира: ${formatDelta(getComponent('mvpBonus'))}\n`;
    } else if (isTeamMvp) {
      message += `⭐ Бонус за MVP команды: ${formatDelta(getComponent('mvpBonus'))}\n`;
    }
  }
  message += `Общий рейтинг: ${formatDelta(displayRatingDelta)}\n\n`;

  // Находим лучших игроков по голам, ассистам и сейвам среди всех игроков
  const allPlayers = allTeams.flat();
  const maxGoals = Math.max(...allPlayers.map(p => p.goals || 0), 0);
  const maxAssists = Math.max(...allPlayers.map(p => p.assists || 0), 0);
  const maxSaves = Math.max(...allPlayers.map(p => p.saves || 0), 0);
  const isTopScorer = goals === maxGoals && goals > 0;
  const isTopAssister = assists === maxAssists && assists > 0;
  const isTopGoalkeeper = saves === maxSaves && saves > 0;

  // Находим команду с наименьшим количеством пропущенных голов
  const allTeamGoalsConceded = Object.values(teamStats).map(teamStat => teamStat.goalsConceded || 0);
  const minGoalsConceded = Math.min(...allTeamGoalsConceded, Infinity);
  const isBestDefense = stats.goalsConceded === minGoalsConceded && minGoalsConceded !== Infinity;

  // Находим команду с наибольшим количеством забитых голов
  const allTeamGoalsScored = Object.values(teamStats).map(teamStat => teamStat.goalsScored || 0);
  const maxGoalsScored = Math.max(...allTeamGoalsScored, 0);
  const isBestAttack = stats.goalsScored === maxGoalsScored && maxGoalsScored > 0;

  // Серии побед и непобедимости
  const maxConsecutiveWins = player.maxConsecutiveWins || 0;
  const maxConsecutiveUnbeaten = player.maxConsecutiveUnbeaten || 0;

  // Достижения команды
  const teamAchievements = [];
  // Позиция команды
  if (teamPosition === 1) {
    teamAchievements.push('🏅 Золото');
  } else if (teamPosition === 2) {
    teamAchievements.push('🥈 Серебро');
  } else if (teamPosition === 3) {
    teamAchievements.push('🎖️ Бронза');
  }
  // Надежная защита
  if (isBestDefense) {
    teamAchievements.push('🛡️ Команда пропустила меньше всего голов');
  }
  // Лучшая атака
  if (isBestAttack) {
    teamAchievements.push('⚽ Команда забила больше всех голов');
  }
  // Серии побед
  if (maxConsecutiveWins >= 3) {
    teamAchievements.push(`🔥 Серия побед (${maxConsecutiveWins} подряд)`);
  }
  // Непобедимость
  if (maxConsecutiveUnbeaten >= 3) {
    teamAchievements.push(`💪 Непобедимые (${maxConsecutiveUnbeaten} матчей без поражений)`);
  }
  // Все матчи выиграны
  if (wins === gamesPlayed && gamesPlayed > 0) {
    teamAchievements.push('💯 Все матчи выиграны');
  }

  // Личные достижения
  const personalAchievements = [];
  if (isTournamentMvp) {
    personalAchievements.push('🏆 MVP турнира');
  } else if (isTeamMvp) {
    personalAchievements.push(`⭐ MVP команды ${color}`);
  }

  // Восходящая звезда (прирост рейтинга = сумма разбора + MVP)
  if (displayRatingDelta >= 10) {
    personalAchievements.push(`📈 Восходящая звезда прироста рейтинга (${formatDelta(displayRatingDelta)})`);
  }

  // Лучшие игроки турнира
  if (isTopScorer) {
    personalAchievements.push(`👑 Лучший бомбардир турнира (${goals} голов)`);
  }
  if (isTopAssister) {
    personalAchievements.push(`🎯 Лучший ассистент турнира (${assists} передач)`);
  }
  if (isTopGoalkeeper) {
    personalAchievements.push(`🧤 Лучший вратарь турнира (${saves} сейвов)`);
  }

  // Комбинации
  const isUniversal = goals > 0 && assists > 0 && saves > 0;
  if (isUniversal) {
    personalAchievements.push('⚽️🎯🧤 Универсал - все показатели выше 0');
  }
  if (goals >= 2 && assists >= 2) {
    personalAchievements.push('⚽🎯 Двойная угроза - 2+ гола и 2+ передач');
  }
  if (saves >= 2 && goals >= 2) {
    personalAchievements.push('🧤⚽ Вратарь-бомбардир - 2+ сейва и 2+ гола');
  }

  // Базовые достижения (не показываем, если есть соответствующие "Лучший ... турнира")
  if (goals > 2 && !isTopScorer) {
    personalAchievements.push(`⚽️ Бомбардир - более 2 голов (${goals} голов)`);
  }
  if (assists > 2 && !isTopAssister) {
    personalAchievements.push(`🎯 Ассистент - более 2 передач (${assists} передач)`);
  }
  if (saves > 2 && !isTopGoalkeeper) {
    personalAchievements.push(`🧤 Вратарь - более 2 сейвов (${saves} сейвов)`);
  }

  // Выводим достижения команды
  if (teamAchievements.length > 0) {
    message += '<b>Достижения команды:</b>\n';
    teamAchievements.forEach(achievement => {
      message += `${achievement}\n`;
    });
    message += '\n';
  }

  // Выводим личные достижения
  if (personalAchievements.length > 0) {
    message += '<b>Личные достижения:</b>\n';
    personalAchievements.forEach(achievement => {
      message += `${achievement}\n`;
    });
  }

  return message;
};

module.exports = { generatePlayerStats };

