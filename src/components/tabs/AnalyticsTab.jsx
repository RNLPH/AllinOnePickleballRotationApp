/**
 * AnalyticsTab — Session analytics dashboard.
 * Shows games/hour, avg wait, peak players, activity chart.
 */
export default function AnalyticsTab({ matches, players, courts, attendance, sessionId, sessionStartTime }) {
  // Current session matches
  const sessionMatches = matches.filter((m) => m.sessionId === sessionId);
  
  // Games per hour
  const sessionDurationMs = Date.now() - (sessionStartTime || Date.now());
  const sessionHours = Math.max(sessionDurationMs / 3600000, 0.1);
  const gamesPerHour = sessionMatches.length > 0 ? (sessionMatches.length / sessionHours).toFixed(1) : "0";

  // Average match duration
  const matchDurations = sessionMatches
    .filter((m) => m.startedAt && m.endedAt)
    .map((m) => (m.endedAt - m.startedAt) / 60000);
  const avgMatchDuration = matchDurations.length > 0
    ? Math.round(matchDurations.reduce((a, b) => a + b, 0) / matchDurations.length)
    : 0;

  // Peak players (total checked in this session)
  const sessionAttendance = attendance.filter((r) => r.sessionId === sessionId);
  const peakPlayers = sessionAttendance.length;

  // Current utilization
  const activeCourts = courts.filter((c) => c.players?.length > 0).length;
  const utilization = courts.length > 0 ? Math.round((activeCourts / courts.length) * 100) : 0;

  // Avg wait time (based on queue sizes over time)
  const avgWait = matchDurations.length > 0 && activeCourts > 0
    ? Math.round(avgMatchDuration * (players.length / (activeCourts * 4)))
    : 0;

  // Most active players
  const playerGames = {};
  sessionMatches.forEach((m) => {
    [...(m.teamA || []), ...(m.teamB || [])].forEach((name) => {
      playerGames[name] = (playerGames[name] || 0) + 1;
    });
  });
  const topPlayers = Object.entries(playerGames)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Games timeline (last 10 matches with times)
  const recentTimeline = sessionMatches
    .filter((m) => m.endedAt)
    .slice(0, 10)
    .map((m) => ({
      time: new Date(m.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      court: m.courtId,
    }));

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="text-lg font-bold text-slate-800">Session Analytics</h2>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Games/Hour" value={gamesPerHour} icon="⚡" color="blue" />
        <StatCard label="Avg Match" value={`${avgMatchDuration}m`} icon="⏱" color="green" />
        <StatCard label="Peak Players" value={peakPlayers} icon="👥" color="purple" />
        <StatCard label="Court Usage" value={`${utilization}%`} icon="🏟️" color="amber" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Avg Wait" value={avgWait > 0 ? `~${avgWait}m` : "—"} icon="⏳" color="orange" />
        <StatCard label="Total Games" value={sessionMatches.length} icon="🎮" color="indigo" />
        <StatCard label="Active Courts" value={`${activeCourts}/${courts.length}`} icon="🟢" color="teal" />
      </div>

      {/* Most Active Players */}
      {topPlayers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-premium p-4">
          <h3 className="text-sm font-bold text-slate-600 mb-3">Most Active Players</h3>
          <div className="space-y-2">
            {topPlayers.map(([name, games], i) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-slate-700">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(games / topPlayers[0][1]) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 w-8 text-right">{games}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Timeline */}
      {recentTimeline.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-premium p-4">
          <h3 className="text-sm font-bold text-slate-600 mb-3">Recent Activity</h3>
          <div className="flex flex-wrap gap-2">
            {recentTimeline.map((item, i) => (
              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                {item.time} · Court {item.court}
              </span>
            ))}
          </div>
        </div>
      )}

      {sessionMatches.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No games played yet this session. Start a game to see analytics.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    teal: "bg-teal-50 text-teal-700 border-teal-100",
  };

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color] || colorMap.blue}`}>
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] font-medium opacity-70">{label}</div>
    </div>
  );
}
