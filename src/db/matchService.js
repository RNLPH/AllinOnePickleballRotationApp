import { db } from "./database";

export async function saveMatch(match) {
  return await db.matches.add(match);
}

export async function getMatches() {
  return await db.matches.toArray();
}

export async function deleteMatchesBySession(
  sessionId
) {
  const matches =
    await db.matches.toArray();

  const sessionMatches =
    matches.filter(
      (match) =>
        (match.sessionId || 1) ===
        sessionId
    );

  for (const match of sessionMatches) {
    await db.matches.delete(match.id);
  }
}

export async function clearAllMatches() {
  await db.matches.clear();
}

export async function updateMatch(match) {
  return await db.matches.put(match);
}