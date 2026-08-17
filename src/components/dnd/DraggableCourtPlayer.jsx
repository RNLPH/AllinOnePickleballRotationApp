import { useDraggable } from "@dnd-kit/core";
import PlayerAvatar from "../ui/PlayerAvatar";

export default function DraggableCourtPlayer({ player, color = "blue" }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `court-player-${player.id}`,
    data: { player, source: "court" },
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
      className="flex flex-col items-center justify-center text-center cursor-grab w-full py-1"
    >
      <PlayerAvatar player={player} size="w-7 h-7" color={color} textSize="text-xs" />

      <div className="mt-1">
        <span
          className="block text-xs font-semibold text-center capitalize break-words"
          title={player.name}
        >
          {player.name}
        </span>
      </div>
    </div>
  );
}

