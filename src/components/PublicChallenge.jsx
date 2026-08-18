import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../db/supabase";
import { resolveClub } from "../db/clubResolver";

export default function PublicChallenge() {
  const { clubId: identifier } = useParams();
  const [clubId, setClubId] = useState(null);
  const [clubName, setClubName] = useState("Loading...");
  const [players, setPlayers] = useState([]);
  const [challenger, setChallenger] = useState("");
  const [challengeType, setChallengeType] = useState("singles"); // "singles" | "doubles"
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedOpponents, setSelectedOpponents] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const maxOpponents = challengeType === "singles" ? 1 : 2;

  useEffect(() => {
    const load = async () => {
      const club = await resolveClub(identifier);
      if (!club) { setNotFound(true); return; }
      setClubId(club.id);
      setClubName(club.name);

      const { data: queuePlayers } = await supabase
        .from("players").select("id, name, data").eq("club_id", club.id);
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
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [identifier]);

  const handleChallenge = async () => {
    if (!clubId) return;
    if (!challenger.trim()) { setError("Enter your name first."); return; }
    if (selectedOpponents.length < maxOpponents) {
      setError(challengeType === "singles" ? "Select an opponent." : "Select 2 opponents.");
      return;
    }
    if (challengeType === "doubles" && !selectedPartner) {
      setError("Select your partner for doubles.");
      return;
    }

    // Find challenger in queue
    const challengerPlayer = players.find(
      (p) => p.name.toLowerCase() === challenger.trim().toLowerCase()
    );
    if (!challengerPlayer) {
      setError("You need to be checked in first. Use the Check-in page.");
      return;
    }

    // Validate no self-selection
    const allSelected = [...selectedOpponents, selectedPartner].filter(Boolean);
    if (allSelected.some((p) => p.id === challengerPlayer.id)) {
      setError("You can't select yourself!");
      return;
    }

    // For doubles, mark both opponents with the challenge
    const challengeInfo = {
      from: challengerPlayer.name,
      fromId: challengerPlayer.id,
      type: challengeType,
      partner: selectedPartner?.name || null,
      opponents: selectedOpponents.map((o) => o.name),
      time: Date.now(),
    };

    // Update the first opponent (operator sees this)
    const primaryOpponent = selectedOpponents[0];
    const { data: opponentRow } = await supabase
      .from("players")
      .select("data")
      .eq("id", primaryOpponent.id)
      .eq("club_id", clubId)
      .single();

    const existingData = opponentRow?.data || {};
    const { error: updateError } = await supabase
      .from("players")
      .update({
        data: {
          ...existingData,
          pendingChallenge: challengeInfo,
        },
      })
      .eq("id", primaryOpponent.id)
      .eq("club_id", clubId);

    if (updateError) {
      setError("Failed to send challenge. Try again.");
      return;
    }

    // For doubles, also mark the second opponent
    if (challengeType === "doubles" && selectedOpponents[1]) {
      const { data: opp2Row } = await supabase
        .from("players")
        .select("data")
        .eq("id", selectedOpponents[1].id)
        .eq("club_id", clubId)
        .single();

      const existingData2 = opp2Row?.data || {};
      await supabase
        .from("players")
        .update({
          data: { ...existingData2, pendingChallenge: challengeInfo },
        })
        .eq("id", selectedOpponents[1].id)
        .eq("club_id", clubId);
    }

    const teamLabel = challengeType === "doubles"
      ? `${challenger.trim()} & ${selectedPartner.name}`
      : challenger.trim();
    const opponentLabel = selectedOpponents.map((o) => o.name).join(" & ");
    setMessage(`⚔️ ${teamLabel} challenged ${opponentLabel}! The operator will set up your match.`);
    setSelectedOpponents([]);
    setSelectedPartner(null);
    setError("");
  };

  const toggleOpponent = (p) => {
    if (selectedOpponents.some((o) => o.id === p.id)) {
      setSelectedOpponents((prev) => prev.filter((o) => o.id !== p.id));
    } else if (selectedOpponents.length < maxOpponents) {
      setSelectedOpponents((prev) => [...prev, p]);
    }
  };

  // Filter out self and already-selected players
  const otherPlayers = players.filter(
    (p) => p.name.toLowerCase() !== challenger.trim().toLowerCase()
  );
  const partnerCandidates = otherPlayers.filter(
    (p) => !selectedOpponents.some((o) => o.id === p.id)
  );
  const opponentCandidates = otherPlayers.filter(
    (p) => selectedPartner?.id !== p.id
  );

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

        {/* Challenge Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setChallengeType("singles"); setSelectedPartner(null); setSelectedOpponents([]); }}
            className={`flex-1 h-10 rounded-xl text-sm font-medium transition ${
              challengeType === "singles"
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            🏓 Singles (1v1)
          </button>
          <button
            onClick={() => { setChallengeType("doubles"); setSelectedOpponents([]); }}
            className={`flex-1 h-10 rounded-xl text-sm font-medium transition ${
              challengeType === "doubles"
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            👥 Doubles (2v2)
          </button>
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

        {/* Partner selection (doubles only) */}
        {challengeType === "doubles" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Select Your Partner
            </h3>
            {partnerCandidates.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">No players available.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {partnerCandidates.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartner(selectedPartner?.id === p.id ? null : p)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                      selectedPartner?.id === p.id
                        ? "bg-green-50 border-2 border-green-400"
                        : "hover:bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-700">{p.name}</div>
                      <div className="text-[11px] text-slate-400">⭐ {p.rating?.toFixed(1)}</div>
                    </div>
                    {selectedPartner?.id === p.id && <span className="text-green-600 text-sm">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Opponent selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Select Opponent{challengeType === "doubles" ? "s (2)" : ""} ({opponentCandidates.length} available)
          </h3>

          {opponentCandidates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No players in queue yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {opponentCandidates.map((p) => {
                const isSelected = selectedOpponents.some((o) => o.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleOpponent(p)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
                      isSelected
                        ? "bg-red-50 border-2 border-red-400"
                        : "hover:bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-700">{p.name}</div>
                      <div className="text-[11px] text-slate-400">
                        ⭐ {p.rating?.toFixed(1)} · {p.wins}W / {p.losses}L
                      </div>
                    </div>
                    {isSelected && <span className="text-red-600 text-sm">✓</span>}
                  </button>
                );
              })}
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

        {/* Summary + Challenge button */}
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-2 text-center">
            {challengeType === "doubles" ? (
              <>
                <span className="font-medium text-green-700">
                  {challenger.trim() || "You"}{selectedPartner ? ` & ${selectedPartner.name}` : " & ?"}
                </span>
                {" vs "}
                <span className="font-medium text-red-700">
                  {selectedOpponents.length > 0 ? selectedOpponents.map((o) => o.name).join(" & ") : "? & ?"}
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-green-700">{challenger.trim() || "You"}</span>
                {" vs "}
                <span className="font-medium text-red-700">{selectedOpponents[0]?.name || "?"}</span>
              </>
            )}
          </div>
          <button
            onClick={handleChallenge}
            disabled={
              selectedOpponents.length < maxOpponents ||
              !challenger.trim() ||
              (challengeType === "doubles" && !selectedPartner)
            }
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-lg disabled:opacity-50"
          >
            ⚔️ {challengeType === "doubles" ? "Doubles Challenge" : "Challenge"}
          </button>
        </div>
      </div>
    </div>
  );
}
