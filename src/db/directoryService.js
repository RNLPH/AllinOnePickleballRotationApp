import { supabase } from "./supabase";

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
  const { error } = await supabase
    .from("directory")
    .upsert({ id, name, club_id: clubId, data: rest });
  if (error) console.error("saveDirectoryPlayer:", error);
}

export async function deleteDirectoryPlayer(id) {
  const { error } = await supabase
    .from("directory")
    .delete()
    .eq("id", id);
  if (error) console.error("deleteDirectoryPlayer:", error);
}


