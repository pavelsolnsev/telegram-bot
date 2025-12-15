const toNumberOrZero = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const selectLeaderByMetric = (players, metric, valueKey) => {
  // Проверка на валидность входных данных
  if (!Array.isArray(players)) {
    console.error('Ошибка: players не является массивом в selectLeaderByMetric');
    return null;
  }

  if (!metric || typeof metric !== 'string') {
    console.error('Ошибка: metric не является строкой в selectLeaderByMetric');
    return null;
  }

  let bestValue = 0;
  let bestPlayers = [];

  // Находим максимальное значение
  players.forEach((player) => {
    // Проверка на валидность объекта игрока
    if (!player || typeof player !== 'object') {
      return; // Пропускаем некорректные объекты
    }
    const value = toNumberOrZero(player[metric]);
    if (value > bestValue) {
      bestValue = value;
      bestPlayers = [player];
    } else if (value === bestValue && value > 0) {
      bestPlayers.push(player);
    }
  });

  if (bestPlayers.length === 0 || bestValue <= 0) return null;

  return {
    players: bestPlayers,
    [valueKey]: bestValue,
  };
};

const selectLeaders = (players = []) => {
  // Проверка на валидность players
  if (!Array.isArray(players)) {
    console.error('Ошибка: players не является массивом в selectLeaders');
    return {
      scorer: null,
      assistant: null,
      goalkeeper: null,
    };
  }

  return {
    scorer: selectLeaderByMetric(players, 'goals', 'goals'),
    assistant: selectLeaderByMetric(players, 'assists', 'assists'),
    goalkeeper: selectLeaderByMetric(players, 'saves', 'saves'),
  };
};

module.exports = { selectLeaders };

