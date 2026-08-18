import { useState } from "react";
import { supabase } from "../../db/supabase";

export default function ClubPickerScreen({ user, clubs, onSelectClub, onCreateClub, onRefresh }) {
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  const handleDeleteClub = async (membership) => {
    const clubName = membership.club.name;
    if (!window.confirm(`Delete "${clubName}" permanently? This will delete ALL data. This cannot be undone.`)) return;
    const typed = window.prompt(`Type "${clubName}" to confirm:`);
    if (typed !== clubName) { alert("Club name didn't match. Cancelled."); return; }

    const clubId = membership.club_id;
    await supabase.from("players").delete().eq("club_id", clubId);
    await supabase.from("directory").delete().eq("club_id", clubId);
    await supabase.from("matches").delete().eq("club_id", clubId);
    await supabase.from("attendance").delete().eq("club_id", clubId);
    await supabase.from("standings_history").delete().eq("club_id", clubId);
    await supabase.from("courts").delete().eq("club_id", clubId);
    await supabase.from("club_members").delete().eq("club_id", clubId);
    await supabase.from("clubs").delete().eq("id", clubId);

    localStorage.removeItem("kngsstack_active_club");
    alert("Club deleted.");
    onRefresh();
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = joinCode.trim().toLowerCase();
    if (!code) { setError("Enter an invite code."); return; }

    setJoining(true);
    setError("");

    // Find club by invite code
    const { data: club, error: findError } = await supabase
      .from("clubs")
      .select("id, name")
      .eq("invite_code", code)
      .single();

    if (findError || !club) {
      setError("Invalid invite code. Check with your club owner.");
      setJoining(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("club_members")
      .select("id")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      setError("You're already a member of this club.");
      setJoining(false);
      return;
    }

    // Join the club
    const { error: joinError } = await supabase
      .from("club_members")
      .insert({ club_id: club.id, user_id: user.id, role: "member" });

    if (joinError) {
      setError("Failed to join. Try again.");
      setJoining(false);
      return;
    }

    setJoinCode("");
    setShowJoin(false);
    setJoining(false);
    onRefresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-800">Your Clubs</h1>
          <p className="text-slate-500 text-sm mt-1">Select a club to manage</p>
        </div>

        {/* Club list */}
        <div className="space-y-2 mb-4">
          {clubs.map((membership) => (
            <div
              key={membership.club_id}
              className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-200 transition-all"
            >
              <button
                onClick={() => onSelectClub(membership.club)}
                className="flex-1 flex items-center justify-between p-4 hover:bg-blue-50 text-left"
              >
                <div>
                  <div className="font-semibold text-slate-800">{membership.club.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {membership.role === "owner" ? "👑 Owner" : "👤 Member"}
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {membership.role === "owner" && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteClub(membership); }}
                  className="px-3 h-full text-red-400 hover:text-red-600 hover:bg-red-50 border-l border-slate-100"
                  title="Delete club"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}

          {clubs.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
              You're not a member of any club yet.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onCreateClub}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
          >
            + Create New Club
          </button>

          {!showJoin ? (
            <button
              onClick={() => setShowJoin(true)}
              className="w-full h-11 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-all"
            >
              🔗 Join with Invite Code
            </button>
          ) : (
            <form onSubmit={handleJoin} className="bg-white border border-slate-200 rounded-xl p-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Invite Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value); setError(""); }}
                  placeholder="e.g. a1b2c3d4"
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={joining}
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {joining ? "..." : "Join"}
                </button>
              </div>
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              <button
                type="button"
                onClick={() => { setShowJoin(false); setError(""); }}
                className="text-xs text-slate-400 mt-2 hover:text-slate-600"
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); window.location.href = "/"; }}
          className="w-full mt-4 text-xs text-slate-400 hover:text-slate-600"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
