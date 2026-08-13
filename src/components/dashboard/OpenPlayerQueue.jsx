import DroppableQueue from "../dnd/DroppableQueue";
import PlayerRow from "./PlayerRow";

function QueueSection({ title, emoji, players, colorClass, badgeClass, courts, selectedCourt, setSelectedCourt, onAddToCourt, onRemovePlayer, onTogglePriority, onToggleNoPriority, onEditTier, onViewProfile, onEditName }) {
  return (
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
      <h3 className={`text-lg font-bold mb-1 ${colorClass}`}>
        {emoji} {title} ({players.length})
      </h3>
      <p className="text-xs text-gray-500 mb-3">{players.length} players waiting</p>

      {players.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No players here yet</p>
      ) : (
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
              openMode
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
}) {
  const totalWaiting = winnerQueue.length + loserQueue.length + newQueue.length;

  return (
    <DroppableQueue>
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-2xl font-bold mb-1">Player Queues</h2>
        <p className="text-xs text-gray-400 mb-4">🏓 Open Mode — Winners vs Winners · Losers vs Losers</p>

        {totalWaiting === 0 ? (
          <p>No players waiting</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <QueueSection
              title="Winner Queue"
              emoji="🏆"
              players={winnerQueue}
              colorClass="text-blue-600"
              courts={courts}
              selectedCourt={selectedCourt}
              setSelectedCourt={setSelectedCourt}
              onAddToCourt={onAddToCourt}
              onRemovePlayer={onRemovePlayer}
              onTogglePriority={onTogglePriority}
              onToggleNoPriority={onToggleNoPriority}
              onEditTier={() => {}}
              onViewProfile={onViewProfile}
              onEditName={onEditName}
            />

            <QueueSection
              title="Loser Queue"
              emoji="🔄"
              players={loserQueue}
              colorClass="text-orange-600"
              courts={courts}
              selectedCourt={selectedCourt}
              setSelectedCourt={setSelectedCourt}
              onAddToCourt={onAddToCourt}
              onRemovePlayer={onRemovePlayer}
              onTogglePriority={onTogglePriority}
              onToggleNoPriority={onToggleNoPriority}
              onEditTier={() => {}}
              onViewProfile={onViewProfile}
              onEditName={onEditName}
            />

            <QueueSection
              title="New Players"
              emoji="🆕"
              players={newQueue}
              colorClass="text-gray-600"
              courts={courts}
              selectedCourt={selectedCourt}
              setSelectedCourt={setSelectedCourt}
              onAddToCourt={onAddToCourt}
              onRemovePlayer={onRemovePlayer}
              onTogglePriority={onTogglePriority}
              onToggleNoPriority={onToggleNoPriority}
              onEditTier={() => {}}
              onViewProfile={onViewProfile}
              onEditName={onEditName}
            />
          </div>
        )}
      </div>
    </DroppableQueue>
  );
}
