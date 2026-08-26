import { useEffect, useState } from "react";

/**
 * Confetti — Celebration effect on game win.
 * Shows colored particles falling for ~2.5 seconds.
 * @param {string} color - "blue" for Team A or "purple" for Team B
 */
export default function Confetti({ color = "blue", onComplete }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const colors = color === "blue"
      ? ["#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#2563eb"]
      : ["#a855f7", "#c084fc", "#d8b4fe", "#7c3aed", "#9333ea"];

    const newPieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
    setPieces(newPieces);

    const timer = setTimeout(() => {
      setPieces([]);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [color, onComplete]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" aria-hidden="true">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}
