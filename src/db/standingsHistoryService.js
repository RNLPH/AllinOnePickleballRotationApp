import { supabase } from "./supabase";
import { resilientOp } from "./syncQueue";

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
  await resilientOp(supabase, "upsert", "standings_history", {
    id,
    session_id: sessionId,
    club_id: clubId,
    data: record,
  });
}

export async function clearStandingsHistory(clubId) {
  await resilientOp(supabase, "delete", "standings_history", null, { club_id: clubId });
}
