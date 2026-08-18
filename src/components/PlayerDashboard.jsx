import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../db/supabase";
import { resolveClub } from "../db/clubResolver";
import PlayerAvatar from "./ui/PlayerAvatar";

export default function PlayerDashboard() {
  const { clubId: clubIdentifier, playerName } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [clubName, setClubName] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const club = await resolveClub(clubIdentifier);
      if (!club) { setNotFound(true); setLoading(false); return; }
      setClubName(club.name);

      // Find player in directory
      const { data: dirData } = await supabase
        .from("directory")
        .select("*")
        .eq("club_id", club.id)
        .ilike("name", decodeURIComponent(playerName));

      if (!dirData || dirData.length === 0) { setNotFound(true); setLoading(false); return; }

      const raw = dirData[0];
      const p = { id: raw.id, name: raw.name, ...raw.data };
      setPlayer(p);

      // Load matches for this player
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .eq("club_id", club.id)
        .order("id", { ascending: false });

      if (matchData) {
        const playerMatches = matchData
          .map((r) => ({ ...r.data, id: r.id }))
          .filter((m) =>
            (m.teamA && m.teamA.includes(p.name)) ||
            (m.teamB && m.teamB.includes(p.name))
          );
        setMatches(playerMatches);
      }

      // Load attendance
      const { data: attData } = await supabase
        .from("attendance")
        .select("*")
        .eq("club_id", club.id);

      if (attData) {
        const playerAtt = attData
          .map((r) => ({ ...r.data, id: r.id }))
          .filter((a) => a.playerId === p.id);
        setAttendance(playerAtt);
      }

      // Load all directory players for ranking
      const { data: allDir } = await supabase
        .from("directory")
        .select("*")
        .eq("club_id", club.id);

      if (allDir) {
        setAllPlayers(
          allDir.map((r) => ({ id: r.id, name: r.name, ...r.data }))
            .filter((d) => d.gamesPlayed > 0)
            .sort((a, b) => {
              const aRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
              const bRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
              return bRate - aRate;
            })
        );
      }

      setLoading(false);
    };
    load();
  }, [clubIdentifier, playerName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">Player not found</h1>
          <p className="text-slate-500 mt-2">Check the link and try again.</p>
        </div>
      </div>
    );
  }

  const winRate = player.gamesPlayed > 0
    ? Math.round((player.wins / player.gamesPlayed) * 100)
    : 0;

  const rank = allPlayers.findIndex((p) => p.id === player.id) + 1;

  // Recent form (last 10 matches)
  const recentForm = matches.slice(0, 10).map((m) => {
    const inTeamA = m.teamA?.includes(player.name);
    const won = (m.winner === "A" && inTeamA) || (m.winner === "B" && !inTeamA);
    return won ? "W" : "L";
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center mb-4">
          <PlayerAvatar player={player} size="w-18 h-18" textSize="text-2xl" />
          <h1 className="text-2xl font-bold text-slate-800 mt-3">{player.name}</h1>
          <p className="text-sm text-slate-500">{clubName}</p>
          {rank > 0 && (
            <div className="mt-2 inline-block bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
              #{rank} in Club
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{player.gamesPlayed || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase">Games</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-bold text-green-600">{player.wins || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase">Wins</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-bold text-red-600">{player.losses || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase">Losses</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-bold text-purple-600">{winRate}%</div>
            <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
          </div>
        </div>

        {/* ELO & Streaks */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-bold text-amber-600">{(player.eloRating || player.rating || 2.0).toFixed(1)}</div>
            <div className="text-[10px] text-slate-400 uppercase">ELO</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-bold text-green-600">{player.currentStreak || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase">Streak</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-bold text-indigo-600">{player.bestStreak || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase">Best</div>
          </div>
        </div>

        {/* Recent Form */}
        {recentForm.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Form</h3>
            <div className="flex gap-1.5">
              {recentForm.map((r, i) => (
                <span key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  r === "W" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sessions Attended */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Attendance</h3>
          <p className="text-2xl font-bold text-blue-600">{attendance.length} <span className="text-sm font-normal text-slate-400">sessions</span></p>
        </div>

        {/* Match History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Match History ({matches.length})</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No matches yet.</p>
            ) : (
              matches.slice(0, 20).map((m, i) => {
                const inTeamA = m.teamA?.includes(player.name);
                const won = (m.winner === "A" && inTeamA) || (m.winner === "B" && !inTeamA);
                return (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    won ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}>
                    <div className="text-xs text-slate-600">
                      <span className="font-medium">{m.teamA?.join(" & ")}</span>
                      <span className="text-slate-400 mx-1">vs</span>
                      <span className="font-medium">{m.teamB?.join(" & ")}</span>
                    </div>
                    <span className={`text-xs font-bold ${won ? "text-green-600" : "text-red-600"}`}>
                      {won ? "W" : "L"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <a href={`/live/${clubIdentifier}`} className="text-sm text-blue-600 hover:underline">
            ← Back to Live Board
          </a>
        </div>
      </div>
    </div>
  );
}
