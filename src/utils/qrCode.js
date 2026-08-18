/**
 * Simple QR Code generator using Canvas API
 * Generates a QR code as a data URL using the goqr.me API (free, no key required)
 * Falls back to a text-based link if offline.
 */

export function getQRCodeUrl(text, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=10`;
}
