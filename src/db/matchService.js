import { supabase } from "./supabase";

export async function saveMatch(match) {
  const { session_id, date, ...rest } = match;
  const row = {
    session_id: match.sessionId,
    date:       match.date,
    data:       match,
  };

  const { data, error } = await supabase
    .from("matches")
    .insert(row)
    .select("id")
    .single();

  if (error) { console.error("saveMatch:", error); return null; }
  return data.id;
}

export async function getMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("id", { ascending: false });

  if (error) { console.error("getMatches:", error); return []; }
  return data.map((row) => ({ ...row.data, id: row.id }));
}

export async function updateMatch(match) {
  const { error } = await supabase
    .from("matches")
    .update({ data: match })
    .eq("id", match.id);
  if (error) console.error("updateMatch:", error);
}

export async function deleteMatchesBySession(sessionId) {
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("session_id", sessionId);
  if (error) console.error("deleteMatchesBySession:", error);
}

export async function clearAllMatches() {
  const { error } = await supabase
    .from("matches")
    .delete()
    .neq("id", -1);
  if (error) console.error("clearAllMatches:", error);
}
