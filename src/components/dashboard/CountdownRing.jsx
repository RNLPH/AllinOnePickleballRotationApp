import { useState, useEffect } from "react";

/**
 * CountdownRing — Circular SVG progress timer.
 * Shows elapsed time as a filling ring + text in the center.
 * Self-contained: ticks independently without parent re-renders.
 */
export default function CountdownRing({ startedAt, thresholdMinutes = 15, onThresholdReached }) {
  const [, tick] = useState(0);
  const [thresholdFired, setThresholdFired] = useState(false);

  useEffect(() => {
    if (!startedAt) return;
    setThresholdFired(false);
    const timer = setInterval(() => tick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    if (!startedAt || thresholdFired) return;
    const minutes = Math.floor((Date.now() - startedAt) / 60000);
    if (minutes >= thresholdMinutes && onThresholdReached) {
      setThresholdFired(true);
      onThresholdReached();
    }
  });

  if (!startedAt) return null;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const duration = `${minutes}:${String(seconds).padStart(2, "0")}`;

  // Ring progress: 0-15 min = green fill, 15-20 = amber, 20+ = red
  const maxMinutes = 20;
  const progress = Math.min(elapsed / (maxMinutes * 60), 1);
  const circumference = 2 * Math.PI * 18; // radius = 18
  const strokeDashoffset = circumference * (1 - progress);

  const ringColor = minutes >= 20 ? "#dc2626" : minutes >= 15 ? "#d97706" : "#16a34a";
  const textColor = minutes >= 20 ? "text-red-600" : minutes >= 15 ? "text-amber-600" : "text-green-600";

  return (
    <div className="flex items-center gap-2 mb-2" aria-live="polite" aria-label={`Match time ${minutes} minutes ${seconds} seconds`}>
      <div className="relative w-11 h-11 shrink-0">
        <svg className="countdown-ring w-full h-full" viewBox="0 0 40 40">
          {/* Background circle */}
          <circle cx="20" cy="20" r="18" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          {/* Progress circle */}
          <circle
            cx="20" cy="20" r="18" fill="none"
            stroke={ringColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="no-transition"
          />
        </svg>
        {/* Center text */}
        <div className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${textColor} no-transition`}>
          {minutes}m
        </div>
      </div>
      <span className={`text-base font-mono font-bold ${textColor} no-transition`}>
        {duration}
      </span>
      {minutes > 15 && (
        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
          ⚡ Long
        </span>
      )}
    </div>
  );
}
