import { useState } from "react";
import { supabase } from "../../db/supabase";

export default function ClubSetupScreen({ user, onClubCreated }) {
  const [clubName, setClubName] = useState(
    user?.user_metadata?.club_name || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = clubName.trim();
    if (!trimmed) { setError("Please enter a club name."); return; }

    setLoading(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("clubs")
      .insert({ name: trimmed, owner_id: user.id })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onClubCreated(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏓</div>
          <h1 className="text-2xl font-bold text-slate-800">Set Up Your Club</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Give your club a name to get started. You can change this later.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
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
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Club →"}
          </button>
        </form>

      </div>
    </div>
  );
}
