// buildPlayingTeamsMessage.js

const { getTeamName } = require('../utils/getTeamName');
const { getTeamColor } = require('../utils/getTeamColor');

const buildPlayingTeamsMessage = (team1, team2, teamIndex1, teamIndex2, status = 'playing', updatedTeams = [], matchNumber = null) => {
  // Проверка на валидность входных данных
  if (!Array.isArray(team1)) {
    console.error('Ошибка: team1 не является массивом в buildPlayingTeamsMessage');
    team1 = [];
  }
  if (!Array.isArray(team2)) {
    console.error('Ошибка: team2 не является массивом в buildPlayingTeamsMessage');
    team2 = [];
  }

  // Проверка индексов команд
  const safeTeamIndex1 = Number.isInteger(teamIndex1) && teamIndex1 >= 0 && teamIndex1 < 4 ? teamIndex1 : 0;
  const safeTeamIndex2 = Number.isInteger(teamIndex2) && teamIndex2 >= 0 && teamIndex2 < 4 ? teamIndex2 : 0;

  // Проверка на валидность updatedTeams
  if (!Array.isArray(updatedTeams)) {
    console.error('Ошибка: updatedTeams не является массивом в buildPlayingTeamsMessage');
    updatedTeams = [];
  }

  const emoji = { playing: '⚽', finished: '✅' }[status] || '⚽';
  let title = { playing: 'Команды на поле', finished: '🏁 Итог матча 🏁' }[status] || 'Команды на поле';

  // Добавляем номер матча к заголовку, если он передан
  if (matchNumber !== null && matchNumber !== undefined) {
    if (status === 'playing') {
      title = `⚽️ Команды на поле (Матч №${matchNumber})`;
    } else if (status === 'finished') {
      title = `✅ 🏁 Итог матча №${matchNumber} 🏁`;
    }
    // Для неизвестного статуса оставляем дефолтный title из строки выше
  } else {
    // Если номер не передан, используем старые заголовки
    if (status === 'playing') {
      title = 'Команды на поле';
    } else if (status === 'finished') {
      title = '🏁 Итог матча 🏁';
    }
    // Для неизвестного статуса оставляем дефолтный title из строки выше
  }

  const color1 = getTeamColor(safeTeamIndex1);
  const color2 = getTeamColor(safeTeamIndex2);

  // Выбираем, какие данные брать для отображения
  // для 'playing' — именно переданные team1/team2 (с сброшенными голами),
  // для остальных статусов — из updatedTeams (послематчевая статистика)
  const displayTeam1 = status === 'playing'
    ? team1
    : (Array.isArray(updatedTeams) && Array.isArray(updatedTeams[safeTeamIndex1]) ? updatedTeams[safeTeamIndex1] : team1);
  const displayTeam2 = status === 'playing'
    ? team2
    : (Array.isArray(updatedTeams) && Array.isArray(updatedTeams[safeTeamIndex2]) ? updatedTeams[safeTeamIndex2] : team2);

  // Функция для форматирования имени игрока
  const formatPlayerName = (name, maxLength) => {
    // Проверка на null/undefined и приведение к строке
    if (!name || (typeof name !== 'string' && typeof name !== 'number')) {
      return 'Unknown'.padEnd(maxLength, ' ');
    }

    const nameStr = String(name);
    // Удаляем эмодзи и декоративные Unicode-символы:
    // - Эмодзи (1F000-1FFFF, 2600-27BF, FE00-FEFF, 1F600-1F64F, 1F680-1F6FF, 1F900-1F9FF)
    // - Математические алфавитные символы (1D400-1D7FF) - декоративные буквы
    // - Полноширинные символы (FF00-FFEF)
    // eslint-disable-next-line no-misleading-character-class
    const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{FF00}-\u{FFEF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
    const cleanName = nameStr.replace(emojiRegex, '').trim();

    // Если после очистки имя пустое, возвращаем дефолтное значение
    if (!cleanName) {
      return 'Unknown'.padEnd(maxLength, ' ');
    }

    const chars = Array.from(cleanName);
    if (chars.length <= maxLength) {
      return cleanName.padEnd(maxLength, ' ');
    }
    return chars.slice(0, Math.max(2, maxLength - 2)).join('') + '..';
  };

  // Функция для форматирования строки игрока
  const formatPlayerLine = (index, name, goals, assists, saves) => {
    const goalsMark = goals && goals > 0 ? ` ⚽${goals}` : '';
    const assistsMark = assists && assists > 0
      ? (goalsMark ? `🎯${assists}` : ` 🎯${assists}`)
      : '';
    const savesMark = saves && saves > 0
      ? (goalsMark || assistsMark ? `🧤${saves}` : ` 🧤${saves}`)
      : '';
    const paddedIndex = (index + 1).toString().padStart(2, ' ') + '.';

    // Если есть статистика, немного уменьшаем допустимую длину имени, чтобы строка не переносилась на мобилках
    const hasAllStats = Boolean(goalsMark && assistsMark && savesMark);
    const hasStats = Boolean(goalsMark || assistsMark || savesMark);
    const maxNameLength = hasAllStats ? 10 : hasStats ? 11 : 12;
    const paddedName = formatPlayerName(name, maxNameLength);

    return `${paddedIndex}${paddedName}${goalsMark}${assistsMark}${savesMark}`;
  };

  // Добавляем эмодзи только если номер матча не передан (в старых заголовках нет эмодзи)
  const messagePrefix = (matchNumber === null || matchNumber === undefined) ? `${emoji} ` : '';
  let message = `${messagePrefix}<b>${title}</b>\n\n`;

  // Команда 1
  const team1Name = getTeamName(safeTeamIndex1) || 'Команда';
  message += `${color1} <b>${team1Name}</b>\n<code>`;
  if (Array.isArray(displayTeam1)) {
    displayTeam1.forEach((player, idx) => {
      if (player && typeof player === 'object') {
        const name = player.username || player.name || `Player${idx + 1}`;
        const goals = Number(player.goals) || 0;
        const assists = Number(player.assists) || 0;
        const saves = Number(player.saves) || 0;
        message += `${formatPlayerLine(idx, name, goals, assists, saves)}\n`;
      }
    });
  }
  message += '</code>\n\n';

  // Команда 2
  const team2Name = getTeamName(safeTeamIndex2) || 'Команда';
  message += `${color2} <b>${team2Name}</b>\n<code>`;
  if (Array.isArray(displayTeam2)) {
    displayTeam2.forEach((player, idx) => {
      if (player && typeof player === 'object') {
        const name = player.username || player.name || `Player${idx + 1}`;
        const goals = Number(player.goals) || 0;
        const assists = Number(player.assists) || 0;
        const saves = Number(player.saves) || 0;
        message += `${formatPlayerLine(idx, name, goals, assists, saves)}\n`;
      }
    });
  }
  message += '</code>';

  // Если матч завершён — добавляем счёт и результат
  if (status === 'finished') {
    const team1Goals = Array.isArray(team1)
      ? team1.reduce((s, p) => {
        if (!p || typeof p !== 'object') return s;
        return s + (Number(p.goals) || 0);
      }, 0)
      : 0;
    const team2Goals = Array.isArray(team2)
      ? team2.reduce((s, p) => {
        if (!p || typeof p !== 'object') return s;
        return s + (Number(p.goals) || 0);
      }, 0)
      : 0;
    const finalTeam1Name = getTeamName(safeTeamIndex1) || 'Команда';
    const finalTeam2Name = getTeamName(safeTeamIndex2) || 'Команда';
    const resultText = team1Goals > team2Goals
      ? `🏆 ${color1} ${finalTeam1Name}`
      : team2Goals > team1Goals
        ? `🏆 ${color2} ${finalTeam2Name}`
        : '🤝 Ничья!';
    message += `\n\n📊 <b>Счет:</b> ${color1} ${team1Goals}:${team2Goals} ${color2}\n\n${resultText}`;
  }

  return message;
};

module.exports = { buildPlayingTeamsMessage };
