import DroppableQueue from "../dnd/DroppableQueue";
import PlayerRow from "./PlayerRow";

function TierColumn({ title, colorClass, players, courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier, onViewProfile, onEditName }) {
  return (
    <div className="max-h-[45vh] lg:max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200 p-3">
      <h3 className={`text-lg font-bold mb-1 ${colorClass}`}>
        {title} ({players.length})
      </h3>
      <p className="text-xs text-gray-500 mb-3">{players.length} players waiting</p>
      <div className="space-y-3">
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
          />
        ))}
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
  const totalWaiting =
    kingQueue.length + knightQueue.length + squireQueue.length +
    (isExtendedMode ? generalQueue.length : 0);

  const sharedProps = { courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier, onViewProfile, onEditName };

  return (
    <DroppableQueue>
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-2xl font-bold mb-4">Player Queues</h2>

        {totalWaiting === 0 ? (
          <p>No players waiting</p>
        ) : (
          <div className={`grid grid-cols-1 gap-4 ${isExtendedMode ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <TierColumn
              title="👑 King's Queue"
              colorClass="text-yellow-600"
              players={kingQueue}
              {...sharedProps}
            />

            {isExtendedMode && (
              <TierColumn
                title="🎖️ General Queue"
                colorClass="text-purple-600"
                players={generalQueue}
                {...sharedProps}
              />
            )}

            <TierColumn
              title="⚔️ Knight Queue"
              colorClass="text-indigo-600"
              players={knightQueue}
              {...sharedProps}
            />

            <TierColumn
              title="🛡️ Squire Queue"
              colorClass="text-green-600"
              players={squireQueue}
              {...sharedProps}
            />
          </div>
        )}
      </div>
    </DroppableQueue>
  );
}
