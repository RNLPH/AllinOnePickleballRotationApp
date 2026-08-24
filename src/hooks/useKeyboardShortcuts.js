import { useEffect } from "react";

/**
 * useKeyboardShortcuts — Desktop keyboard shortcuts for power operators.
 * 
 * Shortcuts:
 *   S — Start game (fill courts)
 *   N — Focus new player input
 *   Escape — Close any open modal
 *   1-9 — Quick end court (with Ctrl/Cmd)
 */
export function useKeyboardShortcuts({
  onStartGame,
  onFocusInput,
  onCloseModal,
  onEndCourt,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Escape always closes modal
      if (e.key === "Escape") {
        onCloseModal?.();
        return;
      }

      // Don't fire shortcuts when typing in inputs
      if (isInput) return;

      // S — Start game
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onStartGame?.();
        return;
      }

      // N — Focus new player input
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        onFocusInput?.();
        return;
      }

      // Ctrl/Cmd + 1-9 — End court by number
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const courtIndex = parseInt(e.key) - 1;
        onEndCourt?.(courtIndex);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onStartGame, onFocusInput, onCloseModal, onEndCourt]);
}
