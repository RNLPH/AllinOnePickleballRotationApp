/**
 * Auto-Pairing Algorithms for Swiss System and Round Robin modes
 */

/**
 * Swiss System pairing: pairs players with similar win records.
 * Groups players by wins, then pairs within each group.
 * If a group has an odd count, the leftover drops to the next group.
 *
 * @param {Array} players - waiting players with wins/losses/gamesPlayed
 * @param {number} needed - number of players needed for a match (2 for singles, 4 for doubles)
 * @returns {Array} - ordered list of players for the next match
 */
export function swissPairing(players, needed = 4) {
  if (players.length < needed) return players.slice(0, needed);

  // Sort by win percentage descending, then by total games as tiebreaker
  const sorted = [...players].sort((a, b) => {
    const aRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0.5;
    const bRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0.5;
    if (Math.abs(aRate - bRate) > 0.001) return bRate - aRate;
    return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
  });

  // Group by similar win rate (within 0.15 band)
  const groups = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevRate = sorted[i - 1].gamesPlayed > 0
      ? sorted[i - 1].wins / sorted[i - 1].gamesPlayed : 0.5;
    const curRate = sorted[i].gamesPlayed > 0
      ? sorted[i].wins / sorted[i].gamesPlayed : 0.5;

    if (Math.abs(prevRate - curRate) <= 0.15) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }
  groups.push(currentGroup);

  // Flatten groups and take needed
  const flattened = groups.flat();

  // For doubles (4), pick top 2 vs bottom 2 from same group for balanced match
  if (needed === 4 && flattened.length >= 4) {
    // Take the top 4 from the same performance band
    const top4 = flattened.slice(0, 4);
    // Pair: 1st + 4th vs 2nd + 3rd (balanced teams)
    return [top4[0], top4[3], top4[1], top4[2]];
  }

  return flattened.slice(0, needed);
}

/**
 * Round Robin schedule generator.
 * Generates a full round-robin schedule for all players.
 * Returns the next unplayed matchup.
 *
 * @param {Array} players - all players in the queue
 * @param {Array} matchHistory - existing matches to check what's been played
 * @param {boolean} isSingles - whether playing singles (2) or doubles (4)
 * @returns {Array} - next set of players for the match
 */
export function roundRobinNextMatch(players, matchHistory = [], isSingles = false) {
  const needed = isSingles ? 2 : 4;
  if (players.length < needed) return players.slice(0, needed);

  if (isSingles) {
    // Generate all pairs
    const pairs = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        pairs.push([players[i], players[j]]);
      }
    }

    // Find the first unplayed pair
    const playedSet = new Set();
    matchHistory.forEach((m) => {
      if (m.teamA && m.teamB) {
        const key = [...m.teamA, ...m.teamB].sort().join("|");
        playedSet.add(key);
      }
    });

    for (const pair of pairs) {
      const key = pair.map((p) => p.name).sort().join("|");
      if (!playedSet.has(key)) {
        return pair;
      }
    }

    // All played — start over with least-played players
    const sorted = [...players].sort((a, b) => (a.gamesPlayed || 0) - (b.gamesPlayed || 0));
    return sorted.slice(0, 2);
  }

  // Doubles: generate all possible 4-player combinations and find unplayed
  // For large player counts, just pick the 4 players with fewest games
  const sorted = [...players].sort((a, b) => (a.gamesPlayed || 0) - (b.gamesPlayed || 0));
  return sorted.slice(0, 4);
}

/**
 * Priority-aware queue sort used by all modes
 * Priority players first, then by waitingSince, not-priority last
 */
export function sortByPriority(players) {
  return [...players].sort((a, b) => {
    // Priority first
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    // Not-priority last
    if (a.noPriority && !b.noPriority) return 1;
    if (!a.noPriority && b.noPriority) return -1;
    // Then by waiting time
    return (a.waitingSince || 0) - (b.waitingSince || 0);
  });
}
