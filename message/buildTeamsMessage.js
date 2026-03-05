const { getTeamName } = require('../utils/getTeamName');
const { getTeamColor } = require('../utils/getTeamColor');

const buildTeamsMessage = (
  teamsBase,
  title = 'Составы команд',
  teamStats = {},
  updatedTeams = teamsBase,
  mvpPlayer = null,
  showRatings = true,
  leaders = null,
  playersWithYellowCards = null,
) => {
  // Проверка на валидность teamsBase
  if (!Array.isArray(teamsBase)) {
    console.error('Ошибка: teamsBase не является массивом в buildTeamsMessage');
    return '⚠️ Ошибка: некорректные данные команд';
  }

  // Проверка на валидность teamStats
  if (!teamStats || typeof teamStats !== 'object') {
    console.error('Ошибка: teamStats не является объектом в buildTeamsMessage');
    teamStats = {};
  }

  // Проверка на валидность updatedTeams
  if (!Array.isArray(updatedTeams)) {
    console.error('Ошибка: updatedTeams не является массивом в buildTeamsMessage');
    updatedTeams = teamsBase; // Используем teamsBase как fallback
  }

  // Таблица статистики на основе teamsBase
  const teamsWithStats = teamsBase
    .map((team, index) => {
      // Пропускаем некорректные команды
      if (!Array.isArray(team)) {
        return null;
      }
      const teamKey = `team${index + 1}`;
      const stats = teamStats[teamKey] || { wins: 0, losses: 0, draws: 0, games: 0, goalsScored: 0, goalsConceded: 0 };
      const points = stats.wins * 3 + stats.draws * 1;
      return { team, stats, points, originalIndex: index };
    })
    .filter(Boolean); // Убираем null значения

  teamsWithStats.sort((a, b) => b.points - a.points || (b.stats.goalsScored - b.stats.goalsConceded) - (a.stats.goalsScored - a.stats.goalsConceded));

  let message = `🏆 <b>${title}</b>\n\n<pre>`;
  message += 'М  Ком|И|В|Н|П|ЗМ|ПМ|РМ|О\n';
  message += '--+---+--+-+-+-+-+--+-+-+\n';

  teamsWithStats.forEach((teamData, position) => {
    const { stats, points, originalIndex } = teamData;
    const teamColor = getTeamColor(originalIndex);
    const place = (position + 1).toString().padStart(2, ' ');
    const teamName = `${teamColor}`.padEnd(3, ' ');
    const goalDifference = stats.goalsScored - stats.goalsConceded;

    message += `${place} ${teamName}|${stats.games}|${stats.wins}|${stats.draws}|${stats.losses}|${stats.goalsScored.toString().padStart(2, ' ')}|${stats.goalsConceded.toString().padStart(2, ' ')}|${goalDifference.toString().padStart(2, ' ')}|${points}\n`;
  });

  message += '</pre>\n';

  // Добавляем лидеров турнира и MVP, если переданы
  if (leaders || mvpPlayer) {
    // Функция для форматирования имени лидера с сокращением (максимум 16 символов)
    const formatLeaderName = (player) => {
      const name = player?.username || player?.name || `${player?.first_name || ''} ${player?.last_name || ''}`.trim();
      if (!name) return 'Unknown';

      const nameStr = String(name);
      // Удаляем эмодзи и декоративные Unicode-символы
      // eslint-disable-next-line no-misleading-character-class
      const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{FF00}-\u{FFEF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu;
      const cleanName = nameStr.replace(emojiRegex, '').trim();

      if (!cleanName) return 'Unknown';

      const chars = Array.from(cleanName);
      if (chars.length <= 16) {
        return cleanName;
      }
      return chars.slice(0, Math.max(2, 16 - 2)).join('') + '..';
    };

    const lines = [];

    if (mvpPlayer) {
      const mvpName = formatLeaderName(mvpPlayer);
      lines.push(`<b>🏅 MVP: ${mvpName}</b>`, '');
    }

    // Проверка на валидность leaders
    if (leaders && typeof leaders === 'object') {
      if (leaders.scorer && typeof leaders.scorer === 'object' &&
          Number(leaders.scorer.goals) > 0 &&
          Array.isArray(leaders.scorer.players) &&
          leaders.scorer.players.length > 0) {
        lines.push('Голы:');
        leaders.scorer.players.forEach((player) => {
          if (player && typeof player === 'object') {
            const playerName = formatLeaderName(player);
            lines.push(`<b>${playerName}: ⚽️${leaders.scorer.goals}</b>`);
          }
        });
        lines.push('');
      }

      if (leaders.assistant && typeof leaders.assistant === 'object' &&
          Number(leaders.assistant.assists) > 0 &&
          Array.isArray(leaders.assistant.players) &&
          leaders.assistant.players.length > 0) {
        lines.push('Пасы:');
        leaders.assistant.players.forEach((player) => {
          if (player && typeof player === 'object') {
            const playerName = formatLeaderName(player);
            lines.push(`<b>${playerName}: 🎯${leaders.assistant.assists}</b>`);
          }
        });
        lines.push('');
      }

      if (leaders.goalkeeper && typeof leaders.goalkeeper === 'object' &&
          Number(leaders.goalkeeper.saves) > 0 &&
          Array.isArray(leaders.goalkeeper.players) &&
          leaders.goalkeeper.players.length > 0) {
        lines.push('Сейвы:');
        leaders.goalkeeper.players.forEach((player) => {
          if (player && typeof player === 'object') {
            const playerName = formatLeaderName(player);
            lines.push(`<b>${playerName}: 🧤${leaders.goalkeeper.saves}</b>`);
          }
        });
        lines.push('');
      }
    }

    if (lines.length > 0) {
      // Удаляем завершающие пустые строки, если есть
      while (lines.length && lines[lines.length - 1] === '') {
        lines.pop();
      }
      message += `<b>Лидеры турнира по статистике:</b>\n\n${lines.join('\n')}\n\n`;
    }

    // Добавляем список игроков с желтыми карточками
    if (playersWithYellowCards && Array.isArray(playersWithYellowCards) && playersWithYellowCards.length > 0) {
      message += '<b>🟨 Игроки с желтыми карточками:</b>\n';

      // Сортируем игроков по количеству карточек (от большего к меньшему)
      const sortedPlayers = [...playersWithYellowCards].sort((a, b) => (b.yellowCards || 0) - (a.yellowCards || 0));

      sortedPlayers.forEach(player => {
        const displayName = player.username || player.name || 'Unknown';
        const cardsCount = player.yellowCards || 0;
        message += `• ${displayName} (${cardsCount})\n`;
      });

      message += '\n';
    }
  }

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
  const formatPlayerLine = (index, name, rating, goals, assists, saves) => {
    const goalsMark = goals && goals > 0 ? ` ⚽${goals}` : '';
    const assistsMark = assists && assists > 0
      ? (goalsMark ? `🎯${assists}` : ` 🎯${assists}`)
      : '';
    const savesMark = saves && saves > 0
      ? (goalsMark || assistsMark ? `🧤${saves}` : ` 🧤${saves}`)
      : '';
    const paddedIndex = (index + 1).toString().padStart(2, ' ') + '.';

    // Если есть голы/ассисты или рейтинг и иконка, сокращаем имя чуть сильнее, чтобы избежать переноса
    const hasAllStats = Boolean(goalsMark && assistsMark && savesMark);
    const hasStats = Boolean(goalsMark || assistsMark || savesMark);
    const maxNameLength = hasAllStats ? 9 : hasStats ? 10 : 11;
    const paddedName = formatPlayerName(name, maxNameLength);
    const formattedRating = parseFloat(rating).toString();

    if (!showRatings) {
      const ratingPrefix = rating > 0 ? '+' : '';
      return `<code>${paddedIndex}${paddedName}</code> <b><i>${ratingPrefix}${formattedRating}</i></b>${goalsMark}${assistsMark}${savesMark}`;
    }

    let ratingIcon;
    if (rating < 10) ratingIcon = '⭐';
    else if (rating < 30) ratingIcon = '💫';
    else if (rating < 60) ratingIcon = '✨';
    else if (rating < 100) ratingIcon = '🌠';
    else if (rating < 150) ratingIcon = '💎';
    else ratingIcon = '🏆';
    return `<code>${paddedIndex}${paddedName} ${ratingIcon}${formattedRating}${goalsMark}${assistsMark}${savesMark}</code>`;
  };

  message += '<b>Составы:</b>\n';
  if (Array.isArray(updatedTeams)) {
    updatedTeams.forEach((updatedTeam, index) => {
      if (!Array.isArray(updatedTeam)) {
        return;
      }
      // Проверка индекса команды
      const safeIndex = Number.isInteger(index) && index >= 0 && index < 4 ? index : 0;
      const teamColor = getTeamColor(safeIndex);
      const teamName = getTeamName(safeIndex) || 'Команда';
      message += `\n${teamColor} <b>${teamName}:</b>\n`;

      updatedTeam.forEach((player, i) => {
        if (player && typeof player === 'object') {
          const displayName = player.username || player.name || `Player${i + 1}`;
          const rating = Number(player.rating) || 0;
          const goals = Number(player.goals) || 0;
          const assists = Number(player.assists) || 0;
          const saves = Number(player.saves) || 0;
          message += `${formatPlayerLine(i, displayName, rating, goals, assists, saves)}\n`;
        }
      });
    });
  }

  return message;
};

module.exports = { buildTeamsMessage };
