import { supabase } from "./supabase";

export async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*");
  if (error) { console.error("getPlayers:", error); return []; }
  return data.map((row) => ({ id: row.id, name: row.name, ...row.data }));
}

export async function savePlayers(players) {
  // Step 1 — get existing IDs from Supabase
  const { data: existing, error: fetchError } = await supabase
    .from("players")
    .select("id");

  if (fetchError) { console.error("savePlayers fetch:", fetchError); return; }

  const existingIds = new Set(existing.map((r) => r.id));
  const incomingIds = new Set(players.map((p) => p.id));

  // Step 2 — delete rows that are no longer in the queue
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .in("id", toDelete);
    if (deleteError) console.error("savePlayers delete:", deleteError);
  }

  // Step 3 — upsert current players (insert new, update existing)
  if (players.length > 0) {
    const rows = players.map(({ id, name, ...rest }) => ({
      id,
      name,
      data: rest,
    }));
    const { error: upsertError } = await supabase
      .from("players")
      .upsert(rows, { onConflict: "id" });
    if (upsertError) console.error("savePlayers upsert:", upsertError);
  }
}

export async function clearPlayers() {
  const { error } = await supabase
    .from("players")
    .delete()
    .neq("id", "___never___");
  if (error) console.error("clearPlayers:", error);
}

export async function clearSessionPlayers() {
  await clearPlayers();
}
