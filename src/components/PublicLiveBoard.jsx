import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../db/supabase";
import { sortPlayers } from "../utils/playerUtils";
import PlayerAvatar from "./ui/PlayerAvatar";

function getCourtLabel(type) {
  if (type === "king")    return "👑 King's Court";
  if (type === "general") return "🎖️ General Court";
  if (type === "knight")  return "⚔️ Knight Court";
  if (type === "squire")  return "🛡️ Squire Court";
  if (type === "winner")  return "🏆 Winner Court";
  if (type === "loser")   return "🔄 Loser Court";
  if (type === "any")     return "🏓 Open Court";
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
  const [notFound, setNotFound] = useState(false);
  const [, forceUpdate]         = useState(0);

  useEffect(() => {
    const refresh = async () => {
      try {
        const { data: clubData } = await supabase
          .from("clubs").select("name").eq("id", clubId).single();
        if (!clubData) { setNotFound(true); return; }
        setClubName(clubData.name);

        const [playersRes, matchesRes, courtsRes] = await Promise.all([
          supabase.from("players").select("*").eq("club_id", clubId),
          supabase.from("matches").select("*").eq("club_id", clubId).order("id", { ascending: false }).limit(10),
          supabase.from("courts").select("data").eq("club_id", clubId).single(),
        ]);
        if (playersRes.data) setPlayers(playersRes.data.map((r) => ({ id: r.id, name: r.name, ...r.data })));
        if (matchesRes.data) setMatches(matchesRes.data.map((r) => ({ ...r.data, id: r.id })));
        if (courtsRes.data) setCourts(courtsRes.data.data || []);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🏸</div>
          <h1 className="text-2xl font-bold text-slate-800">Club not found</h1>
          <p className="text-slate-500 mt-2">Check the link and try again.</p>
        </div>
      </div>
    );
  }

  const sortedQueue = sortPlayers(players);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="RallyStack" className="w-9 h-9" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">RallyStack Live</h1>
            <p className="text-slate-500 text-sm">{clubName}</p>
          </div>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">{players.length}</div>
            <div className="text-xs text-slate-500">In Queue</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">
              {courts.reduce((c, court) => c + (court.players?.length || 0), 0)}
            </div>
            <div className="text-xs text-slate-500">Playing</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">{courts.length}</div>
            <div className="text-xs text-slate-500">Courts</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-600">{matches.length}</div>
            <div className="text-xs text-slate-500">Matches</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Active Courts */}
        {courts.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-700 mb-4">🏸 Active Courts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courts.map((court) => {
                const mins = getCourtMinutes(court.startedAt);
                const timerColor =
                  mins >= 20 ? "text-red-600 animate-pulse" :
                  mins >= 15 ? "text-yellow-600" :
                  "text-green-600";

                return (
                  <div key={court.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-bold text-blue-700">
                        {getCourtLabel(court.type)} #{court.id}
                      </h3>
                      {court.startedAt && (
                        <span className={`text-xl font-mono font-bold ${timerColor}`}>
                          {getCourtDuration(court.startedAt)}
                        </span>
                      )}
                    </div>

                    {!court.players || court.players.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                        Waiting for players
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <div className="text-xs font-bold text-blue-600 mb-2 text-center">🔵 Team A</div>
                          {court.players.slice(0, 2).map((p) => (
                            <div key={p.id} className="flex items-center gap-2 py-1">
                              <PlayerAvatar player={p} size="w-8 h-8" textSize="text-xs" />
                              <span className="font-semibold text-sm text-slate-800 truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                          <div className="text-xs font-bold text-purple-600 mb-2 text-center">🟣 Team B</div>
                          {court.players.slice(2, 4).map((p) => (
                            <div key={p.id} className="flex items-center gap-2 py-1">
                              <PlayerAvatar player={p} size="w-8 h-8" color="purple" textSize="text-xs" />
                              <span className="font-semibold text-sm text-slate-800 truncate">{p.name}</span>
                            </div>
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

        {/* Queue + Recent Matches */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Queue */}
        <div className="xl:col-span-2">
          <h2 className="text-lg font-bold text-slate-700 mb-4">
            ⏳ Player Queue
            <span className="text-sm font-normal text-slate-400 ml-2">({players.length} waiting)</span>
          </h2>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            {sortedQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No players in queue — session may not have started yet</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sortedQueue.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${index < 4 ? "bg-blue-50" : ""}`}
                  >
                    <div className="text-sm font-bold text-slate-400 w-6 text-center">{index + 1}</div>
                    <PlayerAvatar player={player} size="w-9 h-9" textSize="text-xs" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 truncate">{player.name}</div>
                      <div className="text-xs text-slate-400">{player.gamesPlayed || 0} GP · {player.wins || 0}W · {player.losses || 0}L</div>
                    </div>
                    {index < 4 && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">Next</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Matches */}
        <div>
          <h2 className="text-lg font-bold text-slate-700 mb-4">📜 Recent Matches</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No matches yet</div>
            ) : (
              matches.slice(0, 10).map((match, i) => (
                <div key={match.id || i} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-blue-600 font-medium">{match.teamA?.join(" & ")}</span>
                    <span className="text-slate-400 mx-2">vs</span>
                    <span className="text-purple-600 font-medium">{match.teamB?.join(" & ")}</span>
                  </div>
                  <span className="text-green-600 font-semibold ml-2 shrink-0">Team {match.winner} 🏆</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="text-center text-slate-400 text-xs py-4 space-y-2">
        <div>Auto-refreshes every 15 seconds · {new Date().toLocaleTimeString()}</div>
        <a
          href={`/checkin/${clubId}`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          ✅ Check In Here
        </a>
      </div>
    </div>
  );
}
