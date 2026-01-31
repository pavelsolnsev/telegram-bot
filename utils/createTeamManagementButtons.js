const { Markup } = require('telegraf');

// Функция для создания кнопок управления командами
const createTeamManagementButtons = (GlobalState) => {
  const isTableAllowed = GlobalState.getIsTableAllowed();
  const playingTeams = GlobalState.getPlayingTeams();
  const teams = GlobalState.getTeams();
  const buttons = [];

  if (isTableAllowed) {
    // Если составы объявлены - показываем кнопку выбора команд
    buttons.push([Markup.button.callback('🎯 Выбрать команды для матча', 'select_teams_callback')]);
  } else {
    // Если составы не объявлены - показываем кнопку выбора команд (заблокированную) и кнопку объявления
    buttons.push([Markup.button.callback('🎯 Выбрать команды для матча', 'select_teams_blocked')]);
    buttons.push([Markup.button.callback('📢 Объявить составы', 'announce_teams')]);
  }

  // Кнопка "Сменить игрока" показывается всегда, когда матч не идет (независимо от isTableAllowed)
  if (!playingTeams) {
    buttons.push([Markup.button.callback('🔄 Сменить игрока', 'change_player_callback')]);

    // Показываем кнопку перемещения когда есть минимум 2 команды для перемещения между ними
    if (Array.isArray(teams) && teams.length >= 2) {
      buttons.push([Markup.button.callback('↔️ Переместить игрока', 'move_player_callback')]);
    }

    // Кнопка распределения игроков - когда есть команды
    if (Array.isArray(teams) && teams.length > 0) {
      buttons.push([Markup.button.callback('👥 Распределить игроков', 'distribute_players_callback')]);
    }
  }

  return Markup.inlineKeyboard(buttons).reply_markup;
};

module.exports = { createTeamManagementButtons };
