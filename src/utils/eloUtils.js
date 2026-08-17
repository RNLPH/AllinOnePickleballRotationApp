/**
 * ELO Rating System for RallyStack
 * Similar to DUPR but simplified for club play.
 *
 * Starting rating: 3.0 (scale 1.0 - 5.0)
 * K-factor: 0.1 (how much a single game affects rating)
 *
 * For doubles: team rating = average of both players' ratings
 * Winner gains points, loser loses points based on expected outcome
 */

const DEFAULT_RATING = 2.0;
const K_FACTOR = 0.1;
const MIN_RATING = 1.0;
const MAX_RATING = 5.0;

/**
 * Calculate expected score (probability of winning)
 */
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 1.5));
}

/**
 * Calculate new ELO rating after a match
 * @param {number} rating - current rating
 * @param {number} opponentRating - opponent's (or opponent team's avg) rating
 * @param {boolean} won - did this player win?
 * @returns {number} new rating (clamped to 1.0 - 5.0)
 */
export function calculateNewRating(rating, opponentRating, won) {
  const currentRating = rating || DEFAULT_RATING;
  const oppRating = opponentRating || DEFAULT_RATING;

  const expected = expectedScore(currentRating, oppRating);
  const actual = won ? 1 : 0;

  const newRating = currentRating + K_FACTOR * (actual - expected);

  return Math.round(Math.min(MAX_RATING, Math.max(MIN_RATING, newRating)) * 100) / 100;
}

/**
 * Get team average rating (for doubles)
 */
export function getTeamRating(players) {
  if (!players || players.length === 0) return DEFAULT_RATING;
  const total = players.reduce((sum, p) => sum + (p.eloRating || DEFAULT_RATING), 0);
  return total / players.length;
}

/**
 * Get display rating tier based on ELO
 */
export function getRatingTier(rating) {
  const r = rating || DEFAULT_RATING;
  if (r >= 4.5) return { label: "Pro", color: "text-red-600", bg: "bg-red-50" };
  if (r >= 4.0) return { label: "Advanced", color: "text-purple-600", bg: "bg-purple-50" };
  if (r >= 3.5) return { label: "Intermediate+", color: "text-blue-600", bg: "bg-blue-50" };
  if (r >= 3.0) return { label: "Intermediate", color: "text-green-600", bg: "bg-green-50" };
  if (r >= 2.5) return { label: "Developing", color: "text-yellow-600", bg: "bg-yellow-50" };
  if (r >= 2.0) return { label: "Beginner+", color: "text-orange-600", bg: "bg-orange-50" };
  return { label: "Beginner", color: "text-slate-600", bg: "bg-slate-50" };
}

export const DEFAULT_ELO = DEFAULT_RATING;
