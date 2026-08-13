const TIER_COLORS = {
  king:    "bg-yellow-100 text-yellow-800 border-yellow-300",
  general: "bg-purple-100 text-purple-800 border-purple-300",
  knight:  "bg-indigo-100 text-indigo-800 border-indigo-300",
  squire:  "bg-green-100  text-green-800  border-green-300",
};

const TIER_LABELS = {
  king:    "👑 King",
  general: "🎖️ General",
  knight:  "⚔️ Knight",
  squire:  "🛡️ Squire",
};

export default function TierAssignmentPreviewModal({
  assignments,   // [{ player, tier }]
  targetMode,    // "ladder" | "extended_ladder"
  onConfirm,
  onCancel,
}) {
  // Group by tier for display
  const groups = assignments.reduce((acc, { player, tier }) => {
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(player);
    return acc;
  }, {});

  const tierOrder = targetMode === "extended_ladder"
    ? ["king", "general", "knight", "squire"]
    : ["king", "knight", "squire"];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">
            {targetMode === "extended_ladder" ? "🏅 Extended Ladder" : "👑 Ladder"} — Tier Assignment
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Players ranked by win rate from Open Mode standings. Confirm to apply.
          </p>
        </div>

        {/* Tier groups */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {tierOrder.map((tier) => {
            const tieredPlayers = groups[tier] || [];
            if (tieredPlayers.length === 0) return null;
            return (
              <div key={tier}>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border mb-2 ${TIER_COLORS[tier]}`}>
                  {TIER_LABELS[tier]}
                  <span className="opacity-60 font-normal">({tieredPlayers.length} players)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {tieredPlayers.map((player, i) => {
                    const winRate = player.gamesPlayed > 0
                      ? Math.round((player.wins / player.gamesPlayed) * 100)
                      : 0;
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-slate-700 truncate">
                          {player.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">
                          {player.wins}W {player.losses}L {winRate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold"
          >
            ✅ Apply Tiers & Switch Mode
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-semibold"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
