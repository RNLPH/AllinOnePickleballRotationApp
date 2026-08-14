import { supabase } from "./supabase";

export async function getAttendance() {
  const { data, error } = await supabase
    .from("attendance")
    .select("*");
  if (error) { console.error("getAttendance:", error); return []; }
  return data.map((row) => ({ id: row.id, playerId: row.player_id, sessionId: row.session_id, ...row.data }));
}

export async function saveAttendance(record) {
  const { id, playerId, sessionId, ...rest } = record;
  const { error } = await supabase
    .from("attendance")
    .upsert({
      id,
      player_id:  playerId,
      session_id: sessionId,
      data:       record,
    });
  if (error) console.error("saveAttendance:", error);
}

export async function clearAttendance() {
  const { error } = await supabase
    .from("attendance")
    .delete()
    .neq("id", "___never___");
  if (error) console.error("clearAttendance:", error);
}

export async function deleteAttendanceBySession(sessionId) {
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("session_id", sessionId);
  if (error) console.error("deleteAttendanceBySession:", error);
}
