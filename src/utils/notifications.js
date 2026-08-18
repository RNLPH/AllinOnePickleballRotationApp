/**
 * Push Notification utility for PWA
 * Uses the Web Notifications API (browser-level push)
 */

const NOTIFICATION_KEY = "rallystack_notifications";

/**
 * Check if notifications are supported and get permission status
 */
export function getNotificationStatus() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "granted", "denied", or "default"
}

/**
 * Request notification permission
 * @returns {Promise<string>} - "granted", "denied", or "default"
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  const result = await Notification.requestPermission();
  return result;
}

/**
 * Send a local notification
 * @param {string} title - notification title
 * @param {object} options - notification options (body, icon, etc.)
 */
export function sendNotification(title, options = {}) {
  if (getNotificationStatus() !== "granted") return;

  const notification = new Notification(title, {
    icon: "/logo.png",
    badge: "/pwa-192.png",
    vibrate: [200, 100, 200],
    ...options,
  });

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
  return notification;
}

/**
 * Check if notifications are enabled in app settings
 */
export function isNotificationEnabled() {
  return localStorage.getItem(NOTIFICATION_KEY) === "true";
}

/**
 * Enable/disable notifications in app settings
 */
export function setNotificationEnabled(enabled) {
  localStorage.setItem(NOTIFICATION_KEY, enabled ? "true" : "false");
}

/**
 * Notify player it's their turn
 */
export function notifyPlayerTurn(playerName, courtNumber) {
  if (!isNotificationEnabled()) return;
  sendNotification("🏓 Your Turn!", {
    body: `${playerName}, you're up next on Court ${courtNumber}!`,
    tag: "player-turn",
  });
}

/**
 * Notify that a court is available
 */
export function notifyCourtAvailable(courtNumber) {
  if (!isNotificationEnabled()) return;
  sendNotification("🎾 Court Available", {
    body: `Court ${courtNumber} is ready for the next match.`,
    tag: "court-available",
  });
}
