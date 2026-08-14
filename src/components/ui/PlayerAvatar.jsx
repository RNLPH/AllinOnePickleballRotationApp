/**
 * Reusable avatar component.
 * Shows the player's photo if available, otherwise falls back to a
 * coloured circle with their initial.
 *
 * Props:
 *  player   — player object (needs .name, optionally .photoUrl)
 *  size     — tailwind size class pair e.g. "w-10 h-10" (default)
 *  color    — "blue" | "purple"  (used for the fallback circle)
 *  textSize — tailwind text class e.g. "text-sm" (default "text-sm")
 */
export default function PlayerAvatar({
  player,
  size = "w-10 h-10",
  color = "blue",
  textSize = "text-sm",
}) {
  const bgColor = color === "purple" ? "bg-purple-500" : "bg-blue-500";

  if (player.photoUrl) {
    return (
      <img
        src={player.photoUrl}
        alt={player.name}
        className={`${size} rounded-full object-cover border-2 ${
          color === "purple" ? "border-purple-400" : "border-blue-400"
        }`}
      />
    );
  }

  return (
    <div
      className={`
        ${size} rounded-full ${bgColor}
        text-white flex items-center justify-center
        font-bold ${textSize}
      `}
    >
      {player.name.charAt(0).toUpperCase()}
    </div>
  );
}
