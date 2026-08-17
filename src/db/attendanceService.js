import { supabase } from "./supabase";

export async function getAttendance(clubId) {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("club_id", clubId);
  if (error) { console.error("getAttendance:", error); return []; }
  return data.map((row) => ({ id: row.id, playerId: row.player_id, sessionId: row.session_id, ...row.data }));
}

export async function saveAttendance(record, clubId) {
  const { id, playerId, sessionId, ...rest } = record;
  const { error } = await supabase
    .from("attendance")
    .upsert({
      id,
      player_id:  playerId,
      session_id: sessionId,
      club_id:    clubId,
      data:       record,
    });
  if (error) console.error("saveAttendance:", error);
}

export async function clearAttendance(clubId) {
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("club_id", clubId);
  if (error) console.error("clearAttendance:", error);
}

export async function deleteAttendanceBySession(sessionId, clubId) {
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("session_id", sessionId)
    .eq("club_id", clubId);
  if (error) console.error("deleteAttendanceBySession:", error);
}


