import { useState, memo } from "react";
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

function PlayerRow({
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
  tapSelectedPlayer,
  onTapSelect,
  openMode = false,
  estimatedWait,
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
  const isWaitingLong = waitingMinutes >= 15 && waitingMinutes < 120;

  const isSelected = tapSelectedPlayer?.id === player.id;

  return (
    <div
      className={`rounded-xl shadow-sm overflow-hidden border transition-all ${
        isSelected ? "border-blue-400 bg-blue-50 ring-2 ring-blue-300" :
        isWaitingLong ? "border-red-300 bg-red-50" : "border-slate-100 bg-white"
      }`}
      role="listitem"
      aria-label={`${player.name}, position ${index + 1}, ${player.gamesPlayed} games played`}
    >
      {/* Compact row — always visible */}
      <div className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${isWaitingLong ? "hover:bg-red-100" : "hover:bg-slate-50"}`}>
        {/* Left side: tap to select for assignment */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0"
          onClick={() => {
            if (onTapSelect) {
              onTapSelect(isSelected ? null : player);
            } else {
              setExpanded(!expanded);
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (onTapSelect) onTapSelect(isSelected ? null : player); else setExpanded(!expanded); } }}
          aria-label={`Select ${player.name} for court assignment`}
        >
          <DraggablePlayer player={player} />
          {isSelected && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold shrink-0">TAP COURT</span>}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800 truncate">{player.name}</span>
              <span className={`text-xs font-medium ${courtLabel.color}`}>{courtLabel.label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="font-medium">{player.gamesPlayed}GP</span>
              <span className="text-green-700 font-medium">{player.wins || 0}W</span>
              <span className="text-red-600 font-medium">{player.losses || 0}L</span>
              {player.lastResult === "win" && <span className="text-green-600" aria-label="Won last game">✓</span>}
              {player.lastResult === "loss" && <span className="text-red-500" aria-label="Lost last game">✗</span>}
              {(player.currentStreak || 0) >= 3 && <span className="text-orange-500 font-bold" aria-label={`${player.currentStreak} win streak`}>🔥{player.currentStreak}</span>}
              {player.priority && <span className="text-yellow-500" aria-label="Priority player">⭐</span>}
              {player.noPriority && <span className="text-orange-500" aria-label="Not priority">🕒</span>}
              {player.pendingChallenge && <span className="text-red-500" aria-label="Has pending challenge">⚔️</span>}
            </div>
          </div>
        </div>

        {/* Right side: tap to expand profile */}
        <div
          className="flex items-center gap-1.5 shrink-0 cursor-pointer pl-2"
          onClick={() => setExpanded(!expanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${player.name} details`}
        >
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
          {estimatedWait && <span className="text-[9px] text-slate-400">~{estimatedWait}m</span>}
          <span className="text-xs text-slate-300">#{index + 1}</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded details — shown on tap */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50">
          {/* Stats */}
          <div className="flex flex-wrap gap-2 mb-3">
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

          {/* Player Notes (if any) */}
          {player.notes && (
            <div className="mb-3 px-2 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
              📝 {player.notes}
            </div>
          )}

          {/* Court assignment */}
          <div className="flex items-center gap-2 mb-3">
            <select
              value={selectedCourt[player.id] || ""}
              onChange={(e) => setSelectedCourt((prev) => ({ ...prev, [player.id]: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={`Select court for ${player.name}`}
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
                if (!courtId) return;
                onAddToCourt(player.id, courtId);
              }}
              className="h-10 px-4 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600"
              aria-label={`Assign ${player.name} to selected court`}
            >
              ➕
            </button>
          </div>

          {/* Action buttons — improved touch targets */}
          <div className="flex flex-wrap gap-2.5">
            {player.pendingChallenge && (
              <button onClick={(e) => { e.stopPropagation(); onDismissChallenge && onDismissChallenge(player); }}
                className="h-9 px-3 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                aria-label={`Accept challenge from ${player.pendingChallenge.from}`}>
                ⚔️ Accept Challenge
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onTogglePriority(player); }}
              className={`h-9 px-3 rounded-lg text-xs font-medium ${player.priority ? "bg-yellow-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              aria-label={`${player.priority ? "Remove" : "Set"} priority for ${player.name}`}
              aria-pressed={player.priority}>
              ⭐ {t("priority")}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleNoPriority(player); }}
              className={`h-9 px-3 rounded-lg text-xs font-medium ${player.noPriority ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              aria-label={`${player.noPriority ? "Remove" : "Set"} not-priority for ${player.name}`}
              aria-pressed={player.noPriority}>
              🕒 {t("not_priority")}
            </button>
            {!openMode && (
              <button onClick={(e) => { e.stopPropagation(); onEditTier(player.id); }}
                className="h-9 px-3 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label={`Change tier for ${player.name}`}>
                🔄 Tier
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onEditName(player); }}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
              aria-label={`Edit name for ${player.name}`}>
              ✏️ Name
            </button>
            <button onClick={(e) => { e.stopPropagation(); onViewProfile(player); }}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
              aria-label={`View profile for ${player.name}`}>
              👤 Profile
            </button>
            <button onClick={(e) => { e.stopPropagation(); onRemovePlayer(player.id); }}
              className="h-9 px-3 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
              aria-label={`Remove ${player.name} from queue`}>
              ✕ Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(PlayerRow);
