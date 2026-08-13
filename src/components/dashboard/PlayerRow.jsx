import DraggablePlayer from "../dnd/DraggablePlayer";
import { getRelativeTime } from "../../utils/playerUtils";

function getOpenModeQueueLabel(player) {
  if (player.lastResult === "win")  return { label: "🏆 Winner Court", color: "text-blue-600" };
  if (player.lastResult === "loss") return { label: "🔄 Loser Court",  color: "text-orange-600" };
  return { label: "🆕 New Player", color: "text-gray-500" };
}

function getLadderCourtLabel(player) {
  if (player.tier === "king")    return { label: "👑 King's Court",   color: "text-yellow-600" };
  if (player.tier === "general") return { label: "🎖️ General Court", color: "text-purple-600" };
  if (player.tier === "knight")  return { label: "⚔️ Knight Court",  color: "text-indigo-600" };
  return { label: "🛡️ Squire Court", color: "text-green-600" };
}

export default function PlayerRow({
  player,
  index,
  courts,
  selectedCourt,
  setSelectedCourt,
  onAddToCourt,
  onRemovePlayer,
  onTogglePriority,
  onToggleNoPriority,
  onEditTier,
  onViewProfile,
  onEditName,
  openMode = false,
}) {
  const courtLabel = openMode
    ? getOpenModeQueueLabel(player)
    : getLadderCourtLabel(player);

  // In Open Mode filter courts by result match; in Ladder Mode filter by tier
  const availableCourts = openMode
    ? courts.filter((court) => {
        if (court.type === "any") return true;
        if (court.type === "winner") return player.lastResult === "win";
        if (court.type === "loser")  return player.lastResult === "loss";
        return true;
      })
    : courts.filter((court) => court.type === player.tier);

  function getCourtOptionLabel(court) {
    if (court.type === "king")    return `👑 King's #${court.id} (${court.players.length}/4)`;
    if (court.type === "general") return `🎖️ General #${court.id} (${court.players.length}/4)`;
    if (court.type === "knight")  return `⚔️ Knight #${court.id} (${court.players.length}/4)`;
    if (court.type === "squire")  return `🛡️ Squire #${court.id} (${court.players.length}/4)`;
    if (court.type === "winner")  return `🏆 Winner #${court.id} (${court.players.length}/4)`;
    if (court.type === "loser")   return `🔄 Loser #${court.id} (${court.players.length}/4)`;
    if (court.type === "any")     return `🏓 Open #${court.id} (${court.players.length}/4)`;
    return `Court #${court.id} (${court.players.length}/4)`;
  }

  return (
    <div
      className="
        bg-white
        border
        border-slate-200
        rounded-xl
        p-4
        mb-3
        shadow-sm
        hover:shadow-md
        transition-all
        hover:-translate-y-1
      "
    >
      <div>
        <div className="flex items-center gap-3">
          <DraggablePlayer player={player} />

          <div>
            <div className="font-semibold text-slate-800">{player.name}</div>

            <div className="text-xs mt-1">
              <div className="text-gray-400">
                {openMode ? "Queue" : "Current Court"}
              </div>
              <div className={`font-semibold ${courtLabel.color}`}>
                {courtLabel.label}
              </div>
            </div>

            <div className="text-xs text-gray-500">#{index + 1} in queue</div>

            <div className="text-xs text-blue-500 mt-1">
              ⏳ {getRelativeTime(player.waitingSince)}
            </div>
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-semibold">
            GP {player.gamesPlayed}
          </span>
          <span className="bg-green-50 text-green-600 px-2 py-1 rounded-full text-xs font-semibold">
            W {player.wins || 0}
          </span>
          <span className="bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-semibold">
            L {player.losses || 0}
          </span>
          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs font-semibold">
            👥 {Object.keys(player.partnerHistory || {}).length}
          </span>
        </div>

        {/* Secondary info row */}
        <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
          <span className="text-orange-500">
            🔥 {player.consecutiveGames || 0}
          </span>

          {player.lastResult === "win" && (
            <span className="text-green-600">✅ Won</span>
          )}
          {player.lastResult === "loss" && (
            <span className="text-red-600">❌ Lost</span>
          )}
          {!player.lastResult && (
            <span className="text-gray-500">🆕 New</span>
          )}

          {/* King Court Entries — Ladder Mode only */}
          {!openMode && (
            <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
              👑 Reached: {player.kingCourtEntries || 0}
            </span>
          )}

          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs font-semibold">
            👥 Partners: {Object.keys(player.partnerHistory || {}).length}
          </span>
        </div>

        {player.priority && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
            ⭐ PRIORITY
          </div>
        )}
        {player.noPriority && (
          <div className="text-orange-600 font-bold text-xs">🕒 LATE ARRIVAL</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 w-full md:w-auto">
        <select
          value={selectedCourt[player.id] || ""}
          onChange={(e) =>
            setSelectedCourt((prev) => ({ ...prev, [player.id]: e.target.value }))
          }
          className="
            w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-400
          "
        >
          <option value="">Select Court</option>
          {availableCourts.map((court) => (
            <option key={court.id} value={court.id}>
              {getCourtOptionLabel(court)}
            </option>
          ))}
        </select>

        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => onTogglePriority(player)}
            className={`px-2 py-1 rounded text-sm ${
              player.priority ? "bg-yellow-500 text-white" : "bg-gray-200"
            }`}
          >
            ⭐
          </button>

          <button
            onClick={() => onToggleNoPriority(player)}
            className={`
              w-9 h-9 rounded-lg flex items-center justify-center transition-all
              ${player.noPriority ? "bg-orange-500 text-white" : "bg-slate-100 hover:bg-slate-200"}
            `}
          >
            🚫
          </button>

          {/* Change Tier button — Ladder Mode only */}
          {!openMode && (
            <button
              onClick={() => onEditTier(player.id)}
              className="
                w-9 h-9 rounded-lg flex items-center justify-center
                bg-yellow-500 text-white hover:bg-yellow-600
              "
              title="Change Tier"
            >
              🔄
            </button>
          )}

          <button
            onClick={() => onEditName(player)}
            className="
              w-9 h-9 rounded-lg flex items-center justify-center
              bg-slate-500 text-white hover:bg-slate-600
            "
            title="Edit Name"
          >
            ✏️
          </button>

          <button
            onClick={() => onViewProfile(player)}
            className="
              w-9 h-9 rounded-lg flex items-center justify-center
              bg-blue-500 text-white hover:bg-blue-600
            "
            title="View Profile"
          >
            👤
          </button>

          <button
            onClick={() => {
              const courtId = selectedCourt[player.id];
              if (!courtId) {
                alert("Please select a court first.");
                return;
              }
              onAddToCourt(player.id, courtId);
            }}
            className="
              w-9 h-9 rounded-lg flex items-center justify-center
              bg-green-500 text-white hover:bg-green-600
            "
          >
            ➕
          </button>

          <button
            onClick={() => onRemovePlayer(player.id)}
            className="
              w-9 h-9 rounded-lg flex items-center justify-center
              bg-red-500 text-white hover:bg-red-600
            "
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
