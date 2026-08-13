import DroppableQueue from "../dnd/DroppableQueue";
import PlayerRow from "./PlayerRow";

export default function PlayerQueue({
  kingQueue,
  knightQueue,
  squireQueue,
  courts,
  selectedCourt,
  setSelectedCourt,
  onAddToCourt,
  onRemovePlayer,
  onTogglePriority,
  onToggleNoPriority,
  onEditTier,
  onViewProfile,
}) {
  const waitingPlayers =
    kingQueue.length + knightQueue.length + squireQueue.length;

  return (
    <DroppableQueue>
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-2xl font-bold mb-4">Player Queues</h2>

        {waitingPlayers === 0 ? (
          <p>No players waiting</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* King Queue */}
            <div
              className="
                max-h-[45vh]
                lg:max-h-[55vh]
                overflow-y-auto
                rounded-xl
                border
                border-slate-200
                p-3
              "
            >
              <h3 className="text-lg font-bold text-yellow-600">
                👑 King's Queue ({kingQueue.length}/8)
              </h3>

              <p className="text-xs text-gray-500 mb-3">
                {kingQueue.length} players waiting
              </p>

              <div className="space-y-3">
                {kingQueue.map((player, index) => (
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
                  />
                ))}
              </div>
            </div>

            {/* Knight Queue */}
            <div
              className="
                max-h-[45vh]
                lg:max-h-[55vh]
                overflow-y-auto
                rounded-xl
                border
                border-slate-200
                p-3
              "
            >
              <h3 className="text-lg font-bold text-indigo-600 mb-3">
                ⚔️ Knight Queue ({knightQueue.length}/10)
              </h3>

              <p className="text-xs text-gray-500 mb-3">
                {knightQueue.length} players waiting
              </p>

              <div className="space-y-3">
                {knightQueue.map((player, index) => (
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
                  />
                ))}
              </div>
            </div>

            {/* Squire Queue */}
            <div
              className="
                max-h-[45vh]
                lg:max-h-[55vh]
                overflow-y-auto
                rounded-xl
                border
                border-slate-200
                p-3
              "
            >
              <h3 className="text-lg font-bold text-green-600 mb-3">
                🛡️ Squire Queue ({squireQueue.length}/10)
              </h3>

              <p className="text-xs text-gray-500 mb-3">
                {squireQueue.length} players waiting
              </p>

              <div className="space-y-3">
                {squireQueue.map((player, index) => (
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
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DroppableQueue>
  );
}
