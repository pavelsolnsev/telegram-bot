const divideIntoTeams = (players, numTeams) => {
  // Проверка на валидность numTeams
  const safeNumTeams = Number(numTeams);
  if (!Number.isInteger(safeNumTeams) || safeNumTeams <= 0 || safeNumTeams > 10) {
    console.error('Ошибка: numTeams должен быть положительным целым числом от 1 до 10:', numTeams);
    return [];
  }

  // Проверка на валидность players
  if (!Array.isArray(players)) {
    console.error('Ошибка: players должен быть массивом:', typeof players);
    return Array.from({ length: safeNumTeams }, () => []);
  }

  if (players.length === 0 || players.length < safeNumTeams) {
    console.log('Недостаточно игроков или пустой список:', players.length);
    return Array.from({ length: safeNumTeams }, () => []);
  }

  // Фильтруем только валидных игроков перед сортировкой
  const validPlayers = players.filter(p => p && typeof p === 'object');

  // Сортируем игроков по рейтингу (убывающий порядок)
  const sortedPlayers = [...validPlayers].sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    return ratingB - ratingA;
  });
  const teams = Array.from({ length: safeNumTeams }, () => []);

  // Распределяем игроков по "змейке"
  for (let i = 0; i < sortedPlayers.length; i++) {
    const teamIndex = i % safeNumTeams; // Базовый индекс команды
    const round = Math.floor(i / safeNumTeams); // Номер "раунда"
    // Если четный раунд — идем слева направо, если нечетный — справа налево
    const finalTeamIndex = round % 2 === 0 ? teamIndex : safeNumTeams - 1 - teamIndex;
    if (sortedPlayers[i] && teams[finalTeamIndex]) {
      teams[finalTeamIndex].push(sortedPlayers[i]);
    }
  }

  return teams;
};

module.exports = { divideIntoTeams };

