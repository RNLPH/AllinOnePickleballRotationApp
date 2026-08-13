import { useDraggable } from "@dnd-kit/core";

export default function DraggablePlayer({ player }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `queue-player-${player.id}`,
    data: {
      player,
      source: "queue",
    },
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: transform ? 99999 : 1,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="
        w-10
        h-10
        rounded-full
        bg-blue-500
        text-white
        flex
        items-center
        justify-center
        font-bold
        cursor-grab
        hover:scale-105
        transition-all
      "
    >
      {player.name.charAt(0).toUpperCase()}
    </div>
  );
}
