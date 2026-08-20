/**
 * Sync Queue — queues failed Supabase writes and retries them.
 * Operations are stored in localStorage so they survive page refreshes.
 * Retries happen on next successful operation or on manual trigger.
 */

const QUEUE_KEY = "rs_sync_queue";
const MAX_RETRIES = 5;
const MAX_QUEUE_SIZE = 200;

/**
 * Get the current queue from localStorage
 */
function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue) {
  try {
    // Trim to max size (remove oldest if too many)
    const trimmed = queue.length > MAX_QUEUE_SIZE ? queue.slice(-MAX_QUEUE_SIZE) : queue;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("syncQueue: failed to save queue", e);
  }
}

/**
 * Add a failed operation to the retry queue
 * @param {string} operation - "upsert" | "delete" | "insert"
 * @param {string} table - Supabase table name
 * @param {object} payload - the data to send
 * @param {object} filters - { column: value } for delete/update operations
 */
export function enqueue(operation, table, payload, filters = {}) {
  const queue = getQueue();
  queue.push({
    id: crypto.randomUUID(),
    operation,
    table,
    payload,
    filters,
    retries: 0,
    createdAt: Date.now(),
  });
  saveQueue(queue);
}

/**
 * Get pending queue size (for UI indicator)
 */
export function getPendingCount() {
  return getQueue().length;
}

/**
 * Process the retry queue — attempts all pending operations.
 * Call this after a successful Supabase operation (proof that network is up).
 * @param {object} supabase - the Supabase client instance
 * @returns {object} { processed, failed, remaining }
 */
export async function processQueue(supabase) {
  const queue = getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0 };

  const stillPending = [];
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      let result;

      if (item.operation === "upsert") {
        result = await supabase
          .from(item.table)
          .upsert(item.payload, { onConflict: "id" });
      } else if (item.operation === "insert") {
        result = await supabase
          .from(item.table)
          .insert(item.payload);
      } else if (item.operation === "delete") {
        let query = supabase.from(item.table).delete();
        for (const [col, val] of Object.entries(item.filters)) {
          query = query.eq(col, val);
        }
        result = await query;
      } else if (item.operation === "update") {
        let query = supabase.from(item.table).update(item.payload);
        for (const [col, val] of Object.entries(item.filters)) {
          query = query.eq(col, val);
        }
        result = await query;
      }

      if (result?.error) {
        throw result.error;
      }

      processed++;
    } catch (e) {
      item.retries++;
      if (item.retries < MAX_RETRIES) {
        stillPending.push(item);
      } else {
        // Max retries exceeded — drop this operation
        console.error(`syncQueue: dropping operation after ${MAX_RETRIES} retries`, item, e);
        failed++;
      }
    }
  }

  saveQueue(stillPending);
  return { processed, failed, remaining: stillPending.length };
}

/**
 * Clear the entire queue (e.g., after factory reset)
 */
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Wrap a Supabase operation with automatic queue-on-failure.
 * Returns true if the operation succeeded (directly or will be retried).
 * 
 * Usage:
 *   await resilientOp(supabase, "upsert", "players", payload, filters);
 */
export async function resilientOp(supabase, operation, table, payload, filters = {}) {
  try {
    let result;

    if (operation === "upsert") {
      result = await supabase.from(table).upsert(payload, { onConflict: "id" });
    } else if (operation === "insert") {
      result = await supabase.from(table).insert(payload);
    } else if (operation === "delete") {
      let query = supabase.from(table).delete();
      for (const [col, val] of Object.entries(filters)) {
        query = query.eq(col, val);
      }
      result = await query;
    } else if (operation === "update") {
      let query = supabase.from(table).update(payload);
      for (const [col, val] of Object.entries(filters)) {
        query = query.eq(col, val);
      }
      result = await query;
    }

    if (result?.error) {
      throw result.error;
    }

    // Success — try to process any pending queue items while network is good
    processQueue(supabase).catch(() => {});
    return true;
  } catch (e) {
    // Failed — queue for retry
    console.warn(`syncQueue: operation failed, queuing for retry`, { operation, table }, e.message || e);
    enqueue(operation, table, payload, filters);
    return false;
  }
}
