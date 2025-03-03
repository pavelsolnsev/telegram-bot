const result = getMatchResult(team1, team2);
const team1Goals = team1.reduce((sum, player) => sum + (player.goals || 0), 0);
const team2Goals = team2.reduce((sum, player) => sum + (player.goals || 0), 0);

updateTeamStats(teamStats, `team${teamIndex1 + 1}`, result === "team1", result === "draw", team1Goals, team2Goals);
updateTeamStats(teamStats, `team${teamIndex2 + 1}`, result === "team2", result === "draw", team2Goals, team1Goals);