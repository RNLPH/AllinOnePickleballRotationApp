import { supabase } from "./supabase";

export async function getPlayers(clubId) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("club_id", clubId);
  if (error) { console.error("getPlayers:", error); return []; }
  return data.map((row) => ({ id: row.id, name: row.name, ...row.data }));
}

export async function savePlayers(players, clubId) {
  // Step 1 — get existing IDs for this club
  const { data: existing, error: fetchError } = await supabase
    .from("players")
    .select("id")
    .eq("club_id", clubId);
  if (fetchError) { console.error("savePlayers fetch:", fetchError); return; }

  const existingIds = new Set(existing.map((r) => r.id));
  const incomingIds = new Set(players.map((p) => p.id));

  // Step 2 — delete rows no longer in the queue
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .in("id", toDelete);
    if (deleteError) console.error("savePlayers delete:", deleteError);
  }

  // Step 3 — upsert current players
  if (players.length > 0) {
    const rows = players.map(({ id, name, ...rest }) => ({
      id, name, club_id: clubId, data: rest,
    }));
    const { error: upsertError } = await supabase
      .from("players")
      .upsert(rows, { onConflict: "id" });
    if (upsertError) console.error("savePlayers upsert:", upsertError);
  }
}

export async function clearPlayers(clubId) {
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("club_id", clubId);
  if (error) console.error("clearPlayers:", error);
}

export async function clearSessionPlayers(clubId) {
  await clearPlayers(clubId);
}

