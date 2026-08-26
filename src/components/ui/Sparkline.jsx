/**
 * Sparkline — 5-dot win/loss trend visualization.
 * Shows last 5 game results as colored dots inline.
 * Green = win, Red = loss, Gray = no data
 */
export default function Sparkline({ results = [] }) {
  // Take last 5 results (newest first → reverse for left-to-right display)
  const last5 = results.slice(0, 5).reverse();
  
  // Pad with empty if less than 5
  while (last5.length < 5) last5.unshift(null);

  return (
    <div className="flex items-center gap-0.5" aria-label={`Recent form: ${last5.filter(r => r === "win").length} wins, ${last5.filter(r => r === "loss").length} losses`}>
      {last5.map((result, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            result === "win" ? "bg-green-500" :
            result === "loss" ? "bg-red-400" :
            "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}
