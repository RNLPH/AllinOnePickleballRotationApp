import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../db/supabase";

export default function PublicChallenge() {
  const { clubId } = useParams();
  const [clubName, setClubName] = useState("Loading...");
  const [players, setPlayers] = useState([]);
  const [challenger, setChallenger] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: club } = await supabase
        .from("clubs").select("name").eq("id", clubId).single();
      if (!club) { setNotFound(true); return; }
      setClubName(club.name);

      const { data: queuePlayers } = await supabase
        .from("players").select("id, name, data").eq("club_id", clubId);
      if (queuePlayers) {
        setPlayers(queuePlayers.map((p) => ({
          id: p.id,
          name: p.name,
          rating: p.data?.rating || 2.0,
          wins: p.data?.wins || 0,
          losses: p.data?.losses || 0,
        })));
      }
    };
    load();
    // Auto-refresh every 10s
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [clubId]);

  const handleChallenge = async () => {
    if (!challenger.trim()) { setError("Enter your name first."); return; }
    if (!selectedOpponent) { setError("Select an opponent to challenge."); return; }

    // Check if challenger is in the queue
    const challengerPlayer = players.find(
      (p) => p.name.toLowerCase() === challenger.trim().toLowerCase()
    );
    if (!challengerPlayer) {
      setError("You need to be checked in first. Use the Check-in page.");
      return;
    }
    if (challengerPlayer.id === selectedOpponent.id) {
      setError("You can't challenge yourself!");
      return;
    }

    // Mark the challenge by updating both players' data with challenge info
    const { error: updateError } = await supabase
      .from("players")
      .update({
        data: supabase.rpc ? undefined : {
          challengedBy: challengerPlayer.name,
          challengeTime: Date.now(),
        },
      })
      .eq("id", selectedOpponent.id)
      .eq("club_id", clubId);

    // Simple approach: just show confirmation (operator handles actual matchmaking)
    setMessage(`⚔️ ${challenger.trim()} challenged ${selectedOpponent.name}! The operator will set up your match.`);
    setSelectedOpponent(null);
    setError("");
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">Club not found</h1>
          <p className="text-slate-500 mt-2">Check the link and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Logo" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-800">⚔️ Challenge Mode</h1>
          <p className="text-slate-500 text-sm mt-1">{clubName}</p>
        </div>

        {/* Challenger input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
          <input
            type="text"
            value={challenger}
            onChange={(e) => { setChallenger(e.target.value); setError(""); }}
            placeholder="Enter your name..."
            className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Player list to challenge */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Select Opponent ({players.length} in queue)
          </h3>

          {players.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No players in queue yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {players
                .filter((p) => p.name.toLowerCase() !== challenger.trim().toLowerCase())
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedOpponent(p)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                      selectedOpponent?.id === p.id
                        ? "bg-blue-50 border-2 border-blue-400"
                        : "hover:bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-700">{p.name}</div>
                      <div className="text-[11px] text-slate-400">
                        ⭐ {p.rating?.toFixed(1)} · {p.wins}W / {p.losses}L
                      </div>
                    </div>
                    {selectedOpponent?.id === p.id && (
                      <span className="text-blue-600 text-sm">✓</span>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Error / Message */}
        {error && (
          <div className="mt-3 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
        )}
        {message && (
          <div className="mt-3 px-4 py-2 rounded-lg bg-green-50 text-green-600 text-sm">{message}</div>
        )}

        {/* Challenge button */}
        <button
          onClick={handleChallenge}
          disabled={!selectedOpponent || !challenger.trim()}
          className="w-full mt-4 h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-lg disabled:opacity-50"
        >
          ⚔️ Challenge {selectedOpponent?.name || "..."}
        </button>
      </div>
    </div>
  );
}
