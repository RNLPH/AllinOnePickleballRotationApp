import { supabase } from "./supabase";

export async function getPlayers(clubId) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("club_id", clubId);
  if (error) { console.error("getPlayers:", error); return []; }
  return data.map((row) => ({ id: row.id, name: row.name, ...row.data }));
}

// Save a single player (add or update)
export async function savePlayer(player, clubId) {
  const { id, name, ...rest } = player;
  const { error } = await supabase
    .from("players")
    .upsert({ id, name, club_id: clubId, data: rest }, { onConflict: "id" });
  if (error) console.error("savePlayer:", error);
}

// Remove a single player from the queue
export async function removePlayer(playerId) {
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);
  if (error) console.error("removePlayer:", error);
}

// Save all players (full sync — used only on initial load or bulk operations)
export async function savePlayers(players, clubId) {
  // Clear all for this club then re-insert
  await supabase.from("players").delete().eq("club_id", clubId);
  if (players.length === 0) return;

  const rows = players.map(({ id, name, ...rest }) => ({
    id, name, club_id: clubId, data: rest,
  }));
  const { error } = await supabase
    .from("players")
    .upsert(rows, { onConflict: "id" });
  if (error) console.error("savePlayers:", error);
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
