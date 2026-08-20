import { supabase } from "./supabase";
import { resilientOp } from "./syncQueue";

export async function saveMatch(match, clubId) {
  const row = {
    session_id: match.sessionId,
    date:       match.date,
    club_id:    clubId,
    data:       match,
  };
  // Try direct insert first (we need the returned ID)
  const { data, error } = await supabase
    .from("matches")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    // Queue for retry — use a temp ID locally
    console.error("saveMatch:", error);
    resilientOp(supabase, "insert", "matches", row);
    return `local_${Date.now()}`;
  }
  return data.id;
}

export async function getMatches(clubId) {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("club_id", clubId)
    .order("id", { ascending: false });
  if (error) { console.error("getMatches:", error); return []; }
  return data.map((row) => ({ ...row.data, id: row.id }));
}

export async function updateMatch(match) {
  await resilientOp(supabase, "update", "matches", { data: match }, { id: match.id });
}

export async function deleteMatchesBySession(sessionId, clubId) {
  await resilientOp(supabase, "delete", "matches", null, { session_id: sessionId, club_id: clubId });
}

export async function clearAllMatches(clubId) {
  await resilientOp(supabase, "delete", "matches", null, { club_id: clubId });
}
