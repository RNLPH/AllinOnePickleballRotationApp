import { supabase } from "./supabase";
import { resilientOp } from "./syncQueue";

export async function getDirectory(clubId) {
  const { data, error } = await supabase
    .from("directory")
    .select("*")
    .eq("club_id", clubId);
  if (error) { console.error("getDirectory:", error); return []; }
  return data.map((row) => ({ id: row.id, name: row.name, ...row.data }));
}

export async function saveDirectoryPlayer(player, clubId) {
  const { id, name, ...rest } = player;
  await resilientOp(supabase, "upsert", "directory", { id, name, club_id: clubId, data: rest });
}

export async function deleteDirectoryPlayer(id) {
  await resilientOp(supabase, "delete", "directory", null, { id });
}
