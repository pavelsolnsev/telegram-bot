const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2, status = 'playing') => {
  const teamColors = ["🔴", "🔵", "🟢", "🟡"];

  const emoji = {
    playing: '⚽',
    finished: '✅'
  }[status] || '⚽';

  const title = {
    playing: "Команды на поле",
    finished: "🏁 Итог матча 🏁"
  }[status] || "Команды на поле";

  const color1 = teamColors[teamIndex1] || "⚽";
  const color2 = teamColors[teamIndex2] || "⚽";

  let message = `${emoji} <b>${title}</b>\n\n`;

  // Функция для форматирования имени игрока
  const formatPlayerName = (name, maxLength = 11) => {
    // Удаляем все эмодзи, используя более широкий диапазон Unicode
    const cleanName = name.replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu,
      ""
    ).trim();
    // Подсчитываем длину строки с учетом Unicode-символов
    const chars = Array.from(cleanName);
    if (chars.length <= maxLength) {
      return cleanName.padEnd(maxLength, " ");
    }
    // Обрезаем до maxLength - 3 и добавляем "...", сохраняя Unicode-символы
    return chars.slice(0, maxLength - 3).join("") + "...";
  };

  // Функция для форматирования строки игрока
  const formatPlayerLine = (index, name, rating, goals) => {
    const goalsMark = goals && goals > 0 ? ` ⚽${goals}` : "";
    const paddedIndex = (index + 1).toString().padStart(2, " ") + ".";
    const paddedName = formatPlayerName(name).padEnd(11, " ");
    const formattedRating = parseFloat(rating).toString();

    let ratingIcon;
    if (rating < 10) ratingIcon = "⭐";
    else if (rating < 30) ratingIcon = "💫";
    else if (rating < 60) ratingIcon = "✨";
    else if (rating < 100) ratingIcon = "🌠";
    else if (rating < 150) ratingIcon = "💎";
    else ratingIcon = "🏆";
    return `${paddedIndex}${paddedName} ${ratingIcon}${formattedRating}${goalsMark}`;
  };

  // Команда 1
  message += `${color1} <b>Команда ${teamIndex1 + 1}</b> 👥\n<code>`;

  team1.forEach((player, index) => {
    const displayName = player.username ? player.username : player.name;
    const rating = player.rating || 0;
    message += `${formatPlayerLine(index, displayName, rating, player.goals)}\n`;
  });
  message += "</code>";

  // Короткий разделитель
  message += `\n`;

  // Команда 2
  message += `${color2} <b>Команда ${teamIndex2 + 1}</b> 👥\n<code>`;
  team2.forEach((player, index) => {
    const displayName = player.username ? player.username : player.name;
    const rating = player.rating || 0;
    message += `${formatPlayerLine(index, displayName, rating, player.goals)}\n`;
  });
  message += "</code>";

  // Итог матча, если статус finished
  if (status === 'finished') {
    const team1Goals = team1.reduce((sum, p) => sum + (p.goals || 0), 0);
    const team2Goals = team2.reduce((sum, p) => sum + (p.goals || 0), 0);

    message += `\n\n📊 <b>Счет:</b> ${color1} ${team1Goals}:${team2Goals} ${color2}\n\n`;
    message += team1Goals > team2Goals ? `🏆 ${color1} побеждает!` :
               team2Goals > team1Goals ? `🏆 ${color2} побеждает!` :
               "🤝 Ничья!";
  }

  return message;
};

module.exports = { buildPlayingTeamsMessage };