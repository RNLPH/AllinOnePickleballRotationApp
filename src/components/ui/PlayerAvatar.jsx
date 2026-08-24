/**
 * Reusable avatar component.
 * Shows the player's photo if available, otherwise falls back to a
 * coloured circle with their initial.
 * 
 * Color-coded ring based on last result:
 *  - Green ring = won last game
 *  - Red ring = lost last game
 *  - No ring = new player (no games)
 */
export default function PlayerAvatar({
  player,
  size = "w-10 h-10",
  color = "blue",
  textSize = "text-sm",
}) {
  const bgColor = color === "purple" ? "bg-purple-500" : "bg-blue-500";

  // Ring color based on last result
  const ringClass = player.lastResult === "win"
    ? "ring-2 ring-green-400"
    : player.lastResult === "loss"
    ? "ring-2 ring-red-400"
    : "";

  if (player.photoUrl) {
    return (
      <img
        src={player.photoUrl}
        alt={player.name}
        className={`${size} rounded-full object-cover ${ringClass} ${
          color === "purple" ? "border-purple-400" : ""
        }`}
      />
    );
  }

  return (
    <div
      className={`
        ${size} rounded-full ${bgColor}
        text-white flex items-center justify-center
        font-bold ${textSize} ${ringClass}
      `}
    >
      {player.name.charAt(0).toUpperCase()}
    </div>
  );
}
