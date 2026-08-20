import { supabase } from "./supabase";
import { resilientOp } from "./syncQueue";

export async function getAttendance(clubId) {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("club_id", clubId);
  if (error) { console.error("getAttendance:", error); return []; }
  return data.map((row) => ({ ...row.data, id: row.id }));
}

export async function saveAttendance(record, clubId) {
  await resilientOp(supabase, "upsert", "attendance", {
    id: record.id,
    player_id: record.playerId,
    session_id: record.sessionId,
    club_id: clubId,
    data: record,
  });
}

export async function clearAttendance(clubId) {
  await resilientOp(supabase, "delete", "attendance", null, { club_id: clubId });
}

export async function deleteAttendanceBySession(sessionId, clubId) {
  await resilientOp(supabase, "delete", "attendance", null, { session_id: sessionId, club_id: clubId });
}
