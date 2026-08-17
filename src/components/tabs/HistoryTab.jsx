import { useState } from "react";
import { exportMatches } from "../../utils/csvUtils";
import { formatMatchDuration, getRelativeTime } from "../../utils/playerUtils";

export default function HistoryTab({
  matches,
  groupedMatches,
  getSessionSummary,
  onEditMatchWinner,
  onDeleteSession,
  onClearHistory,
}) {
  const [expandedSession, setExpandedSession] = useState(null);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">
          Match History
          <span className="text-sm font-normal text-slate-400 ml-2">({matches.length})</span>
        </h2>
        <div className="flex gap-1.5">
          <button onClick={() => exportMatches(matches)}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">
            📤 CSV
          </button>
          <button onClick={onClearHistory}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
            🗑️
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
          No matches recorded yet
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedMatches)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([session, sessionMatches]) => {
              const summary = getSessionSummary(sessionMatches);

              return (
                <div key={session} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  {/* Session header */}
                  <button
                    onClick={() => setExpandedSession(expandedSession === session ? null : session)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                  >
                    <div>
                      <span className="text-sm font-semibold text-slate-700">Session {session}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {sessionMatches.length} matches · {summary.players} players
                      </span>
                      {summary.bestRecord && (
                        <span className="text-xs text-yellow-600 ml-2">
                          🏆 {summary.bestRecord.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(Number(session)); }}
                        className="h-7 px-2 rounded text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        🗑️
                      </button>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedSession === session ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded matches */}
                  {expandedSession === session && (
                    <div className="border-t border-slate-100">
                      {/* Session summary */}
                      <div className="flex gap-3 px-4 py-2 bg-slate-50 text-xs text-slate-500">
                        <span>⏱ Avg: {summary.avgDuration}m</span>
                        <span>🔥 Longest: {summary.longestMatch}m</span>
                      </div>

                      {/* Match list */}
                      {sessionMatches.map((match, index) => (
                        <div key={match.id || index} className="px-4 py-3 border-b border-slate-50 last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-sm">
                                <span className="text-blue-600 font-medium truncate">{match.teamA?.join(" & ")}</span>
                                <span className="text-slate-300 text-xs">vs</span>
                                <span className="text-purple-600 font-medium truncate">{match.teamB?.join(" & ")}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {match.startedAt && match.endedAt && formatMatchDuration(match.startedAt, match.endedAt)}
                                {match.endedAt && ` · ${getRelativeTime(match.endedAt)}`}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                match.winner === "A" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                              }`}>
                                {match.winner}
                              </span>
                              <select
                                value={match.winner}
                                onChange={(e) => onEditMatchWinner(match.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-7 text-xs border border-slate-200 rounded px-1 bg-white"
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
