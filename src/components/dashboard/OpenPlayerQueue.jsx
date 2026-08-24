import { useState } from "react";
import DroppableQueue from "../dnd/DroppableQueue";
import PlayerRow from "./PlayerRow";

function QueueSection({ title, colorClass, players, courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier, onViewProfile, onEditName, onDismissChallenge, tapSelectedPlayer, onTapSelect, estimatedWait }) {
  const [collapsed, setCollapsed] = useState(false);

  // Hide empty sections on mobile
  if (players.length === 0) {
    return (
      <div className="hidden sm:block bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
          <span className={`text-sm font-bold ${colorClass}`}>{title}</span>
          <span className="text-xs text-slate-400">0</span>
        </div>
        <p className="text-xs text-slate-300 text-center py-4">No players yet — check in players to begin</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div
        className="px-3 py-2 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 sm:cursor-default"
        onClick={() => setCollapsed((prev) => !prev)}
        role="button"
        aria-expanded={!collapsed}
        aria-label={`${title} queue, ${players.length} players`}
      >
        <span className={`text-sm font-bold ${colorClass}`}>{title}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500">{players.length}</span>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform sm:hidden ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {!collapsed && (
        <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1.5" role="list" aria-label={`${title} player list`}>
          {players.map((player, index) => (
            <PlayerRow
              key={player.id}
              player={player}
              index={index}
              courts={courts}
              selectedCourt={selectedCourt}
              setSelectedCourt={setSelectedCourt}
              onAddToCourt={onAddToCourt}
              onRemovePlayer={onRemovePlayer}
              onTogglePriority={onTogglePriority}
              onToggleNoPriority={onToggleNoPriority}
              onEditTier={onEditTier}
              onViewProfile={onViewProfile}
              onEditName={onEditName}
              onDismissChallenge={onDismissChallenge}
              tapSelectedPlayer={tapSelectedPlayer}
              onTapSelect={onTapSelect}
              openMode
              estimatedWait={estimatedWait ? Math.round(estimatedWait * (index + 1) / 4) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OpenPlayerQueue({
  winnerQueue,
  loserQueue,
  newQueue,
  courts,
  selectedCourt,
  setSelectedCourt,
  onAddToCourt,
  onRemovePlayer,
  onTogglePriority,
  onToggleNoPriority,
  onViewProfile,
  onEditName,
  onDismissChallenge,
  tapSelectedPlayer,
  onTapSelect,
  estimatedWait,
}) {
  const sharedProps = { courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier: () => {}, onViewProfile, onEditName, onDismissChallenge, tapSelectedPlayer, onTapSelect, estimatedWait };

  return (
    <DroppableQueue>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <QueueSection title="🏆 Winners" colorClass="text-blue-600" players={winnerQueue} {...sharedProps} />
        <QueueSection title="🔄 Losers" colorClass="text-orange-600" players={loserQueue} {...sharedProps} />
        <QueueSection title="🆕 New" colorClass="text-slate-600" players={newQueue} {...sharedProps} />
      </div>
    </DroppableQueue>
  );
}
