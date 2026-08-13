import { useDroppable } from "@dnd-kit/core";

export default function DroppableCourt({ courtId, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `court-${courtId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? "ring-4 ring-green-400 rounded-xl" : ""}
    >
      {children}
    </div>
  );
}
