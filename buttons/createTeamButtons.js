const { Markup } = require('telegraf');
const { getTeamColor } = require('../utils/getTeamColor');

const createTeamButtons = (team, teamIndex) => {
  const teamColor = getTeamColor(teamIndex);

  const buttons = team.map((player, index) => {
    const displayName = player.username
      ? player.username
      : player.name;
    return Markup.button.callback(
      `${teamColor} ${index + 1}. ${displayName}`,
      `goal_${teamIndex}_${index}`,
    );
  });

  // Группируем кнопки по 2 в ряд
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
};

const createAssistButtons = (team, teamIndex) => {
  const teamColor = getTeamColor(teamIndex);

  const buttons = team.map((player, index) => {
    const displayName = player.username
      ? player.username
      : player.name;
    return Markup.button.callback(
      `${teamColor} ${index + 1}. ${displayName}`,
      `assist_${teamIndex}_${index}`,
    );
  });

  // Группируем кнопки по 2 в ряд
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
};

const createSaveButtons = (team, teamIndex) => {
  const teamColor = getTeamColor(teamIndex);

  const buttons = team.map((player, index) => {
    const displayName = player.username
      ? player.username
      : player.name;
    return Markup.button.callback(
      `${teamColor} ${index + 1}. ${displayName}`,
      `save_${teamIndex}_${index}`,
    );
  });

  // Группируем кнопки по 2 в ряд
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
};

const createYellowCardButtons = (team, teamIndex) => {
  const teamColor = getTeamColor(teamIndex);

  const buttons = team.map((player, index) => {
    const displayName = player.username
      ? player.username
      : player.name;
    return Markup.button.callback(
      `${teamColor} ${index + 1}. ${displayName}`,
      `yellow_card_${teamIndex}_${index}`,
    );
  });

  // Группируем кнопки по 2 в ряд
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
};

module.exports = { createTeamButtons, createAssistButtons, createSaveButtons, createYellowCardButtons };
