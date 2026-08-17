import { supabase } from "./supabase";

export async function getStandingsHistory(clubId) {
  const { data, error } = await supabase
    .from("standings_history")
    .select("*")
    .eq("club_id", clubId)
    .order("session_id", { ascending: true });
  if (error) { console.error("getStandingsHistory:", error); return []; }
  return data.map((row) => ({ id: row.id, sessionId: row.session_id, ...row.data }));
}

export async function saveStandingsHistory(record, clubId) {
  const { id, sessionId } = record;
  const { error } = await supabase
    .from("standings_history")
    .upsert({
      id,
      session_id: sessionId,
      club_id:    clubId,
      data:       record,
    });
  if (error) console.error("saveStandingsHistory:", error);
}

export async function clearStandingsHistory(clubId) {
  const { error } = await supabase
    .from("standings_history")
    .delete()
    .eq("club_id", clubId);
  if (error) console.error("clearStandingsHistory:", error);
}


