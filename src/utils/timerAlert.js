/**
 * timerAlert — Provides audio + haptic feedback when a court timer hits a threshold.
 * Uses the Web Audio API to generate a short tone (no external audio file needed).
 * Respects user preference stored in localStorage.
 */

const SOUND_KEY = "rallystack_sound_enabled";

let audioContext = null;

export function isSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) !== "false"; // default: on
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_KEY, String(enabled));
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a short alert tone (two beeps).
 */
export function playAlertSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const playBeep = (startTime) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    };

    const now = ctx.currentTime;
    playBeep(now);
    playBeep(now + 0.2);
  } catch (e) {
    // Audio not available — silently fail
  }
}

/**
 * Trigger haptic feedback (vibration).
 */
export function triggerHaptic(pattern = [100, 50, 100]) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Vibration not available
  }
}

/**
 * Combined alert: sound + vibration.
 */
export function alertCourtOvertime() {
  playAlertSound();
  triggerHaptic([150, 75, 150]);
}
