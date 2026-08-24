import DroppableQueue from "../dnd/DroppableQueue";
import PlayerRow from "./PlayerRow";
import { useState } from "react";

function TierColumn({ title, colorClass, count, limit, players, estimatedWait, ...sharedProps }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div
        className="px-3 py-2 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 sm:cursor-default"
        onClick={() => setCollapsed((prev) => !prev)}
        role="button"
        aria-expanded={!collapsed}
        aria-label={`${title} queue, ${count} players`}
      >
        <span className={`text-sm font-bold ${colorClass}`}>{title}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">{count}{limit ? `/${limit}` : ""}</span>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform sm:hidden ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {!collapsed && (
        <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1.5" role="list" aria-label={`${title} player list`}>
          {players.length === 0 ? (
            <p className="text-xs text-slate-300 text-center py-6">No players yet — check in players to begin</p>
          ) : (
            players.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                index={index}
                {...sharedProps}
                estimatedWait={estimatedWait ? Math.round(estimatedWait * (index + 1) / 4) : null}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function PlayerQueue({
  kingQueue,
  knightQueue,
  squireQueue,
  generalQueue = [],
  isExtendedMode = false,
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
  estimatedWait,
}) {
  const sharedProps = { courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier, onViewProfile, onEditName, onDismissChallenge, tapSelectedPlayer, onTapSelect };

  return (
    <DroppableQueue>
      <div className={`grid grid-cols-1 gap-3 ${isExtendedMode ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <TierColumn title="👑 King" colorClass="text-yellow-600" count={kingQueue.length} limit={8} players={kingQueue} estimatedWait={estimatedWait} {...sharedProps} />
        {isExtendedMode && (
          <TierColumn title="🎖️ General" colorClass="text-purple-600" count={generalQueue.length} limit={10} players={generalQueue} estimatedWait={estimatedWait} {...sharedProps} />
        )}
        <TierColumn title="⚔️ Knight" colorClass="text-indigo-600" count={knightQueue.length} limit={10} players={knightQueue} estimatedWait={estimatedWait} {...sharedProps} />
        <TierColumn title="🛡️ Squire" colorClass="text-green-600" count={squireQueue.length} limit={10} players={squireQueue} estimatedWait={estimatedWait} {...sharedProps} />
      </div>
    </DroppableQueue>
  );
}
