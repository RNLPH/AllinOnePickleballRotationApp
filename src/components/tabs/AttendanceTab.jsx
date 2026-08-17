import { useState } from "react";
import { exportAttendance, downloadCSV } from "../../utils/csvUtils";

export default function AttendanceTab({
  attendance,
  attendanceLeaders,
  currentAttendance,
  groupedAttendance,
  groupedMatches,
  sessionId,
  totalSessions,
  getSessionSummary,
  onClearAttendance,
}) {
  const [expandedSession, setExpandedSession] = useState(null);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Attendance</h2>
        <div className="flex gap-1.5">
          <button onClick={() => exportAttendance(attendanceLeaders)}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">
            📤 CSV
          </button>
          <button onClick={onClearAttendance}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
            🗑️
          </button>
        </div>
      </div>

      {/* Stats chips */}
      <div className="flex gap-2 flex-wrap">
        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
          📝 {currentAttendance.length} this session
        </span>
        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
          👥 {attendanceLeaders.length} unique players
        </span>
        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
          📅 Session {sessionId}
        </span>
      </div>

      {/* Champion banner */}
      {attendanceLeaders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">👑</span>
          <div>
            <div className="text-sm font-bold text-yellow-800">{attendanceLeaders[0].playerName}</div>
            <div className="text-xs text-yellow-600">{attendanceLeaders[0].count} sessions attended</div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {attendanceLeaders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
          No attendance data yet
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-400 font-medium">
            Leaderboard
          </div>
          {attendanceLeaders.map((player, index) => (
            <div key={player.playerId} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-5">
                  {index === 0 && "🥇"}{index === 1 && "🥈"}{index === 2 && "🥉"}
                  {index > 2 && `${index + 1}`}
                </span>
                <span className="text-sm font-medium text-slate-700">{player.playerName}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-blue-600">{player.count}</span>
                <span className="text-xs text-slate-400 ml-1">
                  ({Math.round((player.count / totalSessions) * 100)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session History */}
      {Object.keys(groupedAttendance).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-600 mb-2">Session History</h3>
          <div className="space-y-2">
            {Object.entries(groupedAttendance)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([session, records]) => {
                const matchCount = groupedMatches[session]?.length || 0;
                const uniquePlayers = new Set(records.map((r) => r.playerId)).size;

                return (
                  <div key={session} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    <button
                      onClick={() => setExpandedSession(expandedSession === session ? null : session)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                    >
                      <div>
                        <span className="text-sm font-semibold text-slate-700">Session {session}</span>
                        <span className="text-xs text-slate-400 ml-2">
                          {uniquePlayers} players · {matchCount} matches
                        </span>
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedSession === session ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedSession === session && (
                      <div className="border-t border-slate-100 px-4 py-2">
                        <div className="flex justify-end mb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const uniquePlayers = [...new Map(records.map((r) => [r.playerId, r])).values()]
                                .sort((a, b) => a.playerName.localeCompare(b.playerName));
                              const rows = [["#", "Player", "Session", "Date"]];
                              uniquePlayers.forEach((r, i) => {
                                rows.push([i + 1, r.playerName, session, new Date(r.timestamp).toLocaleDateString()]);
                              });
                              downloadCSV(`session-${session}-attendance.csv`, rows);
                            }}
                            className="h-7 px-2.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            📤 Export
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[...new Map(records.map((r) => [r.playerId, r])).values()]
                            .sort((a, b) => a.playerName.localeCompare(b.playerName))
                            .map((record) => (
                              <span key={record.id} className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-xs text-slate-600">
                                {record.playerName}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
