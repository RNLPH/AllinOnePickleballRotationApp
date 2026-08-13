import { useState } from "react";
import { exportMatches } from "../../utils/csvUtils";
import { formatSessionDate, formatMatchDuration, getRelativeTime } from "../../utils/playerUtils";

export default function HistoryTab({
  matches,
  groupedMatches,
  getSessionSummary,
  onEditMatchWinner,
  onDeleteSession,
  onClearHistory,
}) {
  const [expandedMatchSession, setExpandedMatchSession] = useState(null);

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold">
          📜 Match History ({matches.length} Total)
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => exportMatches(matches)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
          >
            📤 Export CSV
          </button>

          <button
            onClick={onClearHistory}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
          >
            🗑️ Clear All History
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <p>No matches recorded yet.</p>
      ) : (
        Object.entries(groupedMatches)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([session, sessionMatches]) => {
            const summary = getSessionSummary(sessionMatches);

            return (
              <div
                key={session}
                className="mb-8 border rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-blue-600">
                      📂 Session {session}
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setExpandedMatchSession(
                          expandedMatchSession === session ? null : session
                        )
                      }
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                    >
                      {expandedMatchSession === session
                        ? "Hide Matches"
                        : "View Matches"}
                    </button>

                    <button
                      onClick={() => onDeleteSession(Number(session))}
                      className="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  🗓️{" "}
                  {formatSessionDate(
                    sessionMatches[0]?.sessionTimestamp ||
                      sessionMatches[0]?.date
                  )}
                </p>

                <div className="bg-slate-100 rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>👥 Players: {summary.players}</div>
                    <div>🏓 Matches: {summary.matches}</div>
                    <div>⏱ Avg Match: {summary.avgDuration} min</div>
                    <div>🔥 Longest: {summary.longestMatch} min</div>
                  </div>

                  {summary.bestRecord && (
                    <div className="mt-4 text-center">
                      <div className="text-lg font-bold text-yellow-600">
                        🏆 Best Session Record
                      </div>

                      <div className="mt-2 text-sm">
                        Record:{" "}
                        <span className="font-semibold">
                          {summary.bestRecord.wins}W-
                          {summary.bestRecord.losses}L
                        </span>
                      </div>

                      <div className="text-sm">
                        Win Rate:{" "}
                        <span className="font-semibold">
                          {Math.round(summary.bestRecord.winRate * 100)}%
                        </span>
                      </div>

                      <div className="mt-3 text-sm font-semibold text-gray-700">
                        Players
                      </div>

                      <div className="space-y-1 mt-1">
                        {summary.topRecordPlayers.map((player) => (
                          <div key={player.name} className="text-sm">
                            • {player.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {expandedMatchSession === session && (
                  <>
                    {sessionMatches.map((match, index) => (
                      <div key={index} className="border-b py-4">
                        <div className="text-sm text-gray-400 mb-2">
                          Match #{index + 1}
                        </div>

                        <div className="mb-2">
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                            Court {match.courtId}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>🔵 {match.teamA.join(" & ")}</div>
                          <div>🟣 {match.teamB.join(" & ")}</div>

                          <div className="flex items-center gap-2">
                            <div className="text-green-600 font-semibold">
                              🏆 Winner: Team {match.winner}
                            </div>

                            <select
                              value={match.winner}
                              onChange={(e) =>
                                onEditMatchWinner(match.id, e.target.value)
                              }
                              className="border rounded px-2 py-1 text-xs"
                            >
                              <option value="A">Team A</option>
                              <option value="B">Team B</option>
                            </select>
                          </div>
                        </div>

                        <div className="text-xs text-gray-400 mt-2">
                          🕒{" "}
                          {formatMatchDuration(match.startedAt, match.endedAt)}
                        </div>

                        <div className="text-xs text-gray-400">
                          ⌛ {getRelativeTime(match.endedAt)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })
      )}
    </div>
  );
}
