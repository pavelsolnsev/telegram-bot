// Утилита для проверки неравномерного распределения игроков по командам
const checkUnevenDistribution = (teams) => {
  // Проверка на валидность teams
  if (!Array.isArray(teams) || teams.length === 0) {
    return { isUneven: false, maxTeamIndex: -1, minTeamIndex: -1, difference: 0 };
  }

  // Находим размеры команд с сохранением исходных индексов
  const teamSizes = teams
    .map((team, originalIndex) => ({
      size: Array.isArray(team) ? team.length : -1,
      originalIndex,
      isValid: Array.isArray(team),
    }))
    .filter(item => item.isValid);

  if (teamSizes.length === 0) {
    return { isUneven: false, maxTeamIndex: -1, minTeamIndex: -1, difference: 0 };
  }

  // Находим команду с максимальным и минимальным количеством игроков
  const maxTeam = teamSizes.reduce((max, current) => 
    current.size > max.size ? current : max
  );
  const minTeam = teamSizes.reduce((min, current) => 
    current.size < min.size ? current : min
  );

  const difference = maxTeam.size - minTeam.size;

  return {
    isUneven: difference > 0,
    maxTeamIndex: maxTeam.originalIndex,
    minTeamIndex: minTeam.originalIndex,
    difference,
    maxTeamSize: maxTeam.size,
    minTeamSize: minTeam.size,
  };
};

module.exports = { checkUnevenDistribution };
