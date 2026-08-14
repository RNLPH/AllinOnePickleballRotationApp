import { supabase } from "./supabase";

export async function getStandingsHistory() {
  const { data, error } = await supabase
    .from("standings_history")
    .select("*")
    .order("session_id", { ascending: true });
  if (error) { console.error("getStandingsHistory:", error); return []; }
  return data.map((row) => ({ id: row.id, sessionId: row.session_id, ...row.data }));
}

export async function saveStandingsHistory(record) {
  const { id, sessionId, ...rest } = record;
  const { error } = await supabase
    .from("standings_history")
    .upsert({
      id,
      session_id: sessionId,
      data:       record,
    });
  if (error) console.error("saveStandingsHistory:", error);
}

export async function clearStandingsHistory() {
  const { error } = await supabase
    .from("standings_history")
    .delete()
    .neq("id", "___never___");
  if (error) console.error("clearStandingsHistory:", error);
}
