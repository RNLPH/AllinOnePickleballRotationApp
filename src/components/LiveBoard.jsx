import { useEffect, useState } from "react";
import { getPlayers } from "../db/playerService";
import { getMatches } from "../db/matchService";
import { getDirectory } from "../db/directoryService";
import { supabase } from "../db/supabase";
import { sortPlayers } from "../utils/playerUtils";
import { STORAGE_KEYS } from "../constants";
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

export default function LiveBoard({ club, onClose }) {
  const [players, setPlayers]     = useState([]);
  const [courts, setCourts]       = useState([]);
  const [matches, setMatches]     = useState([]);
  const [directory, setDirectory] = useState([]);
  const [showAllStandings, setShowAllStandings] = useState(false);
  const [, forceUpdate]           = useState(0);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [freshPlayers, freshMatches, freshDirectory] = await Promise.all([
          getPlayers(club.id),
          getMatches(club.id),
          getDirectory(club.id),
        ]);
        setPlayers(freshPlayers);
        setMatches(freshMatches);
        setDirectory(freshDirectory);

        const { data: courtsData } = await supabase
          .from("courts").select("data").eq("club_id", club.id).single();
        if (courtsData?.data) setCourts(courtsData.data);
      } catch (err) {
        console.error("LiveBoard refresh failed:", err);
      }
    };

    refresh();
    const dataTimer = setInterval(refresh, 15000);
    const tickTimer = setInterval(() => forceUpdate((v) => v + 1), 1000);
    return () => { clearInterval(dataTimer); clearInterval(tickTimer); };
  }, [club.id]);

  const sortedQueue = sortPlayers(players);
  const upNext = sortedQueue.slice(0, 8);
  const activePlayers = courts.reduce((c, court) => c + court.players.length, 0);
  const totalCheckedIn = players.length + activePlayers;

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
    <div className="fixed inset-0 z-[99999] bg-slate-50 overflow-auto">
      {/* Header — mobile responsive */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="KNGS Stack" className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-slate-800 truncate">Live</h1>
              <p className="text-[10px] text-slate-400 truncate">{club.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{totalCheckedIn}</div>
              <div className="text-[9px] sm:text-xs text-slate-400">Players</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{activePlayers}</div>
              <div className="text-[9px] sm:text-xs text-slate-400">Playing</div>
            </div>
            <div className="text-center hidden sm:block">
              <div className="text-2xl font-bold text-purple-600">{courts.length}</div>
              <div className="text-xs text-slate-400">Courts</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-amber-600">{matches.length}</div>
              <div className="text-[9px] sm:text-xs text-slate-400">Games</div>
            </div>
            <button onClick={onClose}
              className="h-8 px-2 sm:px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-600">
              ✕
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-3 sm:px-6 py-4 space-y-4">
        {/* Active Courts */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Active Courts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {courts.map((court) => {
              const mins = getCourtMinutes(court.startedAt);
              const timerColor = mins >= 20 ? "text-red-600 animate-pulse" : mins >= 15 ? "text-yellow-600" : "text-green-600";

              return (
                <div key={court.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-blue-700">{getCourtLabel(court.type)} #{court.id}</h3>
                    {court.startedAt && (
                      <span className={`text-base font-mono font-bold ${timerColor}`}>{getCourtDuration(court.startedAt)}</span>
                    )}
                  </div>

                  {court.players.length === 0 ? (
                    <div className="text-center py-4 text-slate-300 text-xs border border-dashed border-slate-200 rounded-lg">Waiting</div>
                  ) : court.format === "singles" ? (
                    <div className="flex justify-around">
                      {court.players.map((p, idx) => (
                        <div key={p.id} className="text-center">
                          <PlayerAvatar player={p} size="w-8 h-8" color={idx === 0 ? "blue" : "purple"} textSize="text-xs" />
                          <div className="text-[10px] font-medium text-slate-700 mt-1 truncate max-w-[60px]">{p.name}</div>
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
            {courts.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-300 text-sm">No courts</div>
            )}
          </div>
        </section>

        {/* Queue + Standings + Matches — stacks on mobile, side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Queue */}
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              Queue <span className="font-normal text-slate-400">({players.length})</span>
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1">
              {upNext.length === 0 ? (
                <div className="text-center py-6 text-slate-300 text-sm">Empty</div>
              ) : (
                upNext.map((player, index) => (
                  <div key={player.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${index < 4 ? "bg-blue-50" : ""}`}>
                    <span className="text-[10px] font-bold text-slate-300 w-4">{index + 1}</span>
                    <PlayerAvatar player={player} size="w-7 h-7" textSize="text-[9px]" />
                    <span className="text-xs font-medium text-slate-700 truncate flex-1">{player.name}</span>
                    {index < 4 && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-semibold">Next</span>}
                  </div>
                ))
              )}
              {players.length > 8 && (
                <div className="text-center text-slate-300 text-[10px] pt-1">+{players.length - 8} more</div>
              )}
            </div>
          </section>

          {/* Standings */}
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              Standings <span className="font-normal text-slate-400">({standings.length})</span>
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              {standings.length === 0 ? (
                <div className="text-center py-6 text-slate-300 text-sm">No games yet</div>
              ) : (
                <>
                  {visibleStandings.map((player, index) => {
                    const wr = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
                    return (
                      <div key={player.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 w-5">
                            {index === 0 && "🥇"}{index === 1 && "🥈"}{index === 2 && "🥉"}
                            {index > 2 && (index + 1)}
                          </span>
                          <span className="text-xs font-medium text-slate-700 truncate">{player.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] shrink-0">
                          <span className="text-green-600 font-semibold">{player.wins}W</span>
                          <span className="text-red-500 font-semibold">{player.losses}L</span>
                          <span className="text-blue-600 font-bold">{wr}%</span>
                        </div>
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
                </>
              )}
            </div>
          </section>

          {/* Recent Matches */}
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Matches</h2>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1.5">
              {matches.length === 0 ? (
                <div className="text-center py-6 text-slate-300 text-sm">No matches</div>
              ) : (
                matches.slice(0, 5).map((match, i) => (
                  <div key={match.id || i} className="flex items-center justify-between text-xs border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-blue-600 font-medium">{match.teamA?.join(" & ")}</span>
                      <span className="text-slate-300 mx-1">v</span>
                      <span className="text-purple-600 font-medium">{match.teamB?.join(" & ")}</span>
                    </div>
                    <span className={`ml-1 shrink-0 font-bold ${match.winner === "A" ? "text-blue-600" : "text-purple-600"}`}>{match.winner}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      <div className="text-center text-slate-300 text-[10px] py-3">
        Auto-refreshes every 15s · {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
