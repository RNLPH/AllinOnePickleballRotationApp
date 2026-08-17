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

const TIER_LIMITS_MAP = {
  ladder:          { king: 8, knight: 10, squire: 10 },
  extended_ladder: { king: 8, general: 10, knight: 10, squire: 8 },
};

export default function TierAssignmentPreviewModal({
  assignments,
  targetMode,
  onConfirm,
  onCancel,
}) {
  const groups = assignments.reduce((acc, { player, tier }) => {
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(player);
    return acc;
  }, {});

  const tierOrder = targetMode === "extended_ladder"
    ? ["king", "general", "knight", "squire"]
    : ["king", "knight", "squire"];

  const limits = TIER_LIMITS_MAP[targetMode] || TIER_LIMITS_MAP.ladder;
  const totalCapacity = Object.values(limits).reduce((a, b) => a + b, 0);
  const totalPlayers = assignments.length;
  const hasOverflow = totalPlayers > totalCapacity;

  // Check per-tier overflow
  const tierOverflows = tierOrder.reduce((acc, tier) => {
    const count = (groups[tier] || []).length;
    const limit = limits[tier] || 0;
    if (count > limit) acc[tier] = count - limit;
    return acc;
  }, {});

  const hasAnyTierOverflow = Object.keys(tierOverflows).length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            {targetMode === "extended_ladder" ? "🏅 Extended Ladder" : "👑 Ladder"} — Tier Assignment
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Players ranked by win rate from Open Mode standings. Confirm to apply.
          </p>
        </div>

        {/* Overflow Warning */}
        {(hasOverflow || hasAnyTierOverflow) && (
          <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-sm">
            <div className="font-bold text-amber-700 mb-1">⚠️ Player Overflow</div>
            {hasOverflow && (
              <p className="text-amber-600">
                You have <strong>{totalPlayers}</strong> players but the mode only supports{" "}
                <strong>{totalCapacity}</strong> total slots (
                {tierOrder.map((t) => `${TIER_LABELS[t].split(" ")[1]}: ${limits[t]}`).join(", ")}
                ). Extra players overflow into Squire.
              </p>
            )}
            {hasAnyTierOverflow && !hasOverflow && (
              <p className="text-amber-600">
                Some tiers are over capacity:{" "}
                {Object.entries(tierOverflows)
                  .map(([tier, over]) => `${TIER_LABELS[tier]} has ${over} extra`)
                  .join(", ")}
                .
              </p>
            )}
          </div>
        )}

        {/* Tier groups */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          {tierOrder.map((tier) => {
            const tieredPlayers = groups[tier] || [];
            if (tieredPlayers.length === 0) return null;
            const isOverLimit = tieredPlayers.length > (limits[tier] || 0);
            return (
              <div key={tier}>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border mb-2 ${TIER_COLORS[tier]}`}>
                  {TIER_LABELS[tier]}
                  <span className="opacity-60 font-normal">
                    ({tieredPlayers.length}/{limits[tier]})
                  </span>
                  {isOverLimit && (
                    <span className="text-red-600 ml-1">⚠️</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tieredPlayers.map((player) => {
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
        <div className="p-4 sm:p-6 border-t flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm sm:text-base"
          >
            ✅ Apply Tiers & Switch Mode
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-semibold text-sm sm:text-base"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}


