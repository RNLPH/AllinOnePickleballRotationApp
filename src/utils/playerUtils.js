export const sortPlayers = (playerList) => {
  return [...playerList].sort((a, b) => {
    if (a.gamesPlayed !== b.gamesPlayed) {
      return a.gamesPlayed - b.gamesPlayed;
    }
    if (a.waitingSince !== b.waitingSince) {
      return a.waitingSince - b.waitingSince;
    }
    return 0;
  });
};

export const shufflePlayers = (playerList) => {
  const shuffled = [...playerList];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const getRelativeTime = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
};

export const formatSessionDate = (timestamp) => {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatMatchDuration = (start, end) => {
  if (!start || !end) return "Unknown";

  const durationMinutes = Math.max(1, Math.round((end - start) / 60000));

  const startTime = new Date(start).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const endTime = new Date(end).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startTime} - ${endTime} (${durationMinutes} min)`;
};

export const getCourtDuration = (startedAt) => {
  if (!startedAt) return 0;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const getCourtMinutes = (startedAt) => {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - startedAt) / 60000);
};

