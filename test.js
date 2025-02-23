const reshuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);

const divideIntoTeams = (players, numTeams) => {
  const teams = Array.from({ length: numTeams }, () => []);
  players.forEach((player, index) => {
    teams[index % numTeams].push(player);
  });
  return teams;
};