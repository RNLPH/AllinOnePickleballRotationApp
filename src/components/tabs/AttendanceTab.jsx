import { useState } from "react";
import { exportAttendance } from "../../utils/csvUtils";

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
  const [expandedAttendance, setExpandedAttendance] = useState(null);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold">👥 Attendance</h2>

        <div className="flex gap-2">
          <button
            onClick={() => exportAttendance(attendanceLeaders)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
          >
            📤 Export CSV
          </button>

          <button
            onClick={onClearAttendance}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm"
          >
            🧹 Reset Attendance
          </button>
        </div>
      </div>

      {attendanceLeaders.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
          <div className="text-lg font-bold text-yellow-700">
            👑 Attendance Champion
          </div>

          <div className="mt-1">{attendanceLeaders[0].playerName}</div>

          <div className="text-sm text-gray-600">
            {attendanceLeaders[0].count}{" "}
            {attendanceLeaders[0].count === 1 ? "session" : "sessions"} attended
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Records</div>
          <div className="text-2xl font-bold text-blue-600">
            {currentAttendance.length}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Unique Players</div>
          <div className="text-2xl font-bold text-green-600">
            {attendanceLeaders.length}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Current Session</div>
          <div className="text-2xl font-bold text-purple-600">{sessionId}</div>
        </div>
      </div>

      {attendanceLeaders.length === 0 ? (
        <p>No attendance data yet</p>
      ) : (
        <>
          <h3 className="font-semibold text-gray-700 mb-3">
            🏅 Attendance Leaderboard
          </h3>

          {attendanceLeaders.map((player, index) => (
            <div
              key={player.playerId}
              className="flex justify-between border-b py-2"
            >
              <div>
                {index === 0 && "🥇 "}
                {index === 1 && "🥈 "}
                {index === 2 && "🥉 "}

                <span
                  className={
                    index === 0
                      ? "text-yellow-500 font-bold"
                      : index === 1
                      ? "text-gray-500 font-bold"
                      : index === 2
                      ? "text-orange-500 font-bold"
                      : "font-bold"
                  }
                >
                  #{index + 1}
                </span>

                {" "}
                {player.playerName}
              </div>

              <div className="text-right">
                <div className="font-semibold text-blue-600">
                  {player.count}{" "}
                  {player.count === 1 ? "session" : "sessions"}
                </div>

                <div className="text-xs text-gray-500">
                  {Math.round((player.count / totalSessions) * 100)}% attendance
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <h3 className="font-semibold text-gray-700 mt-8 mb-3">
        📚 Attendance History
      </h3>

      {Object.keys(groupedAttendance).length === 0 ? (
        <p>No attendance history.</p>
      ) : (
        Object.entries(groupedAttendance)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([session, records]) => {
            const sessionMatchCount = groupedMatches[session]?.length || 0;
            const sessionSummary = getSessionSummary(
              groupedMatches[session] || []
            );

            return (
              <div
                key={session}
                className="border rounded-xl p-5 mb-4 bg-white shadow-sm"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <h4 className="font-bold text-blue-600">
                      Session {session}
                    </h4>

                    <div className="text-xs text-gray-500">
                      {new Date(records[0].timestamp).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-72">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Players</div>
                      <div className="font-bold text-blue-600">
                        {new Set(records.map((r) => r.playerId)).size}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Matches</div>
                      <div className="font-bold text-green-600">
                        {sessionMatchCount}
                      </div>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-gray-500">Avg Match</div>
                      <div className="font-bold text-orange-600">
                        {sessionSummary.avgDuration}m
                      </div>
                    </div>
                  </div>
                </div>

                {sessionSummary.bestRecord && (
                  <div className="mt-4 text-center">
                    <div className="text-sm text-gray-500">
                      🏆 Best Session Record
                    </div>

                    <div className="font-semibold text-yellow-600">
                      {sessionSummary.topRecordPlayers
                        .map((p) => p.name)
                        .join(", ")}
                    </div>

                    <div className="text-xs text-gray-500">
                      {sessionSummary.bestRecord.wins}W -{" "}
                      {sessionSummary.bestRecord.losses}L{" • "}
                      {Math.round(
                        sessionSummary.bestRecord.winRate * 100
                      )}
                      %
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() =>
                      setExpandedAttendance(
                        expandedAttendance === session ? null : session
                      )
                    }
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    {expandedAttendance === session
                      ? "Hide Attendance"
                      : "View Attendance"}
                  </button>
                </div>

                {expandedAttendance === session && (
                  <div className="mt-4 border-t pt-4">
                    <div className="font-semibold text-gray-700 mb-3">
                      👥 Attendance List
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[
                        ...new Map(
                          records.map((r) => [r.playerId, r])
                        ).values(),
                      ]
                        .sort((a, b) =>
                          a.playerName.localeCompare(b.playerName)
                        )
                        .map((record) => (
                          <div
                            key={record.id}
                            className="
                              bg-slate-50
                              border
                              rounded-lg
                              px-3
                              py-2
                              text-center
                              text-sm
                              hover:bg-slate-100
                            "
                          >
                            {record.playerName}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
      )}
    </div>
  );
}
