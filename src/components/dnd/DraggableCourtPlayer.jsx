import { useDraggable } from "@dnd-kit/core";

export default function DraggableCourtPlayer({ player, color = "blue" }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `court-player-${player.id}`,
    data: {
      player,
      source: "court",
    },
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="
        flex
        flex-col
        items-center
        justify-center
        text-center
        cursor-grab
        w-full
        py-1
      "
    >
      <div
        className={`
          w-7
          h-7
          rounded-full
          flex
          items-center
          justify-center
          text-white
          text-xs
          font-bold
          ${color === "purple" ? "bg-purple-500" : "bg-blue-500"}
        `}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>

      <div className="mt-1">
        <span
          className="
            block
            text-xs
            font-semibold
            text-center
            capitalize
            break-words
          "
          title={player.name}
        >
          {player.name}
        </span>
      </div>
    </div>
  );
}
