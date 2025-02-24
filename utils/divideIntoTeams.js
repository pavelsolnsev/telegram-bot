// Функция разделения игроков на команды
const divideIntoTeams = (players, numTeams) => {
  const teams = Array.from({ length: numTeams }, () => []);
  players.forEach((player, index) => {
    teams[index % numTeams].push(player);
  });
  return teams;
};

module.exports = { divideIntoTeams };