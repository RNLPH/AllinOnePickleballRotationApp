import DroppableQueue from "../dnd/DroppableQueue";
import PlayerRow from "./PlayerRow";

function QueueSection({ title, colorClass, players, courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier, onViewProfile, onEditName }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
        <span className={`text-sm font-bold ${colorClass}`}>{title}</span>
        <span className="text-xs text-slate-400">{players.length}</span>
      </div>
      <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1.5">
        {players.length === 0 ? (
          <p className="text-xs text-slate-300 text-center py-6">Empty</p>
        ) : (
          players.map((player, index) => (
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
              openMode
            />
          ))
        )}
      </div>
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
}) {
  const sharedProps = { courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier: () => {}, onViewProfile, onEditName };

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
