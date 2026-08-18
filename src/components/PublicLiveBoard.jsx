import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../db/supabase";
import { sortPlayers } from "../utils/playerUtils";
import PlayerAvatar from "./ui/PlayerAvatar";

function getCourtLabel(type) {
  if (type === "king")    return "👑 King's";
  if (type === "general") return "🎖️ General";
  if (type === "knight")  return "⚔️ Knight";
  if (type === "squire")  return "🛡️ Squire";
  if (type === "winner")  return "🏆 Winner";
  if (type === "loser")   return "🔄 Loser";
  if (type === "any")     return "🏓 Open";
  return "📌 Court";
}

function getCourtDuration(startedAt) {
  if (!startedAt) return "--:--";
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getCourtMinutes(startedAt) {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - startedAt) / 60000);
}

export default function PublicLiveBoard() {
  const { clubId } = useParams();
  const [clubName, setClubName] = useState("Loading...");
  const [players, setPlayers]   = useState([]);
  const [courts, setCourts]     = useState([]);
  const [matches, setMatches]   = useState([]);
  const [directory, setDirectory] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [, forceUpdate]         = useState(0);

  useEffect(() => {
    const refresh = async () => {
      try {
        const { data: clubData } = await supabase
          .from("clubs").select("name").eq("id", clubId).single();
        if (!clubData) { setNotFound(true); return; }
        setClubName(clubData.name);

        const [playersRes, matchesRes, courtsRes, directoryRes] = await Promise.all([
          supabase.from("players").select("*").eq("club_id", clubId),
          supabase.from("matches").select("*").eq("club_id", clubId).order("id", { ascending: false }).limit(10),
          supabase.from("courts").select("data").eq("club_id", clubId).single(),
          supabase.from("directory").select("*").eq("club_id", clubId),
        ]);
        if (playersRes.data) setPlayers(playersRes.data.map((r) => ({ id: r.id, name: r.name, ...r.data })));
        if (matchesRes.data) setMatches(matchesRes.data.map((r) => ({ ...r.data, id: r.id })));
        if (courtsRes.data) setCourts(courtsRes.data.data || []);
        if (directoryRes.data) setDirectory(directoryRes.data.map((r) => ({ id: r.id, name: r.name, ...r.data })));
      } catch (err) {
        console.error("Public board refresh failed:", err);
      }
    };

    refresh();
    const dataTimer = setInterval(refresh, 15000);
    const tickTimer = setInterval(() => forceUpdate((v) => v + 1), 1000);
    return () => { clearInterval(dataTimer); clearInterval(tickTimer); };
  }, [clubId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <img src="/logo.png" alt="KNGS Stack" className="w-14 h-14 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800">Club not found</h1>
          <p className="text-slate-500 mt-2 text-sm">Check the link and try again.</p>
        </div>
      </div>
    );
  }

  const sortedQueue = sortPlayers(players);
  const activePlaying = courts.reduce((c, court) => c + (court.players?.length || 0), 0);
  const [showAllStandings, setShowAllStandings] = useState(false);

  // Standings from directory
  const standings = directory
    .filter((p) => (p.gamesPlayed || 0) > 0)
    .sort((a, b) => {
      const wrA = (a.wins || 0) + (a.losses || 0) > 0 ? (a.wins || 0) / ((a.wins || 0) + (a.losses || 0)) : 0;
      const wrB = (b.wins || 0) + (b.losses || 0) > 0 ? (b.wins || 0) / ((b.wins || 0) + (b.losses || 0)) : 0;
      if (wrB !== wrA) return wrB - wrA;
      return (b.wins || 0) - (a.wins || 0);
    });

  const visibleStandings = showAllStandings ? standings : standings.slice(0, 3);

  return (
    <div className="min-h-screen w-full bg-slate-50 overflow-x-hidden">
      {/* Header — mobile compact */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="KNGS Stack" className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 truncate">KNGS Stack Live</h1>
              <p className="text-[10px] text-slate-400 truncate">{clubName}</p>
            </div>
          </div>

          {/* Stats — compact on mobile */}
          <div className="flex gap-3 sm:gap-5 shrink-0">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{players.length}</div>
              <div className="text-[9px] sm:text-xs text-slate-400">Queue</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{activePlaying}</div>
              <div className="text-[9px] sm:text-xs text-slate-400">Playing</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-amber-600">{matches.length}</div>
              <div className="text-[9px] sm:text-xs text-slate-400">Games</div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-3 sm:px-6 py-4 space-y-4">

        {/* Active Courts */}
        {courts.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Active Courts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courts.map((court) => {
                const mins = getCourtMinutes(court.startedAt);
                const timerColor = mins >= 20 ? "text-red-600 animate-pulse" : mins >= 15 ? "text-yellow-600" : "text-green-600";

                return (
                  <div key={court.id} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm sm:text-base font-bold text-blue-700">
                        {getCourtLabel(court.type)} #{court.id}
                      </h3>
                      {court.startedAt && (
                        <span className={`text-base sm:text-lg font-mono font-bold ${timerColor}`}>
                          {getCourtDuration(court.startedAt)}
                        </span>
                      )}
                    </div>

                    {!court.players || court.players.length === 0 ? (
                      <div className="text-center py-4 text-slate-300 text-xs border border-dashed border-slate-200 rounded-lg">
                        Waiting
                      </div>
                    ) : court.format === "singles" ? (
                      <div className="flex justify-around">
                        {court.players.map((p, idx) => (
                          <div key={p.id} className="text-center">
                            <PlayerAvatar player={p} size="w-8 h-8" color={idx === 0 ? "blue" : "purple"} textSize="text-xs" />
                            <div className="text-xs font-medium text-slate-700 mt-1 truncate max-w-[60px]">{p.name}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="text-[10px] font-bold text-blue-600 mb-1 text-center">Team A</div>
                          {court.players.slice(0, 2).map((p) => (
                            <div key={p.id} className="flex items-center gap-1.5 py-0.5">
                              <PlayerAvatar player={p} size="w-6 h-6" textSize="text-[9px]" />
                              <span className="text-xs text-slate-700 truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2">
                          <div className="text-[10px] font-bold text-purple-600 mb-1 text-center">Team B</div>
                          {court.players.slice(2, 4).map((p) => (
                            <div key={p.id} className="flex items-center gap-1.5 py-0.5">
                              <PlayerAvatar player={p} size="w-6 h-6" color="purple" textSize="text-[9px]" />
                              <span className="text-xs text-slate-700 truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Player Queue */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
            Queue <span className="font-normal text-slate-400">({players.length})</span>
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            {sortedQueue.length === 0 ? (
              <div className="text-center py-6 text-slate-300 text-sm">No players yet</div>
            ) : (
              <div className="space-y-1">
                {sortedQueue.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${index < 4 ? "bg-blue-50" : ""}`}
                  >
                    <span className="text-[10px] font-bold text-slate-300 w-4">{index + 1}</span>
                    <PlayerAvatar player={player} size="w-7 h-7" textSize="text-[9px]" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate block">{player.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {player.wins || 0}W {player.losses || 0}L
                    </span>
                    {index < 4 && (
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0">Next</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Matches */}
        {matches.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Matches</h2>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
              {matches.slice(0, 5).map((match, i) => (
                <div key={match.id || i} className="flex items-center justify-between text-xs border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-blue-600 font-medium">{match.teamA?.join(" & ")}</span>
                    <span className="text-slate-300 mx-1">v</span>
                    <span className="text-purple-600 font-medium">{match.teamB?.join(" & ")}</span>
                  </div>
                  <span className={`ml-1 shrink-0 font-bold ${match.winner === "A" ? "text-blue-600" : "text-purple-600"}`}>
                    {match.winner}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Standings */}
        {standings.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              Standings <span className="font-normal text-slate-400">({standings.length})</span>
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="grid grid-cols-[20px_1fr_auto_auto_auto] gap-x-2 px-2 py-1 text-[10px] text-slate-400 font-medium border-b border-slate-100 mb-1">
                <span>#</span>
                <span>Player</span>
                <span>W</span>
                <span>L</span>
                <span>WR</span>
              </div>
              {visibleStandings.map((player, index) => {
                const wr = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
                return (
                  <div key={player.id} className="grid grid-cols-[20px_1fr_auto_auto_auto] gap-x-2 items-center px-2 py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-[10px] font-bold text-slate-400">
                      {index === 0 && "🥇"}{index === 1 && "🥈"}{index === 2 && "🥉"}
                      {index > 2 && (index + 1)}
                    </span>
                    <span className="text-xs font-medium text-slate-700 truncate">{player.name}</span>
                    <span className="text-xs font-semibold text-green-600">{player.wins || 0}</span>
                    <span className="text-xs font-semibold text-red-500">{player.losses || 0}</span>
                    <span className="text-xs font-bold text-blue-600">{wr}%</span>
                  </div>
                );
              })}
              {standings.length > 3 && (
                <button
                  onClick={() => setShowAllStandings(!showAllStandings)}
                  className="w-full mt-2 text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAllStandings ? "▲ Show less" : `▼ Show all (${standings.length})`}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Check-in link */}
        <div className="text-center py-4 space-y-2">
          <a
            href={`/checkin/${clubId}`}
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            ✅ Check In Here
          </a>
          <div className="text-[10px] text-slate-300">
            Auto-refreshes every 15s
          </div>
        </div>
      </main>
    </div>
  );
}


