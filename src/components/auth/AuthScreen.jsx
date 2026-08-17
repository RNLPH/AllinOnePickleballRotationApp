import { useState, useEffect } from "react";
import { supabase } from "../../db/supabase";

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "reset"
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
          <img src="/logo.svg" alt="RallyStack" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-slate-800">RallyStack</h1>
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
                placeholder="e.g. Eastside Pickleball Club"
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
              placeholder="you@email.com"
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

      </div>
    </div>
  );
}
