import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../db/supabase";

export default function PublicCheckin() {
  const { clubId } = useParams();
  const [clubName, setClubName] = useState("Loading...");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState([]);

  useEffect(() => {
    const loadClub = async () => {
      const { data } = await supabase
        .from("clubs").select("name").eq("id", clubId).single();
      if (!data) { setNotFound(true); return; }
      setClubName(data.name);

      // Load recent check-ins for this session
      const { data: players } = await supabase
        .from("players").select("name").eq("club_id", clubId);
      if (players) setRecentCheckins(players.map((p) => p.name));
    };
    loadClub();
  }, [clubId]);

  const handleCheckin = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Enter your name."); return; }
    if (trimmed.length < 2) { setError("Name must be at least 2 characters."); return; }
    if (trimmed.length > 20) { setError("Name cannot exceed 20 characters."); return; }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) { setError("Only letters, numbers and spaces."); return; }

    setLoading(true);
    setError("");
    setMessage("");

    // Check if already checked in
    const { data: existing } = await supabase
      .from("players")
      .select("id")
      .eq("club_id", clubId)
      .ilike("name", trimmed);

    if (existing && existing.length > 0) {
      setError("You're already checked in!");
      setLoading(false);
      return;
    }

    // Check if player exists in directory
    const { data: dirPlayer } = await supabase
      .from("directory")
      .select("*")
      .eq("club_id", clubId)
      .ilike("name", trimmed)
      .single();

    const playerId = dirPlayer?.id || crypto.randomUUID();
    const playerData = dirPlayer?.data || {};

    const newPlayer = {
      id: playerId,
      name: dirPlayer?.name || trimmed,
      club_id: clubId,
      data: {
        ...playerData,
        tier: playerData.tier || "squire",
        consecutiveGames: 0,
        restedOnce: false,
        lastPartnerId: null,
        lastOpponents: [],
        priority: false,
        noPriority: false,
        gamesPlayed: playerData.gamesPlayed || 0,
        wins: playerData.wins || 0,
        losses: playerData.losses || 0,
        currentStreak: playerData.currentStreak || 0,
        bestStreak: playerData.bestStreak || 0,
        kingCourtEntries: playerData.kingCourtEntries || 0,
        partnerHistory: playerData.partnerHistory || {},
        queueGroup: "unmatched",
        waitingSince: Date.now(),
      },
    };

    // Add to players table
    const { error: insertError } = await supabase
      .from("players")
      .upsert(newPlayer, { onConflict: "id" });

    if (insertError) {
      setError("Failed to check in. Try again.");
      setLoading(false);
      return;
    }

    // Also save to directory if new player
    if (!dirPlayer) {
      await supabase.from("directory").upsert({
        id: playerId,
        name: trimmed,
        club_id: clubId,
        data: newPlayer.data,
      });
    }

    // Save attendance
    const { data: sessionData } = await supabase
      .from("players")
      .select("data")
      .eq("club_id", clubId)
      .limit(1);

    // Use a simple session tracking via localStorage for the public page
    const sessionId = Number(localStorage.getItem(`rallystack_session_${clubId}`) || 1);

    await supabase.from("attendance").upsert({
      id: crypto.randomUUID(),
      player_id: playerId,
      session_id: sessionId,
      club_id: clubId,
      data: {
        id: crypto.randomUUID(),
        playerId,
        playerName: dirPlayer?.name || trimmed,
        sessionId,
        timestamp: Date.now(),
      },
    });

    setMessage(`✅ ${dirPlayer?.name || trimmed} checked in! You're in the queue.`);
    setName("");
    setRecentCheckins((prev) => [...prev, dirPlayer?.name || trimmed]);
    setLoading(false);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <img src="/logo.svg" alt="RallyStack" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800">Club not found</h1>
          <p className="text-slate-500 mt-2">Check the link and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="RallyStack" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-800">Check In</h1>
          <p className="text-slate-500 text-sm mt-1">{clubName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleCheckin} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); setMessage(""); }}
            placeholder="Enter your name..."
            className="w-full h-12 px-4 rounded-xl border border-slate-200 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            maxLength={20}
            autoFocus
          />

          {error && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          {message && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-green-50 text-green-600 text-sm">{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg disabled:opacity-50"
          >
            {loading ? "Checking in..." : "Check In →"}
          </button>
        </form>

        {/* Already checked in */}
        {recentCheckins.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">
              Currently Checked In ({recentCheckins.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {recentCheckins.map((n, i) => (
                <span key={i} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
