const divideIntoTeams = (players, numTeams) => {
  if (!players || players.length === 0 || players.length < numTeams) {
    console.log("Недостаточно игроков или пустой список:", players);
    return Array.from({ length: numTeams }, () => []);
  }

  // Сортируем игроков по рейтингу (убывающий порядок)
  const sortedPlayers = [...players].sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
  const teams = Array.from({ length: numTeams }, () => []);

  // Распределяем игроков по "змейке"
  for (let i = 0; i < sortedPlayers.length; i++) {
    const teamIndex = i % numTeams; // Базовый индекс команды
    const round = Math.floor(i / numTeams); // Номер "раунда"
    // Если четный раунд — идем слева направо, если нечетный — справа налево
    const finalTeamIndex = round % 2 === 0 ? teamIndex : numTeams - 1 - teamIndex;
    teams[finalTeamIndex].push(sortedPlayers[i]);
  }

  return teams;
};

module.exports = { divideIntoTeams };

