import { supabase } from "./supabase";
import { resilientOp } from "./syncQueue";

export async function getPlayers(clubId) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("club_id", clubId);
  if (error) { console.error("getPlayers:", error); return []; }
  return data.map((row) => ({ id: row.id, name: row.name, ...row.data }));
}

// Save a single player (add or update) — resilient
export async function savePlayer(player, clubId) {
  const { id, name, ...rest } = player;
  await resilientOp(supabase, "upsert", "players", { id, name, club_id: clubId, data: rest });
}

// Remove a single player from the queue — resilient
export async function removePlayer(playerId) {
  await resilientOp(supabase, "delete", "players", null, { id: playerId });
}

// Save all players (full sync — used only on bulk operations)
export async function savePlayers(players, clubId) {
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
  await resilientOp(supabase, "delete", "players", null, { club_id: clubId });
}

export async function clearSessionPlayers(clubId) {
  await clearPlayers(clubId);
}
