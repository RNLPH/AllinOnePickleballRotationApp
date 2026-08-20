export const DEFAULT_COURTS = [
  {
    id: 1,
    players: [],
  },
];

// Returns the correct default court for the given session mode
export function getDefaultCourts(sessionMode) {
  const type =
    sessionMode === "open"            ? "any"  :
    sessionMode === "ladder"          ? "king" :
    sessionMode === "extended_ladder" ? "king" :
    null;

  return [{ id: 1, type, players: [] }];
}

export const STORAGE_KEYS = {
  COURTS: "KNGS Stack_courts",
  SESSION: "KNGS Stack_session",
  SESSION_MODE: "KNGS Stack_session_mode",
};

// ===== SESSION MODES =====
export const SESSION_MODES = {
  LADDER:          "ladder",
  OPEN:            "open",
  EXTENDED_LADDER: "extended_ladder",
  KING_OF_COURT:   "king_of_court",
  ROUND_ROBIN:     "round_robin",
  SWISS:           "swiss",
  RANDOM_DRAW:     "random_draw",
  FIXED_TEAMS:     "fixed_teams",
  CHALLENGE:       "challenge",
};

// ===== LADDER MODE (3-tier) =====
export const TIER_LIMITS = {
  king:   8,
  knight: 10,
  squire: 10,
};

// ===== EXTENDED LADDER MODE (4-tier) =====
export const EXTENDED_TIER_LIMITS = {
  king:    8,
  general: 10,
  knight:  10,
  squire:  10,
};

// Promotion/demotion for Extended Ladder
// court type won/loss → next tier
export const EXTENDED_TIER_TRANSITIONS = {
  king:    { win: "king",    loss: "general" },
  general: { win: "king",    loss: "knight"  },
  knight:  { win: "general", loss: "squire"  },
  squire:  { win: "knight",  loss: "squire"  },
};

// ===== OPEN MODE =====
export const OPEN_COURT_TYPES = {
  WINNER: "winner",
  LOSER:  "loser",
  ANY:    "any",
};

export const OPEN_COURT_LABELS = {
  winner: { emoji: "🏆", label: "Winner Court" },
  loser:  { emoji: "🔄", label: "Loser Court"  },
  any:    { emoji: "🏓", label: "Open Court"   },
};

// Player result pools used in Open Mode rotation
export const RESULT_POOLS = {
  WIN:       "win",
  LOSS:      "loss",
  UNMATCHED: null,
};

// Court format
export const COURT_FORMATS = {
  DOUBLES: "doubles",
  SINGLES: "singles",
};



