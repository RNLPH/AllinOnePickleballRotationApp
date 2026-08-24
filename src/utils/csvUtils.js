/**
 * csvUtils — Export session data in shareable formats.
 */

/**
 * Generate a text summary of the session for sharing (WhatsApp, LINE, etc.)
 */
export function generateSessionText(sessionId, matches, standings, clubName) {
  const sessionMatches = matches.filter((m) => m.sessionId === sessionId);
  if (sessionMatches.length === 0) return `📋 ${clubName || "KNGS Stack"} — Session ${sessionId}\n\nNo matches played yet.`;

  // Build leaderboard
  const playerStats = {};
  sessionMatches.forEach((match) => {
    [...(match.teamA || []), ...(match.teamB || [])].forEach((player) => {
      if (!playerStats[player]) playerStats[player] = { wins: 0, losses: 0 };
      const won =
        (match.winner === "A" && match.teamA?.includes(player)) ||
        (match.winner === "B" && match.teamB?.includes(player));
      if (won) playerStats[player].wins++;
      else playerStats[player].losses++;
    });
  });

  const leaderboard = Object.entries(playerStats)
    .map(([name, stats]) => ({ name, ...stats, gp: stats.wins + stats.losses }))
    .sort((a, b) => {
      const wrA = a.gp > 0 ? a.wins / a.gp : 0;
      const wrB = b.gp > 0 ? b.wins / b.gp : 0;
      if (wrB !== wrA) return wrB - wrA;
      return b.wins - a.wins;
    });

  const medals = ["🥇", "🥈", "🥉"];
  const top5 = leaderboard.slice(0, 5).map((p, i) => {
    const wr = p.gp > 0 ? Math.round((p.wins / p.gp) * 100) : 0;
    return `${medals[i] || `${i + 1}.`} ${p.name} — ${p.wins}W ${p.losses}L (${wr}%)`;
  });

  // Match durations
  const durations = sessionMatches
    .filter((m) => m.startedAt && m.endedAt)
    .map((m) => Math.round((m.endedAt - m.startedAt) / 60000));
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  const lines = [
    `🏓 ${clubName || "KNGS Stack"} — Session ${sessionId}`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `📊 ${sessionMatches.length} matches | ${Object.keys(playerStats).length} players`,
    avgDuration > 0 ? `⏱ Avg match: ${avgDuration} min` : null,
    ``,
    `🏆 Leaderboard:`,
    ...top5,
    ``,
    `📜 Recent matches:`,
    ...sessionMatches.slice(0, 5).map((m) => {
      const teamA = m.teamA?.join(" & ") || "?";
      const teamB = m.teamB?.join(" & ") || "?";
      const winner = m.winner === "A" ? teamA : teamB;
      return `  ${teamA} vs ${teamB} → ${winner} won`;
    }),
    ``,
    `— Powered by KNGS Stack`,
  ].filter((l) => l !== null);

  return lines.join("\n");
}

/**
 * Generate CSV of match history
 */
export function generateMatchesCsv(matches, sessionId) {
  const sessionMatches = sessionId
    ? matches.filter((m) => m.sessionId === sessionId)
    : matches;

  const header = "Date,Session,Court,Format,Team A,Team B,Winner,Score";
  const rows = sessionMatches.map((m) => {
    const date = m.endedAt ? new Date(m.endedAt).toLocaleString() : "";
    const teamA = (m.teamA || []).join(" & ");
    const teamB = (m.teamB || []).join(" & ");
    return `"${date}",${m.sessionId || ""},${m.courtId || ""},${m.format || "doubles"},"${teamA}","${teamB}",${m.winner || ""},"${m.score || ""}"`;
  });

  return [header, ...rows].join("\n");
}

/**
 * Download a string as a file
 */
export function downloadFile(content, filename, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


/**
 * Download CSV from an array of rows (first row = header)
 */
export function downloadCSV(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadFile(csv, filename, "text/csv");
}

/**
 * Export standings as CSV
 */
export function exportStandings(standings, sessionId, getStandingRank) {
  const rows = [["Rank", "Name", "Wins", "Losses", "Win Rate", "Games Played", "ELO"]];
  standings.forEach((player, index) => {
    const rank = getStandingRank ? getStandingRank(standings, index) : index + 1;
    const wr = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
    rows.push([rank, player.name, player.wins || 0, player.losses || 0, `${wr}%`, player.gamesPlayed || 0, (player.eloRating || 2.0).toFixed(2)]);
  });
  downloadCSV(`session-${sessionId}-standings.csv`, rows);
}

/**
 * Export match history as CSV
 */
export function exportMatches(matches) {
  const rows = [["#", "Team A", "Team B", "Winner", "Court", "Score", "Date"]];
  matches.forEach((m, i) => {
    const date = m.endedAt ? new Date(m.endedAt).toLocaleString() : "";
    rows.push([i + 1, (m.teamA || []).join(" & "), (m.teamB || []).join(" & "), `Team ${m.winner}`, m.courtId || "", m.score || "", date]);
  });
  downloadCSV("match-history.csv", rows);
}

/**
 * Export attendance leaderboard as CSV
 */
export function exportAttendance(attendanceLeaders) {
  const rows = [["Rank", "Player", "Sessions Attended"]];
  attendanceLeaders.forEach((entry, i) => {
    rows.push([i + 1, entry.playerName, entry.count]);
  });
  downloadCSV("attendance.csv", rows);
}
