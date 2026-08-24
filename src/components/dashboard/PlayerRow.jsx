import { useState } from "react";
import DraggablePlayer from "../dnd/DraggablePlayer";
import { getRelativeTime } from "../../utils/playerUtils";
import { useI18n } from "../../i18n/index.jsx";

function getOpenModeQueueLabel(player) {
  if (player.lastResult === "win")  return { label: "Winner", color: "text-blue-600" };
  if (player.lastResult === "loss") return { label: "Loser",  color: "text-orange-600" };
  return { label: "New", color: "text-gray-500" };
}

function getLadderCourtLabel(player) {
  if (player.tier === "king")    return { label: "King",    color: "text-yellow-600" };
  if (player.tier === "general") return { label: "General", color: "text-purple-600" };
  if (player.tier === "knight")  return { label: "Knight",  color: "text-indigo-600" };
  return { label: "Squire", color: "text-green-600" };
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
  onDismissChallenge,
  openMode = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  const courtLabel = openMode ? getOpenModeQueueLabel(player) : getLadderCourtLabel(player);

  const availableCourts = openMode
    ? courts.filter((court) => {
        if (court.type === "any") return true;
        if (court.type === "winner") return player.lastResult === "win";
        if (court.type === "loser")  return player.lastResult === "loss";
        return true;
      })
    : courts.filter((court) => court.type === player.tier);

  function getCourtOptionLabel(court) {
    if (court.type === "king")    return `King #${court.id}`;
    if (court.type === "general") return `General #${court.id}`;
    if (court.type === "knight")  return `Knight #${court.id}`;
    if (court.type === "squire")  return `Squire #${court.id}`;
    if (court.type === "winner")  return `Winner #${court.id}`;
    if (court.type === "loser")   return `Loser #${court.id}`;
    if (court.type === "any")     return `Open #${court.id}`;
    return `Court #${court.id}`;
  }

  const rawMinutes = player.waitingSince
    ? Math.floor((Date.now() - player.waitingSince) / 60000)
    : 0;
  const waitingMinutes = rawMinutes;
  const isWaitingLong = waitingMinutes >= 15 && waitingMinutes < 120; // Only flag 15-120min as "long"

  return (
    <div className={`rounded-xl shadow-sm overflow-hidden border ${isWaitingLong ? "border-red-300 bg-red-50" : "border-slate-100 bg-white"}`}>
      {/* Compact row — always visible */}
      <div
        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isWaitingLong ? "hover:bg-red-100" : "hover:bg-slate-50"}`}
        onClick={() => setExpanded(!expanded)}
      >
        <DraggablePlayer player={player} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800 truncate">{player.name}</span>
            <span className={`text-xs font-medium ${courtLabel.color}`}>{courtLabel.label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span className="font-medium">{player.gamesPlayed}GP</span>
            <span className="text-green-700 font-medium">{player.wins || 0}W</span>
            <span className="text-red-600 font-medium">{player.losses || 0}L</span>
            {player.lastResult === "win" && <span className="text-green-600">✓</span>}
            {player.lastResult === "loss" && <span className="text-red-500">✗</span>}
            {player.priority && <span className="text-yellow-500">⭐</span>}
            {player.noPriority && <span className="text-orange-500">🕒</span>}
            {player.pendingChallenge && <span className="text-red-500">⚔️</span>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {player.cooldownUntil && Date.now() < player.cooldownUntil && (
            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
              😴 Rest {Math.ceil((player.cooldownUntil - Date.now()) / 60000)}m
            </span>
          )}
          {player.pendingChallenge && (
            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
              vs {player.pendingChallenge.from}
            </span>
          )}
          {isWaitingLong && <span className="text-[10px] text-red-500 font-bold">{waitingMinutes}m</span>}
          {waitingMinutes >= 120 && <span className="text-[10px] text-slate-400">{Math.floor(waitingMinutes / 60)}h</span>}
          <span className="text-xs text-slate-300">#{index + 1}</span>
        </div>

        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded details — shown on tap */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50">
          {/* Stats */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
              GP {player.gamesPlayed}
            </span>
            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
              W {player.wins || 0}
            </span>
            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
              L {player.losses || 0}
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
              👥 {Object.keys(player.partnerHistory || {}).length}
            </span>
            {!openMode && (
              <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">
                👑 {player.kingCourtEntries || 0}
              </span>
            )}
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">
              ⏳ {getRelativeTime(player.waitingSince)}
            </span>
          </div>

          {/* Court assignment */}
          <div className="flex items-center gap-2 mb-3">
            <select
              value={selectedCourt[player.id] || ""}
              onChange={(e) => setSelectedCourt((prev) => ({ ...prev, [player.id]: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Assign to court...</option>
              {availableCourts.map((court) => (
                <option key={court.id} value={court.id}>{getCourtOptionLabel(court)}</option>
              ))}
            </select>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const courtId = selectedCourt[player.id];
                if (!courtId) { alert("Select a court first."); return; }
                onAddToCourt(player.id, courtId);
              }}
              className="h-9 px-3 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600"
            >
              ➕
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5">
            {player.pendingChallenge && (
              <button onClick={(e) => { e.stopPropagation(); onDismissChallenge && onDismissChallenge(player); }}
                className="h-8 px-2.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">
                ⚔️ Accept Challenge (vs {player.pendingChallenge.from})
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onTogglePriority(player); }}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium ${player.priority ? "bg-yellow-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              ⭐ {t("priority")}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleNoPriority(player); }}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium ${player.noPriority ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              🕒 {t("not_priority")}
            </button>
            {!openMode && (
              <button onClick={(e) => { e.stopPropagation(); onEditTier(player.id); }}
                className="h-8 px-2.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">
                🔄 Tier
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onEditName(player); }}
              className="h-8 px-2.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">
              ✏️ Name
            </button>
            <button onClick={(e) => { e.stopPropagation(); onViewProfile(player); }}
              className="h-8 px-2.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">
              👤 Profile
            </button>
            <button onClick={(e) => { e.stopPropagation(); onRemovePlayer(player.id); }}
              className="h-8 px-2.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
              ✕ Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


