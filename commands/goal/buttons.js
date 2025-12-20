const { Markup } = require('telegraf');

// Функция для создания кнопок игроков с голами для отмены
const createCancelGoalButtons = (team, teamIndex, teamColor) => {
  const buttons = [];
  team.forEach((player, index) => {
    if (player.goals && player.goals > 0) {
      const displayName = player.username || player.name;
      buttons.push(
        Markup.button.callback(
          `${teamColor} ${index + 1}. ${displayName} ⚽${player.goals}`,
          `cancel_goal_${teamIndex}_${index}`,
        ),
      );
    }
  });
  // Группируем кнопки по 2 в ряд
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
};

// Функция для создания кнопок игроков с ассистами для отмены
const createCancelAssistButtons = (team, teamIndex, teamColor) => {
  const buttons = [];
  team.forEach((player, index) => {
    if (player.assists && player.assists > 0) {
      const displayName = player.username || player.name;
      buttons.push(
        Markup.button.callback(
          `${teamColor} ${index + 1}. ${displayName} 🎯${player.assists}`,
          `cancel_assist_${teamIndex}_${index}`,
        ),
      );
    }
  });
  // Группируем кнопки по 2 в ряд
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
};

// Функция для создания кнопок игроков с сейвами для отмены
const createCancelSaveButtons = (team, teamIndex, teamColor) => {
  const buttons = [];
  team.forEach((player, index) => {
    if (player.saves && player.saves > 0) {
      const displayName = player.username || player.name;
      buttons.push(
        Markup.button.callback(
          `${teamColor} ${index + 1}. ${displayName} 🧤${player.saves}`,
          `cancel_save_${teamIndex}_${index}`,
        ),
      );
    }
  });
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  return rows;
};

module.exports = {
  createCancelGoalButtons,
  createCancelAssistButtons,
  createCancelSaveButtons,
};
