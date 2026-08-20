import { useState } from "react";
import { exportStandings, downloadCSV } from "../../utils/csvUtils";

function buildShareText(standings, standingsHistory, sessionId, getStandingRank) {
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const lines = [`🏸 KNGS Stack — Session ${sessionId} Standings`, `📅 ${date}`, ``, `🏆 STANDINGS`, `─────────────────────────`];
  standings.forEach((player, index) => {
    const rank = getStandingRank(standings, index);
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
    const wr = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
    lines.push(`${medal} ${player.name}  ${player.wins}W-${player.losses}L  ${wr}%`);
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
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const top3 = standings.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Standings</h2>
        <div className="flex gap-1.5">
          <button onClick={handleCopyResults}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${copied ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {copied ? "✅ Copied" : "📋 Copy"}
          </button>
          <button onClick={() => exportStandings(standings, sessionId, getStandingRank)}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">
            📤 CSV
          </button>
          <button onClick={onClearStandings}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
            🗑️
          </button>
        </div>
      </div>

      {standings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
          No standings yet — play some games first
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length >= 3 && (
            <div className="grid grid-cols-3 gap-1.5 px-1">
              {[1, 0, 2].map((podiumIdx) => {
                const player = top3[podiumIdx];
                if (!player) return null;
                const rank = podiumIdx + 1;
                const wr = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
                const medals = ["🥇", "🥈", "🥉"];
                const bgColors = ["bg-yellow-50 border-yellow-200", "bg-slate-50 border-slate-200", "bg-orange-50 border-orange-200"];
                const isCenter = podiumIdx === 0;

                return (
                  <div key={player.id} className={`rounded-xl border p-2 sm:p-3 text-center ${bgColors[podiumIdx]} ${isCenter ? "transform -translate-y-2" : ""}`}>
                    <div className="text-xl sm:text-2xl mb-0.5">{medals[podiumIdx]}</div>
                    <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">{player.name}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{player.wins}W-{player.losses}L</div>
                    <div className="text-[10px] sm:text-xs font-semibold text-blue-600">{wr}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full standings table */}
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-[24px_1fr_auto_auto_auto_auto] gap-x-2 sm:gap-x-3 px-3 py-2 text-xs text-slate-500 font-semibold border-b border-slate-100">
              <span>#</span>
              <span>Player</span>
              <span>W</span>
              <span>L</span>
              <span>WR</span>
              <span>ELO</span>
            </div>

            {standings.map((player, index) => {
              const rank = getStandingRank(standings, index);
              const wr = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
              return (
                <div key={player.id} className="grid grid-cols-[24px_1fr_auto_auto_auto_auto] gap-x-2 sm:gap-x-3 items-center px-3 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <span className="text-xs font-bold text-slate-400">{rank}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800 truncate block">{player.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {player.currentStreak > 0 && `🔥${player.currentStreak} `}
                      GP:{player.gamesPlayed}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{player.wins}</span>
                  <span className="text-sm font-semibold text-red-500">{player.losses}</span>
                  <span className="text-sm font-bold text-blue-600">{wr}%</span>
                  <span className="text-xs font-semibold text-purple-600">{(player.eloRating || 2.0).toFixed(1)}</span>
                </div>
              );
            })}
          </div>

        </>
      )}

      {/* All-Time Leaderboard (from standings history) */}
      {standingsHistory.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-600 mb-2">🏆 All-Time Leaderboard</h3>
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {(() => {
              // Aggregate wins across all sessions
              const allTimeStats = {};
              standingsHistory.forEach((session) => {
                (session.standings || []).forEach((p) => {
                  if (!allTimeStats[p.playerName]) {
                    allTimeStats[p.playerName] = { name: p.playerName, wins: 0, losses: 0, games: 0, sessions: 0 };
                  }
                  allTimeStats[p.playerName].wins += (p.wins || 0);
                  allTimeStats[p.playerName].losses += (p.losses || 0);
                  allTimeStats[p.playerName].games += (p.gamesPlayed || 0);
                  allTimeStats[p.playerName].sessions += 1;
                });
              });
              // Add current session stats
              standings.forEach((p) => {
                if (!allTimeStats[p.name]) {
                  allTimeStats[p.name] = { name: p.name, wins: 0, losses: 0, games: 0, sessions: 0 };
                }
                allTimeStats[p.name].wins += (p.wins || 0);
                allTimeStats[p.name].losses += (p.losses || 0);
                allTimeStats[p.name].games += (p.gamesPlayed || 0);
              });

              const sorted = Object.values(allTimeStats)
                .filter((p) => p.games > 0)
                .sort((a, b) => {
                  const wrA = a.games > 0 ? a.wins / a.games : 0;
                  const wrB = b.games > 0 ? b.wins / b.games : 0;
                  return wrB !== wrA ? wrB - wrA : b.wins - a.wins;
                });

              return sorted.map((p, i) => {
                const wr = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0;
                return (
                  <div key={p.name} className="flex items-center justify-between px-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600 font-semibold">{p.wins}W</span>
                      <span className="text-red-500">{p.losses}L</span>
                      <span className="text-blue-600 font-bold">{wr}%</span>
                      <span className="text-slate-400">{p.sessions}s</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Session History (always visible if there's history) */}
      {standingsHistory.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-600 mb-2">📊 Session History ({standingsHistory.length})</h3>
          <div className="space-y-2">
            {[...standingsHistory].sort((a, b) => b.sessionId - a.sessionId).map((history) => (
              <div key={history.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => setExpandedStandings(expandedStandings === history.id ? null : history.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-700">Session {history.sessionId}</span>
                    <span className="text-xs text-slate-400 ml-2">{history.standings?.length || 0} players · {history.matchCount || 0} matches</span>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedStandings === history.id ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedStandings === history.id && (
                  <div className="border-t border-slate-100 px-4 py-2">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const sorted = [...(history.standings || [])].sort((a, b) => {
                            const wrA = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
                            const wrB = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
                            return wrB !== wrA ? wrB - wrA : b.wins - a.wins;
                          });
                          const rows = [["Rank", "Player", "Wins", "Losses", "Win Rate"]];
                          sorted.forEach((p, i) => {
                            const wr = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
                            rows.push([i + 1, p.playerName, p.wins, p.losses, `${wr}%`]);
                          });
                          downloadCSV(`session-${history.sessionId}-standings.csv`, rows);
                        }}
                        className="h-7 px-2.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        📤 Export
                      </button>
                    </div>
                    {[...(history.standings || [])]
                      .sort((a, b) => {
                        const wrA = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
                        const wrB = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
                        return wrB !== wrA ? wrB - wrA : b.wins - a.wins;
                      })
                      .map((p, i) => (
                        <div key={p.playerId} className="flex items-center justify-between py-1.5 text-sm border-b border-slate-50 last:border-0">
                          <span className="text-slate-600">
                            {i === 0 && "🥇"}{i === 1 && "🥈"}{i === 2 && "🥉"} {p.playerName}
                          </span>
                          <span className="text-xs text-slate-400">{p.wins}W-{p.losses}L {p.eloRating ? `· ${p.eloRating.toFixed(1)}` : ""}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


