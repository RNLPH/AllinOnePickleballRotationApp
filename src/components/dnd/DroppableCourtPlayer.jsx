import { useDroppable } from "@dnd-kit/core";

export default function DroppableCourtPlayer({ player, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `court-player-${player.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? "ring-2 ring-yellow-400 rounded" : ""}
    >
      {children}
    </div>
  );
}
