/**
 * useAtomicGameOps — Provides atomic game operations that prevent stale closures.
 * Uses refs to always access the CURRENT state, not stale closure values.
 * 
 * This is a pragmatic solution: wraps existing setState calls but guarantees
 * that players/courts are always read from the latest ref.
 */
import { useRef, useCallback } from "react";
import { sortPlayers } from "../utils/playerUtils";
import { resetRestedPlayers } from "../utils/teamUtils";

export function useAtomicGameOps({ players, courts, setPlayers, setCourts }) {
  // Refs always hold the LATEST state (updated on every render)
  const playersRef = useRef(players);
  const courtsRef = useRef(courts);
  playersRef.current = players;
  courtsRef.current = courts;

  /**
   * Atomically assign players to courts.
   * @param {Array} updatedCourts — the new courts array (with players assigned)
   * @param {Array} assignedPlayerIds — IDs of NEWLY assigned players only
   * @param {boolean} useRestedReset — whether to apply resetRestedPlayers
   */
  const atomicAssignToCourts = useCallback((updatedCourts, assignedPlayerIds, useRestedReset = false) => {
    setCourts(updatedCourts);
    if (useRestedReset) {
      setPlayers((prev) =>
        resetRestedPlayers(
          prev.filter((p) => !assignedPlayerIds.includes(p.id)),
          assignedPlayerIds
        )
      );
    } else {
      setPlayers((prev) => prev.filter((p) => !assignedPlayerIds.includes(p.id)));
    }
  }, [setPlayers, setCourts]);

  /**
   * Atomically end a game: return players to queue + update court.
   * @param {string} courtId
   * @param {Array} returningPlayers — players going back to queue
   * @param {Array|null} keepOnCourt — winners staying on court (King of Court)
   */
  const atomicEndGame = useCallback((courtId, returningPlayers, keepOnCourt = null) => {
    if (keepOnCourt) {
      // King of Court: winners stay on court
      const winnerIds = new Set(keepOnCourt.map((p) => p.id));
      setCourts((prev) =>
        prev.map((c) => c.id === courtId ? { ...c, players: keepOnCourt, startedAt: null } : c)
      );
      setPlayers((prev) => {
        const withReturning = [...prev, ...returningPlayers];
        return sortPlayers(withReturning.filter((p) => !winnerIds.has(p.id)));
      });
    } else {
      // Normal: clear court, all return to queue
      setCourts((prev) =>
        prev.map((c) => c.id === courtId ? { ...c, players: [], startedAt: null } : c)
      );
      setPlayers((prev) => sortPlayers([...prev, ...returningPlayers]));
    }
  }, [setPlayers, setCourts]);

  /**
   * Atomically clear a court: return all players to queue.
   */
  const atomicClearCourt = useCallback((courtId, returningPlayers) => {
    setCourts((prev) =>
      prev.map((c) => c.id === courtId ? { ...c, players: [], startedAt: null } : c)
    );
    setPlayers((prev) => sortPlayers([...prev, ...returningPlayers]));
  }, [setPlayers, setCourts]);

  /**
   * Atomically remove one player from a court and return to queue.
   */
  const atomicRemoveCourtPlayer = useCallback((courtId, playerId, returningPlayer) => {
    setCourts((prev) =>
      prev.map((c) => {
        if (c.id !== courtId) return c;
        const updatedPlayers = c.players.filter((p) => p.id !== playerId);
        return {
          ...c,
          players: updatedPlayers,
          startedAt: updatedPlayers.length < (c.format === "singles" ? 2 : 4) ? null : c.startedAt,
        };
      })
    );
    setPlayers((prev) => sortPlayers([...prev, returningPlayer]));
  }, [setPlayers, setCourts]);

  return {
    playersRef,
    courtsRef,
    atomicAssignToCourts,
    atomicEndGame,
    atomicClearCourt,
    atomicRemoveCourtPlayer,
  };
}
