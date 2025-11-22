// buildPlayingTeamsMessage.js

const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2, status = 'playing', updatedTeams = [], matchNumber = null) => {
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];
  const emoji = { playing: '⚽', finished: '✅' }[status] || '⚽';
  let title = { playing: "Команды на поле", finished: "🏁 Итог матча 🏁" }[status] || "Команды на поле";
  
  // Добавляем номер матча к заголовку, если он передан
  if (matchNumber !== null && matchNumber !== undefined) {
    title = status === 'playing' 
      ? `⚽️ Команды на поле (Матч №${matchNumber})`
      : `✅ 🏁 Итог матча №${matchNumber} 🏁`;
  } else {
    // Если номер не передан, используем старые заголовки
    title = status === 'playing' 
      ? "Команды на поле"
      : "🏁 Итог матча 🏁";
  }
  
  const color1 = teamColors[teamIndex1] || "⚽";
  const color2 = teamColors[teamIndex2] || "⚽";

  // Выбираем, какие данные брать для отображения
  // для 'playing' — именно переданные team1/team2 (с сброшенными голами),
  // для остальных статусов — из updatedTeams (послематчевая статистика)
  const displayTeam1 = status === 'playing'
    ? team1
    : (updatedTeams[teamIndex1] || team1);
  const displayTeam2 = status === 'playing'
    ? team2
    : (updatedTeams[teamIndex2] || team2);

  // Функция для форматирования имени игрока
  const formatPlayerName = (name, maxLength = 11) => {
    const cleanName = name.replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu,
      ""
    ).trim();
    const chars = Array.from(cleanName);
    return chars.length <= maxLength
      ? cleanName.padEnd(maxLength, " ")
      : chars.slice(0, maxLength - 3).join("") + "...";
  };

  // Функция для форматирования строки игрока
  const formatPlayerLine = (index, name, goals) => {
    const goalsMark = goals && goals > 0 ? ` ⚽${goals}` : "";
    const paddedIndex = (index + 1).toString().padStart(2, " ") + ".";
    const paddedName = formatPlayerName(name).padEnd(11, " ");
    return `${paddedIndex}${paddedName}${goalsMark}`;
  };

  // Добавляем эмодзи только если номер матча не передан (в старых заголовках нет эмодзи)
  const messagePrefix = (matchNumber === null || matchNumber === undefined) ? `${emoji} ` : '';
  let message = `${messagePrefix}<b>${title}</b>\n\n`;

  // Команда 1
  message += `${color1} <b>Команда ${teamIndex1 + 1}</b>\n<code>`;
  displayTeam1.forEach((player, idx) => {
    const name = player.username || player.name;
    message += `${formatPlayerLine(idx, name, player.goals)}\n`;
  });
  message += `</code>\n\n`;

  // Команда 2
  message += `${color2} <b>Команда ${teamIndex2 + 1}</b>\n<code>`;
  displayTeam2.forEach((player, idx) => {
    const name = player.username || player.name;
    message += `${formatPlayerLine(idx, name, player.goals)}\n`;
  });
  message += `</code>`;

  // Если матч завершён — добавляем счёт и результат
  if (status === 'finished') {
    const team1Goals = team1.reduce((s, p) => s + (p.goals || 0), 0);
    const team2Goals = team2.reduce((s, p) => s + (p.goals || 0), 0);
    const resultText = team1Goals > team2Goals
      ? `🏆 ${color1} побеждает!`
      : team2Goals > team1Goals
        ? `🏆 ${color2} побеждает!`
        : "🤝 Ничья!";
    message += `\n\n📊 <b>Счет:</b> ${color1} ${team1Goals}:${team2Goals} ${color2}\n\n${resultText}`;
  }

  return message;
};

module.exports = { buildPlayingTeamsMessage };