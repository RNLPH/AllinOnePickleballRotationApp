import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

/**
 * Flag to suppress Realtime refreshes during local writes.
 * Set this to true before a local write operation, and false after.
 * While true, Realtime events are ignored (they're our own writes echoing back).
 */
let suppressUntil = 0;

/**
 * Call this before any local write operation to suppress Realtime for a period.
 * @param {number} ms - milliseconds to suppress (default 3000)
 */
export function suppressRealtime(ms = 3000) {
  suppressUntil = Date.now() + ms;
}

/**
 * Supabase Realtime sync hook.
 * Subscribes to changes on specified tables for a club.
 * Calls onSync() when any change is detected FROM ANOTHER DEVICE.
 * Self-triggered events are suppressed.
 */
export function useRealtimeSync(clubId, onSync) {
  const channelRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!clubId) return;

    // Debounce: batch rapid changes into a single refresh
    const debouncedSync = () => {
      // Skip if we're in a suppression window (our own writes)
      if (Date.now() < suppressUntil) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // Double-check suppression hasn't been set during the debounce wait
        if (Date.now() < suppressUntil) return;
        onSync();
      }, 2000); // Wait 2s after last change before refreshing (gives time for all writes to complete)
    };

    // Create a channel for this club
    const channel = supabase
      .channel(`club_${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `club_id=eq.${clubId}` },
        () => debouncedSync()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courts", filter: `club_id=eq.${clubId}` },
        () => debouncedSync()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `club_id=eq.${clubId}` },
        () => debouncedSync()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime: connected to club", clubId);
        }
        if (status === "CHANNEL_ERROR") {
          console.warn("Realtime: channel error (Realtime may not be enabled on tables)");
        }
      });

    channelRef.current = channel;

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clubId]);
}
