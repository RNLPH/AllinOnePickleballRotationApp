import { useDroppable } from "@dnd-kit/core";

export default function DroppableQueue({ children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "waiting-queue",
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        transition-all
        ${isOver ? "ring-4 ring-blue-400 rounded-xl bg-blue-50" : ""}
      `}
    >
      {isOver && (
        <div className="text-center text-blue-600 font-bold mb-2">
          Drop player here
        </div>
      )}
      {children}
    </div>
  );
}

