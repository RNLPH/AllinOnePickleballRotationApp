export const downloadCSV = (filename, rows) => {
  const csvContent = rows
    .map((row) => row.map((value) => `"${value}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportStandings = (standings, sessionId, getStandingRank) => {
  const rows = [["Rank", "Player", "Games", "Wins", "Losses", "Win Rate"]];

  standings.forEach((player, index) => {
    rows.push([
      getStandingRank(standings, index),
      player.name,
      player.gamesPlayed,
      player.wins,
      player.losses,
      `${
        player.gamesPlayed > 0
          ? Math.round((player.wins / player.gamesPlayed) * 100)
          : 0
      }%`,
    ]);
  });

  downloadCSV(`standings-session-${sessionId}.csv`, rows);
};

export const exportAttendance = (attendanceLeaders) => {
  const rows = [["Player", "Sessions Attended"]];

  attendanceLeaders.forEach((player) => {
    rows.push([player.playerName, player.count]);
  });

  downloadCSV("attendance.csv", rows);
};

export const exportMatches = (matches) => {
  const rows = [["Session", "Court", "Team A", "Team B", "Winner"]];

  matches.forEach((match) => {
    rows.push([
      match.sessionId,
      match.courtId,
      match.teamA.join(" & "),
      match.teamB.join(" & "),
      match.winner,
    ]);
  });

  downloadCSV("matches.csv", rows);
};

