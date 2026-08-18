/**
 * CSV Bulk Import utility
 * Parses CSV text into player objects ready for the queue.
 * Expected columns: Name (required), Tier (optional)
 */

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { players: [], errors: [] };

  // Detect header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("name") || firstLine.includes("player");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const players = [];
  const errors = [];

  dataLines.forEach((line, idx) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const name = cols[0]?.trim();
    const tier = cols[1]?.trim().toLowerCase() || "squire";

    if (!name || name.length < 2) {
      errors.push(`Row ${idx + 1}: Name too short or missing`);
      return;
    }
    if (name.length > 20) {
      errors.push(`Row ${idx + 1}: "${name}" exceeds 20 characters`);
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
      errors.push(`Row ${idx + 1}: "${name}" has invalid characters`);
      return;
    }

    const validTiers = ["king", "general", "knight", "squire"];
    const resolvedTier = validTiers.includes(tier) ? tier : "squire";

    players.push({ name, tier: resolvedTier });
  });

  return { players, errors };
}

/**
 * Reads a File object and returns its text content
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
