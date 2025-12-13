const toNumberOrZero = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const selectLeaderByMetric = (players, metric, valueKey) => {
  let bestValue = 0;
  let bestPlayers = [];

  // Находим максимальное значение
  players.forEach((player) => {
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

const selectLeaders = (players = []) => ({
  scorer: selectLeaderByMetric(players, 'goals', 'goals'),
  assistant: selectLeaderByMetric(players, 'assists', 'assists'),
  goalkeeper: selectLeaderByMetric(players, 'saves', 'saves'),
});

module.exports = { selectLeaders };

