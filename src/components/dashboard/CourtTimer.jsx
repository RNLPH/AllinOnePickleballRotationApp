import { useState, useEffect, useRef } from "react";

/**
 * CourtTimer — Self-contained timer component that ticks independently.
 * This prevents the parent component from re-rendering every second.
 * Only the timer DOM node updates, not the entire court/app tree.
 */
export default function CourtTimer({ startedAt, onThresholdReached }) {
  const [, tick] = useState(0);
  const thresholdFiredRef = useRef(false);

  useEffect(() => {
    if (!startedAt) return;
    thresholdFiredRef.current = false;
    const timer = setInterval(() => tick((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  // Fire threshold callback once at 15 minutes
  useEffect(() => {
    if (!startedAt || thresholdFiredRef.current) return;
    const minutes = Math.floor((Date.now() - startedAt) / 60000);
    if (minutes >= 15 && onThresholdReached) {
      thresholdFiredRef.current = true;
      onThresholdReached();
    }
  });

  if (!startedAt) return null;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const duration = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const courtMinutes = Math.floor((Date.now() - startedAt) / 60000);

  const colorClass =
    courtMinutes >= 20
      ? "text-red-600 animate-pulse"
      : courtMinutes >= 15
      ? "text-yellow-600"
      : "text-green-600";

  return (
    <>
      <div className={`mb-2 font-bold text-lg ${colorClass}`} aria-live="polite" aria-label={`Match duration ${minutes} minutes ${seconds} seconds`}>
        ⏱ {duration}
      </div>
      {courtMinutes > 15 && (
        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold mb-2 inline-block">
          ⚡ Long match
        </span>
      )}
    </>
  );
}
