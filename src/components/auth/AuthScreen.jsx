import { useState, useEffect } from "react";
import { supabase } from "../../db/supabase";

const APP_VERSION = "1.8.0";

const RELEASE_NOTES = [
  { version: "1.8.0", date: "2026-08-18", changes: [
    "Player Dashboard: public page showing personal stats, ELO, match history, recent form",
    "Rest Timer / Cooldown: configurable sit-out period after playing (1-10 min)",
    "Court Availability: estimated wait time shown on Live Board for each queued player",
    "Delete Club: button in dashboard + club picker (triple confirmation required)",
    "Login flow: no more 'Set Up Your Club' flash on login",
    "Bug fixes: hooks violation, King of Court duplicates, bulk import batch detection",
  ]},
  { version: "1.7.0", date: "2026-08-18", changes: [
    "Dark Mode toggle (persists in localStorage)",
    "Multi-language: 9 languages (EN, DE, ES, FR, PT, JA, ZH, KO, Filipino)",
    "CSV Bulk Import with template download",
    "QR Code generator for Check-in and Live Board links",
    "Challenge Mode: public page for players to challenge others (singles & doubles)",
    "Doubles challenge: pick partner + 2 opponents",
    "Push Notifications: browser alerts when it's your turn",
    "Swiss System auto-pairing (matches by win rate)",
    "Round Robin smart pairing (picks unplayed matchups)",
    "Custom club URL slugs (e.g., /live/kngs instead of UUID)",
    "Slug editor in header (🔗 button)",
  ]},
  { version: "1.6.0", date: "2026-08-18", changes: [
    "6 new game modes: King of Court, Round Robin, Swiss System, Random Draw, Fixed Teams, Challenge",
    "Preview Next Match now works in all 9 modes",
    "Priority / Not Priority queue ordering fixed for all modes",
    "Player persistence rewritten (event-driven, no more disappearing players)",
    "Auto-refresh removed from operator dashboard (manual refresh button added)",
    "Mode indicator shown in dashboard header",
    "Court defaults reset when switching modes",
    "King of Court: winners stay on court after match",
  ]},
  { version: "1.5.0", date: "2026-08-17", changes: [
    "ELO/Rating system (DUPR-style)",
    "Player self check-in via public link",
    "Quick re-check-in from last session",
    "Match undo — revert last game",
    "Waiting time alert (15+ minutes highlighted)",
    "Public Live Board — mobile responsive",
  ]},
  { version: "1.4.0", date: "2026-08-17", changes: [
    "Singles (1v1) court support",
    "UI redesign — mobile-first, compact rows, bottom tabs",
    "Per-session export in all tabs",
  ]},
  { version: "1.3.0", date: "2026-08-17", changes: [
    "Multi-club auth with Supabase",
    "Live Session Board for TV/tablet display",
    "Public live board sharable link",
    "View Mode for non-operators",
  ]},
  { version: "1.2.0", date: "2026-08-17", changes: [
    "Player avatars (photo upload)",
    "Pair history warning",
    "Copy results to clipboard",
    "Edit player name (updates match history)",
  ]},
  { version: "1.1.0", date: "2026-08-17", changes: [
    "Open Mode (winners vs winners, losers vs losers)",
    "Ladder Mode (King/Knight/Squire)",
    "Extended Ladder (King/General/Knight/Squire)",
    "Auto tier assignment when switching modes",
  ]},
  { version: "1.0.0", date: "2026-08-17", changes: [
    "Initial release",
    "Court management with drag-and-drop",
    "Player queue and rotation",
    "Match history and standings",
    "Attendance tracking",
    "CSV export",
  ]},
];

const HELP_SECTIONS = [
  { title: "Getting Started", content: "Sign up with your email and create a club. Add players by typing names and selecting a tier (or no tier in Open Mode). Create courts and start games." },
  { title: "Game Modes", content: "Open: no tiers, winners vs winners. Ladder: 3-tier (King/Knight/Squire). Extended Ladder: 4-tier. King of Court: winners stay on court. Round Robin: everyone plays everyone. Swiss: paired by similar record. Random Draw: random teams each round. Fixed Teams: pre-set teams. Challenge: players challenge others." },
  { title: "Courts", content: "Add courts with + Court. Each court can be Doubles (2v2) or Singles (1v1). Set the court type in ⚙️ settings. Start Game auto-fills empty courts from the queue." },
  { title: "Live Board", content: "Share the 🔗 link with players. They can see active courts, queue position, and recent matches in real-time." },
  { title: "Self Check-in", content: "Share the 📋 check-in link. Players can add themselves to the queue without the operator typing their name." },
  { title: "ELO Rating", content: "Each player gets a skill rating (starts at 2.0, max 5.0). It updates after every match based on opponent strength. Visible in Standings and Player Profile." },
  { title: "Undo Match", content: "Made a mistake? Go to More Options → Undo Last Match. It reverts stats and removes the match from history." },
];

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "reset"
  const [infoTab, setInfoTab] = useState(null); // "about" | "notes" | "help" | null
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clubName, setClubName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Detect password reset redirect (Supabase adds #access_token to URL)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setMode("reset");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      if (!clubName.trim()) {
        setError("Please enter your club name.");
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { club_name: clubName.trim() },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Account created! You can now log in.");
        setMode("login");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KNGS Stack" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-slate-800">KNGS Stack</h1>
          <p className="text-gray-500 mt-1 text-sm">Court Session Manager</p>
        </div>

        {/* Tab switcher */}
        {mode !== "reset" && (
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setMode("login"); setError(""); setMessage(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "login" ? "bg-white shadow text-blue-600" : "text-gray-500"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); setMessage(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "signup" ? "bg-white shadow text-blue-600" : "text-gray-500"
            }`}
          >
            Sign Up
          </button>
        </div>
        )}

        {/* Password Reset Form */}
        {mode === "reset" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setMessage("");
              setLoading(true);

              const { error: updateError } = await supabase.auth.updateUser({
                password,
              });

              setLoading(false);
              if (updateError) {
                setError(updateError.message);
              } else {
                setMessage("Password updated! You can now log in.");
                setMode("login");
                setPassword("");
                // Clear the hash from URL
                window.history.replaceState(null, "", window.location.pathname);
              }
            }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-slate-700">Set New Password</h2>
              <p className="text-sm text-gray-500">Enter your new password below.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                minLength={6}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-lg">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        {/* Login / Signup Form */}
        {mode !== "reset" && (

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Club Name
              </label>
              <input
                type="text"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="e.g. RNL Pickleball Club"
                className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rnl@email.com"
              className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full h-11 px-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === "login" ? "Logging in..." : "Creating account..."
              : mode === "login" ? "Log In" : "Create Account"}
          </button>

          {mode === "login" && (
            <button
              type="button"
              onClick={async () => {
                if (!email.trim()) {
                  setError("Enter your email above first, then click Forgot Password.");
                  return;
                }
                setError("");
                setLoading(true);
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                  email.trim(),
                  { redirectTo: `${window.location.origin}` }
                );
                setLoading(false);
                if (resetError) {
                  setError(resetError.message);
                } else {
                  setMessage("Password reset email sent! Check your inbox.");
                }
              }}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              Forgot Password?
            </button>
          )}
        </form>
        )}

        {/* Info links */}
        <div className="flex justify-center gap-4 mt-6 text-xs text-slate-400">
          <button onClick={() => setInfoTab(infoTab === "about" ? null : "about")} className="hover:text-blue-600">About</button>
          <span>·</span>
          <button onClick={() => setInfoTab(infoTab === "notes" ? null : "notes")} className="hover:text-blue-600">What's New</button>
          <span>·</span>
          <button onClick={() => setInfoTab(infoTab === "help" ? null : "help")} className="hover:text-blue-600">Help</button>
        </div>

        {/* Info panel */}
        {infoTab && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-64 overflow-y-auto">
            {infoTab === "about" && (
              <div className="text-center space-y-2">
                <img src="/logo.png" alt="KNGS Stack" className="w-12 h-12 mx-auto" />
                <h3 className="font-bold text-slate-800">KNGS Stack</h3>
                <p className="text-xs text-slate-500">Version {APP_VERSION}</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Court session manager for racket sports. Manage player queues, court rotation, standings, and match history for pickleball, badminton, tennis, padel, and more.
                </p>
              </div>
            )}

            {infoTab === "notes" && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Release Notes</h3>
                {RELEASE_NOTES.map((release) => (
                  <div key={release.version} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-blue-600">v{release.version}</span>
                      <span className="text-[10px] text-slate-400">{release.date}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {release.changes.map((change, i) => (
                        <li key={i} className="text-xs text-slate-600">• {change}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {infoTab === "help" && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 text-sm">Help Guide</h3>
                {HELP_SECTIONS.map((section) => (
                  <div key={section.title} className="border-b border-slate-100 pb-2 last:border-0">
                    <h4 className="text-xs font-bold text-slate-700 mb-0.5">{section.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}


