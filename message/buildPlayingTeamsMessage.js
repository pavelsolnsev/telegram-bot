// Функция создания сообщения с играющими командами
const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2, status = 'playing') => {
  // Выбираем эмодзи в зависимости от статуса
  const emoji = {
    playing: '🏀',    // Матч идет (для play и next в начале)
    finished: '✅'     // Матч завершен (для fin и next перед новым матчем)
  }[status] || '🏀';

  let message = `${emoji} Команды на поле:\n\n`;
  message += `<b>Команда ${teamIndex1 + 1}:</b>\n`;
  team1.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });
  
  message += `\n<b>Команда ${teamIndex2 + 1}:</b>\n`;
  team2.forEach((player, index) => {
    message += `${index + 1}. ${player.name} (${player.username || "Без username"}) - Голы: ${player.goals || 0}\n`;
  });

  // Добавляем счет, если матч завершен
  if (status === 'finished') {
    const team1Goals = team1.reduce((sum, p) => sum + (p.goals || 0), 0);
    const team2Goals = team2.reduce((sum, p) => sum + (p.goals || 0), 0);
    message += `\n<b>Счет: ${team1Goals} - ${team2Goals}</b>`;
  }

  return message;
};

module.exports = { buildPlayingTeamsMessage };