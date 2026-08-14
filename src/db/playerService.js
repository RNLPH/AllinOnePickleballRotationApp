import { supabase } from "./supabase";

export async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*");
  if (error) { console.error("getPlayers:", error); return []; }
  return data.map((row) => ({ id: row.id, name: row.name, ...row.data }));
}

export async function savePlayers(players) {
  // Clear all then re-insert (session queue is ephemeral)
  await supabase.from("players").delete().neq("id", "___never___");
  if (players.length === 0) return;

  const rows = players.map(({ id, name, ...rest }) => ({
    id,
    name,
    data: rest,
  }));

  const { error } = await supabase.from("players").upsert(rows);
  if (error) console.error("savePlayers:", error);
}

export async function clearPlayers() {
  await supabase.from("players").delete().neq("id", "___never___");
}

export async function clearSessionPlayers() {
  await clearPlayers();
}
