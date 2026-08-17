export const getQueueScore = (player) => {
  const winnerBonus = player.lastResult === "win" ? 20 : 0;

  const waitBonus = Math.floor((Date.now() - player.waitingSince) / 60000);

  const noPriorityPenalty = player.noPriority ? -10000 : 0;

  return player.gamesPlayed * -100 + winnerBonus + waitBonus + noPriorityPenalty;
};

export const getPartnerCount = (playerA, playerB) => {
  return playerA.partnerHistory?.[playerB.id] || 0;
};

export const createBalancedTeams = (players) => {
  if (players.length !== 4) return players;

  const combinations = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];

  let bestScore = Infinity;
  let bestCombo = null;

  combinations.forEach((combo) => {
    let score =
      getPartnerCount(players[combo[0][0]], players[combo[0][1]]) +
      getPartnerCount(players[combo[1][0]], players[combo[1][1]]);

    // Prevent repeat partners
    if (players[combo[0][0]].lastPartnerId === players[combo[0][1]].id) {
      score += 1000;
    }
    if (players[combo[1][0]].lastPartnerId === players[combo[1][1]].id) {
      score += 1000;
    }

    const teamA = [players[combo[0][0]], players[combo[0][1]]];
    const teamB = [players[combo[1][0]], players[combo[1][1]]];

    teamA.forEach((playerA) => {
      teamB.forEach((playerB) => {
        if (playerA.lastOpponents?.includes(playerB.id)) {
          score += 100;
        }
      });
    });

    if (score < bestScore) {
      bestScore = score;
      bestCombo = combo;
    }
  });

  return [
    players[bestCombo[0][0]],
    players[bestCombo[0][1]],
    players[bestCombo[1][0]],
    players[bestCombo[1][1]],
  ];
};

export const buildRotationGroup = (playerList) => {
  return [...playerList]
    .sort((a, b) => getQueueScore(b) - getQueueScore(a))
    .slice(0, 4);
};

export const eligiblePlayers = (players) => {
  return players.filter((player) => (player.consecutiveGames || 0) < 2);
};

export const resetRestedPlayers = (playerList, selectedIds) => {
  return playerList.map((player) => {
    const wasSelected = selectedIds.includes(player.id);

    if (wasSelected) return player;

    if ((player.consecutiveGames || 0) >= 2) {
      return { ...player, consecutiveGames: 0 };
    }

    return player;
  });
};

export const getLoserPlayers = (playerList) => {
  return playerList.filter((player) => player.queueGroup === "loser");
};

export const buildPools = (playerList) => {
  return {
    winners: playerList.filter((p) => p.lastResult === "win"),
    losers: playerList.filter((p) => p.lastResult === "loss"),
    unmatched: playerList.filter((p) => !p.lastResult),
  };
};

