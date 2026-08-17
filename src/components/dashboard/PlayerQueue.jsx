import DroppableQueue from "../dnd/DroppableQueue";
import PlayerRow from "./PlayerRow";

function TierColumn({ title, colorClass, count, limit, players, ...sharedProps }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={`px-3 py-2 border-b border-slate-100 flex items-center justify-between`}>
        <span className={`text-sm font-bold ${colorClass}`}>{title}</span>
        <span className="text-xs text-slate-400">{count}{limit ? `/${limit}` : ""}</span>
      </div>
      <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1.5">
        {players.length === 0 ? (
          <p className="text-xs text-slate-300 text-center py-6">Empty</p>
        ) : (
          players.map((player, index) => (
            <PlayerRow key={player.id} player={player} index={index} {...sharedProps} />
          ))
        )}
      </div>
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
}) {
  const sharedProps = { courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier, onViewProfile, onEditName };

  return (
    <DroppableQueue>
      <div className={`grid grid-cols-1 gap-3 ${isExtendedMode ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <TierColumn title="👑 King" colorClass="text-yellow-600" count={kingQueue.length} limit={8} players={kingQueue} {...sharedProps} />
        {isExtendedMode && (
          <TierColumn title="🎖️ General" colorClass="text-purple-600" count={generalQueue.length} limit={10} players={generalQueue} {...sharedProps} />
        )}
        <TierColumn title="⚔️ Knight" colorClass="text-indigo-600" count={knightQueue.length} limit={10} players={knightQueue} {...sharedProps} />
        <TierColumn title="🛡️ Squire" colorClass="text-green-600" count={squireQueue.length} limit={isExtendedMode ? 8 : 10} players={squireQueue} {...sharedProps} />
      </div>
    </DroppableQueue>
  );
}
