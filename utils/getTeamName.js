const { GlobalState } = require('../store');

// Получить название команды или дефолтное значение
const getTeamName = (teamIndex) => {
  const customName = GlobalState.getTeamName(teamIndex);
  return customName || `Команда ${teamIndex + 1}`;
};

module.exports = { getTeamName };
