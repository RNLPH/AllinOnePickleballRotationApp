/**
 * Local-first data cache layer.
 * All data is stored in localStorage as the primary source.
 * Supabase is the sync target — if it fails, data persists locally.
 */

const PREFIX = "rs_cache_";

function getKey(type, clubId) {
  return `${PREFIX}${type}_${clubId}`;
}

/**
 * Save data to localStorage
 */
export function cacheSet(type, clubId, data) {
  try {
    const key = getKey(type, clubId);
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // localStorage full — try to clear oldest entries
    console.warn("localCache: storage full, clearing old entries", e);
    clearOldEntries();
    try {
      localStorage.setItem(getKey(type, clubId), JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e2) {
      console.error("localCache: unable to save even after cleanup", e2);
    }
  }
}

/**
 * Get data from localStorage
 * Returns { data, timestamp } or null if not found
 */
export function cacheGet(type, clubId) {
  try {
    const key = getKey(type, clubId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("localCache: failed to read", type, e);
    return null;
  }
}

/**
 * Remove cached data
 */
export function cacheClear(type, clubId) {
  localStorage.removeItem(getKey(type, clubId));
}

/**
 * Clear all cache for a club
 */
export function cacheClearClub(clubId) {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX) && k.includes(clubId));
  keys.forEach((k) => localStorage.removeItem(k));
}

/**
 * Clear oldest cache entries to free space
 */
function clearOldEntries() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      try {
        const val = JSON.parse(localStorage.getItem(key));
        entries.push({ key, timestamp: val.timestamp || 0 });
      } catch (e) {
        entries.push({ key, timestamp: 0 });
      }
    }
  }
  // Sort by oldest first, remove bottom 25%
  entries.sort((a, b) => a.timestamp - b.timestamp);
  const toRemove = Math.ceil(entries.length / 4);
  entries.slice(0, toRemove).forEach((e) => localStorage.removeItem(e.key));
}

/**
 * Smart data loader: loads from cache first (instant), then from Supabase (fresh).
 * If Supabase returns fewer items than cache (possible data loss), uses cache.
 * Returns the best available data.
 */
export function resolveData(cached, fresh, type) {
  // No cache — use fresh (even if empty)
  if (!cached || !cached.data) return fresh;

  // No fresh data (Supabase failed or empty) — use cache
  if (!fresh || fresh.length === 0) {
    console.warn(`localCache: using cached ${type} (Supabase returned empty)`);
    return cached.data;
  }

  // Fresh data has significantly fewer items than cache — possible data loss
  // Only flag this for players (most critical), not for matches/attendance which grow over time
  if (type === "players" && cached.data.length > 0 && fresh.length < cached.data.length * 0.5) {
    console.warn(`localCache: possible data loss for ${type} — cache has ${cached.data.length}, Supabase has ${fresh.length}. Using cache.`);
    return cached.data;
  }

  // Fresh data is good — use it
  return fresh;
}

/**
 * Cache data types
 */
export const CACHE_TYPES = {
  PLAYERS: "players",
  DIRECTORY: "directory",
  MATCHES: "matches",
  ATTENDANCE: "attendance",
  STANDINGS_HISTORY: "standings_history",
  COURTS: "courts",
};
