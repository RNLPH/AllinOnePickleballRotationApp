import { db } from "./database";

export async function getPlayers() {
  return await db.players.toArray();
}

export async function savePlayers(players) {
  await db.players.clear();

  if (players.length > 0) {
    await db.players.bulkPut(players);
  }
}

export async function clearPlayers() {
  await db.players.clear();
}

export async function clearSessionPlayers() {
  await db.players.clear();
}