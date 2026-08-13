import { db } from "./database";

export async function getDirectory() {
  return await db.directory.toArray();
}

export async function saveDirectoryPlayer(
  player
) {
  return await db.directory.put(player);
}

export async function deleteDirectoryPlayer(id) {
  return await db.directory.delete(id);
}