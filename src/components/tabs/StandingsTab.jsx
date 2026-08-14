import { useState } from "react";
import { exportStandings } from "../../utils/csvUtils";

function buildShareText(standings, standingsHistory, sessionId, getStandingRank) {
  const date = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const lines = [
    `🏓 PickleStack — Session ${sessionId} Standings`,
    `📅 ${date}`,
    ``,
    `🏆 STANDINGS`,
    `─────────────────────────`,
  ];

  standings.forEach((player, index) => {
    const rank = getStandingRank(standings, index);
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
    const wr = player.gamesPlayed > 0
      ? Math.round((player.wins / player.gamesPlayed) * 100)
      : 0;
    lines.push(
      `${medal} ${player.name}  ${player.wins}W-${player.losses}L  ${wr}%`
    );
  });

  lines.push(``);
  lines.push(`Total matches: ${standings.reduce((s, p) => s + p.gamesPlayed, 0) / 2 | 0}`);

  return lines.join("\n");
}

export default function StandingsTab({
  standings,
  standingsHistory,
  sessionId,
  getSessionStats,
  getStandingRank,
  getAttendanceCount,
  onClearStandings,
}) {
  const [expandedStandings, setExpandedStandings] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopyResults = () => {
    const text = buildShareText(standings, standingsHistory, sessionId, getStandingRank);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">🏆 Standings</h2>

        <div className="flex gap-2">
          <button
            onClick={() => exportStandings(standings, sessionId, getStandingRank)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
          >
            📤 Export CSV
          </button>

          <button
            onClick={handleCopyResults}
            className={`px-3 py-2 rounded text-sm text-white transition-all ${
              copied ? "bg-emerald-500" : "bg-sky-500 hover:bg-sky-600"
            }`}
          >
            {copied ? "✅ Copied!" : "📋 Copy Results"}
          </button>

          <button
            onClick={onClearStandings}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm"
          >
            🧹 Clear Standings
          </button>
        </div>
      </div>

      {standings.length === 0 ? (
        <p>No players available</p>
      ) : (
        standings.map((player, index) => {
          const sessionStats = getSessionStats(player.name);
          const rank = getStandingRank(standings, index);

          return (
            <div
              key={player.id}
              className="flex justify-between border-b py-2"
            >
              <div>
                <strong>
                  {rank === 1 && "🥇 "}
                  {rank === 2 && "🥈 "}
                  {rank === 3 && "🥉 "}
                  #{rank} {player.name}
                </strong>

                <div className="text-xs mt-1">
                  <span
                    className={`
                      font-semibold
                      ${
                        player.tier === "king"
                          ? "text-yellow-600"
                          : player.tier === "knight"
                          ? "text-indigo-600"
                          : "text-green-600"
                      }
                    `}
                  >
                    {player.tier === "king" && "👑 King's Court"}
                    {player.tier === "knight" && "⚔️ Knight Court"}
                    {player.tier === "squire" && "🛡️ Squire Court"}
                  </span>
                </div>
              </div>

              <div className="text-sm text-right">
                <div className="font-semibold text-blue-600">Today</div>

                <div>
                  GP: {sessionStats.gamesPlayed}
                  {" | "}
                  W: {sessionStats.wins}
                  {" | "}
                  L: {sessionStats.losses}
                  {" | "}
                  WR: {sessionStats.winRate}%
                </div>

                <div className="text-xs text-gray-500 mt-1">All-Time</div>

                <div className="text-xs text-gray-500">
                  GP: {player.gamesPlayed || 0}
                  {" | "}
                  W: {player.wins || 0}
                  {" | "}
                  L: {player.losses || 0}
                </div>

                <div className="text-xs text-indigo-500">
                  👥 Sessions: {getAttendanceCount(player.id)}
                </div>

                <div className="text-xs text-yellow-600 font-semibold">
                  👑 King Entries: {player.kingCourtEntries || 0}
                </div>

                {(player.currentStreak || 0) > 0 && (
                  <div className="text-xs text-orange-500 font-semibold">
                    🔥 Streak: {player.currentStreak}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      <h3 className="font-semibold text-gray-700 mt-8 mb-3">
        📚 Standings History
      </h3>

      {standingsHistory.length === 0 ? (
        <p>No standings history.</p>
      ) : (
        [...standingsHistory]
          .sort((a, b) => b.sessionId - a.sessionId)
          .map((history) => (
            <div
              key={history.id}
              className="border rounded-xl p-5 mb-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-blue-600">
                    Session {history.sessionId}
                  </h4>

                  <div className="text-xs text-gray-500">
                    <div className="text-xs text-gray-400">
                      {history.standings.length} Players •{" "}
                      {history.matchCount || 0} Matches
                    </div>
                    {new Date(history.timestamp).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() =>
                    setExpandedStandings(
                      expandedStandings === history.id ? null : history.id
                    )
                  }
                  className="
                    bg-blue-500
                    hover:bg-blue-600
                    text-white
                    px-3
                    py-1
                    rounded
                    text-sm
                  "
                >
                  {expandedStandings === history.id
                    ? "Hide Standings"
                    : "View Standings"}
                </button>
              </div>

              {expandedStandings === history.id && (
                <div className="mt-4 border-t pt-4">
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Players</div>
                      <div className="font-bold text-blue-600">
                        {history.standings.length}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Leader</div>
                      <div className="font-bold text-green-600">
                        {history.standings[0]?.playerName}
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Matches</div>
                      <div className="font-bold text-purple-600">
                        {history.matchCount || 0}
                      </div>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Total Games</div>
                      <div className="font-bold text-orange-600">
                        {history.standings.reduce(
                          (sum, player) => sum + player.gamesPlayed,
                          0
                        )}
                      </div>
                    </div>
                  </div>

                  {[...history.standings]
                    .sort((a, b) => {
                      const winRateA =
                        a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
                      const winRateB =
                        b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;

                      if (winRateB !== winRateA) return winRateB - winRateA;
                      return b.wins - a.wins;
                    })
                    .map((player, index) => (
                      <div
                        key={player.playerId}
                        className="flex justify-between border-b py-2"
                      >
                        <div>
                          {index === 0 && "🥇 "}
                          {index === 1 && "🥈 "}
                          {index === 2 && "🥉 "}
                          #{index + 1} {player.playerName}
                        </div>

                        <div className="text-sm">
                          GP: {player.gamesPlayed} | W: {player.wins} | L:{" "}
                          {player.losses} | WR:{" "}
                          {player.gamesPlayed > 0
                            ? Math.round(
                                (player.wins / player.gamesPlayed) * 100
                              )
                            : 0}
                          %
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
      )}
    </div>
  );
}
