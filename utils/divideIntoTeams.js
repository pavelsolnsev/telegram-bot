const divideIntoTeams = (players, numTeams) => {
  if (!players || players.length === 0 || players.length < numTeams) {
    console.log("Недостаточно игроков или пустой список:", players);
    return Array.from({ length: numTeams }, () => []);
  }

  // Сортируем игроков, преобразуя рейтинг в число
  const sortedPlayers = [...players].sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
  const teams = Array.from({ length: numTeams }, () => []);

  console.log("Отсортированные игроки:", sortedPlayers);

  // Сначала распределяем самых сильных игроков по командам
  for (let i = 0; i < Math.min(numTeams, sortedPlayers.length); i++) {
    teams[i].push(sortedPlayers[i]);
  }

  // Оставшихся игроков добавляем в команду с минимальной суммой
  for (let i = numTeams; i < sortedPlayers.length; i++) {
    const teamSums = teams.map(team => 
      team.reduce((sum, p) => sum + parseFloat(p.rating || 0), 0)
    );
    console.log("Текущие суммы команд:", teamSums);
    const minSum = Math.min(...teamSums);
    const minSumTeamIndex = teamSums.indexOf(minSum);

    if (minSumTeamIndex >= 0 && minSumTeamIndex < numTeams) {
      teams[minSumTeamIndex].push(sortedPlayers[i]);
    } else {
      console.error("Недопустимый индекс команды:", minSumTeamIndex, "teamSums:", teamSums);
      teams[0].push(sortedPlayers[i]); // Защита
    }
  }

  console.log("Итоговые команды:", teams);
  return teams;
};

module.exports = { divideIntoTeams };