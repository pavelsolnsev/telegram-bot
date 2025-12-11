const toNumberOrZero = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const selectLeaderByMetric = (players, metric, valueKey) => {
  let bestValue = 0;
  let bestPlayer = null;

  players.forEach((player) => {
    const value = toNumberOrZero(player[metric]);
    if (value > bestValue) {
      bestValue = value;
      bestPlayer = player;
    }
  });

  if (!bestPlayer || bestValue <= 0) return null;

  return {
    player: bestPlayer,
    [valueKey]: bestValue,
  };
};

const selectLeaders = (players = []) => ({
  scorer: selectLeaderByMetric(players, 'goals', 'goals'),
  assistant: selectLeaderByMetric(players, 'assists', 'assists'),
  goalkeeper: selectLeaderByMetric(players, 'saves', 'saves'),
});

module.exports = { selectLeaders };

