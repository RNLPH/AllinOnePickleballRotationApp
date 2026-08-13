const STORAGE_KEY =
  "picklestack_standings_history";

export async function getStandingsHistory() {
  return JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );
}

export async function saveStandingsHistory(
  historyRecord
) {
  const history =
    await getStandingsHistory();

  history.push(historyRecord);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(history)
  );
}

export async function clearStandingsHistory() {
  localStorage.removeItem(
    STORAGE_KEY
  );
}
