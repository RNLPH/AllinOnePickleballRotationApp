import Dexie from "dexie";

export const db = new Dexie(
  "PickleStackDB"
);

db.version(3).stores({
  players: "id,name",
  directory: "id,name",
  matches: "++id,date,sessionId",
});