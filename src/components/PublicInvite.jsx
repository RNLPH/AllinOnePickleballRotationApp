import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../db/supabase";

export default function PublicInvite() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      // Find the club by invite code
      const { data: clubData } = await supabase
        .from("clubs")
        .select("id, name")
        .eq("invite_code", inviteCode)
        .single();

      if (!clubData) {
        setNotFound(true);
      } else {
        setClub(clubData);
      }
      setLoading(false);
    };

    init();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!user || !club) return;
    setJoining(true);
    setError("");

    // Check if already a member
    const { data: existing } = await supabase
      .from("club_members")
      .select("id")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      setSuccess(true);
      setJoining(false);
      return;
    }

    // Join
    const { error: joinError } = await supabase
      .from("club_members")
      .insert({ club_id: club.id, user_id: user.id, role: "member" });

    if (joinError) {
      setError("Failed to join. Try again.");
      setJoining(false);
      return;
    }

    setSuccess(true);
    setJoining(false);
    // Set as active club
    localStorage.setItem("kngsstack_active_club", club.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="" className="w-12 h-12 mx-auto mb-4" />
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800">Invalid Invite</h1>
          <p className="text-slate-500 mt-2 text-sm">This invite link is expired or invalid.</p>
          <a href="/" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">
            Go to App
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-slate-800">You're in!</h1>
          <p className="text-slate-500 mt-2 text-sm">
            You've joined <strong>{club.name}</strong>
          </p>
          <a href="/" className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            Open App →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-4" />

          <h1 className="text-xl font-bold text-slate-800">You're Invited!</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Join <strong className="text-slate-800">{club.name}</strong> on KNGS Stack
          </p>

          {error && (
            <div className="mt-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          {user ? (
            /* Logged in — show accept button */
            <div className="mt-6">
              <p className="text-xs text-slate-400 mb-3">
                Logged in as {user.email}
              </p>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {joining ? "Joining..." : "✅ Accept Invite"}
              </button>
            </div>
          ) : (
            /* Not logged in — show sign up / log in options */
            <div className="mt-6 space-y-3">
              <p className="text-xs text-slate-400">
                Create an account or log in to join this club
              </p>
              <a
                href={`/?invite=${inviteCode}`}
                className="block w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center"
              >
                Sign Up / Log In
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
