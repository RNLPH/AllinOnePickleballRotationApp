import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

/**
 * Supabase Realtime sync hook.
 * Subscribes to changes on specified tables for a club.
 * Calls onSync() when any change is detected so the component can refresh.
 *
 * Usage:
 *   useRealtimeSync(clubId, onSync)
 *
 * Tables subscribed: players, courts, matches
 * Events: INSERT, UPDATE, DELETE
 *
 * If Realtime isn't enabled on the tables, this silently does nothing.
 */
export function useRealtimeSync(clubId, onSync) {
  const channelRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!clubId) return;

    // Debounce: batch rapid changes into a single refresh
    const debouncedSync = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSync();
      }, 500); // Wait 500ms after last change before refreshing
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
