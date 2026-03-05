const { GlobalState } = require('../store');

const DEFAULT_TEAM_COLORS = ['🔴', '🔵', '🟢', '🟡'];
const ALLOWED_TEAM_COLORS = ['🟡', '🔵', '🔴', '🟢', '⚫️', '⚪️'];

const getTeamColor = (teamIndex) => {
  const customColor = GlobalState.getTeamColor(teamIndex);
  return customColor || DEFAULT_TEAM_COLORS[teamIndex] || '⚽';
};

module.exports = {
  getTeamColor,
  DEFAULT_TEAM_COLORS,
  ALLOWED_TEAM_COLORS,
};
