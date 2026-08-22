/**
 * useGameStore — Central state management for the game session.
 * Uses useReducer to eliminate stale closure bugs.
 * All state updates go through a single dispatch, ensuring consistency.
 */
import { useReducer, useCallback, useRef } from "react";
import { sortPlayers } from "../utils/playerUtils";

// ===== INITIAL STATE =====
export const initialGameState = {
  players: [],
  playersLoaded: false,
  directory: [],
  matches: [],
  attendance: [],
  standingsHistory: [],
  courts: [],
  courtPreviews: {},
  partnerWarnings: {},
};

// ===== ACTION TYPES =====
export const ACTIONS = {
  SET_PLAYERS: "SET_PLAYERS",
  ADD_PLAYER: "ADD_PLAYER",
  ADD_PLAYERS: "ADD_PLAYERS",
  REMOVE_PLAYER: "REMOVE_PLAYER",
  UPDATE_PLAYER: "UPDATE_PLAYER",
  FILTER_PLAYERS: "FILTER_PLAYERS",

  SET_COURTS: "SET_COURTS",
  UPDATE_COURT: "UPDATE_COURT",

  SET_DIRECTORY: "SET_DIRECTORY",
  ADD_DIRECTORY_PLAYER: "ADD_DIRECTORY_PLAYER",
  REMOVE_DIRECTORY_PLAYER: "REMOVE_DIRECTORY_PLAYER",

  SET_MATCHES: "SET_MATCHES",
  ADD_MATCH: "ADD_MATCH",

  SET_ATTENDANCE: "SET_ATTENDANCE",
  ADD_ATTENDANCE: "ADD_ATTENDANCE",

  SET_STANDINGS_HISTORY: "SET_STANDINGS_HISTORY",
  ADD_STANDINGS_HISTORY: "ADD_STANDINGS_HISTORY",

  SET_COURT_PREVIEWS: "SET_COURT_PREVIEWS",
  SET_PARTNER_WARNINGS: "SET_PARTNER_WARNINGS",

  // Bulk operations
  LOAD_ALL: "LOAD_ALL",
  RESET_SESSION: "RESET_SESSION",
  FACTORY_RESET: "FACTORY_RESET",

  // Court + player atomic operations (prevents stale state)
  ASSIGN_TO_COURTS: "ASSIGN_TO_COURTS",
  END_GAME: "END_GAME",
  CLEAR_COURT: "CLEAR_COURT",
  REMOVE_COURT_PLAYER: "REMOVE_COURT_PLAYER",
};

// ===== REDUCER =====
function gameReducer(state, action) {
  switch (action.type) {
    // === Players ===
    case ACTIONS.SET_PLAYERS:
      return { ...state, players: action.payload, playersLoaded: true };

    case ACTIONS.ADD_PLAYER:
      return { ...state, players: sortPlayers([...state.players, action.payload]) };

    case ACTIONS.ADD_PLAYERS:
      return { ...state, players: sortPlayers([...state.players, ...action.payload]) };

    case ACTIONS.REMOVE_PLAYER:
      return { ...state, players: state.players.filter((p) => p.id !== action.payload) };

    case ACTIONS.UPDATE_PLAYER:
      return {
        ...state,
        players: state.players.map((p) => p.id === action.payload.id ? action.payload : p),
      };

    case ACTIONS.FILTER_PLAYERS:
      return { ...state, players: action.payload(state.players) };

    // === Courts ===
    case ACTIONS.SET_COURTS:
      return { ...state, courts: action.payload };

    case ACTIONS.UPDATE_COURT:
      return {
        ...state,
        courts: state.courts.map((c) => c.id === action.payload.id ? { ...c, ...action.payload } : c),
      };

    // === Directory ===
    case ACTIONS.SET_DIRECTORY:
      return { ...state, directory: action.payload };

    case ACTIONS.ADD_DIRECTORY_PLAYER:
      return { ...state, directory: [...state.directory, action.payload] };

    case ACTIONS.REMOVE_DIRECTORY_PLAYER:
      return { ...state, directory: state.directory.filter((p) => p.id !== action.payload) };

    // === Matches ===
    case ACTIONS.SET_MATCHES:
      return { ...state, matches: action.payload };

    case ACTIONS.ADD_MATCH:
      return { ...state, matches: [action.payload, ...state.matches] };

    // === Attendance ===
    case ACTIONS.SET_ATTENDANCE:
      return { ...state, attendance: action.payload };

    case ACTIONS.ADD_ATTENDANCE:
      return { ...state, attendance: [...state.attendance, ...action.payload] };

    // === Standings History ===
    case ACTIONS.SET_STANDINGS_HISTORY:
      return { ...state, standingsHistory: action.payload };

    case ACTIONS.ADD_STANDINGS_HISTORY:
      return { ...state, standingsHistory: [...state.standingsHistory, action.payload] };

    // === Court Previews ===
    case ACTIONS.SET_COURT_PREVIEWS:
      return { ...state, courtPreviews: action.payload };

    case ACTIONS.SET_PARTNER_WARNINGS:
      return { ...state, partnerWarnings: action.payload };

    // === Bulk: Load All ===
    case ACTIONS.LOAD_ALL:
      return {
        ...state,
        players: action.payload.players,
        playersLoaded: true,
        directory: action.payload.directory,
        matches: action.payload.matches,
        attendance: action.payload.attendance,
        standingsHistory: action.payload.standingsHistory,
      };

    // === Atomic: Assign players to courts (prevents stale closure) ===
    case ACTIONS.ASSIGN_TO_COURTS: {
      const { updatedCourts, assignedPlayerIds } = action.payload;
      return {
        ...state,
        courts: updatedCourts,
        players: state.players.filter((p) => !assignedPlayerIds.includes(p.id)),
      };
    }

    // === Atomic: End game (return players to queue + clear court) ===
    case ACTIONS.END_GAME: {
      const { courtId, returningPlayers, keepOnCourt } = action.payload;
      const newPlayers = sortPlayers([...state.players, ...returningPlayers]);
      let newCourts;

      if (keepOnCourt) {
        // King of Court: winners stay, losers go to queue
        const winnerIds = keepOnCourt.map((p) => p.id);
        newCourts = state.courts.map((c) =>
          c.id === courtId ? { ...c, players: keepOnCourt, startedAt: null } : c
        );
        return {
          ...state,
          courts: newCourts,
          players: sortPlayers(newPlayers.filter((p) => !winnerIds.includes(p.id))),
        };
      }

      newCourts = state.courts.map((c) =>
        c.id === courtId ? { ...c, players: [], startedAt: null } : c
      );
      return { ...state, courts: newCourts, players: newPlayers };
    }

    // === Atomic: Clear court ===
    case ACTIONS.CLEAR_COURT: {
      const { courtId: cid, returningPlayers: rp } = action.payload;
      return {
        ...state,
        courts: state.courts.map((c) => c.id === cid ? { ...c, players: [], startedAt: null } : c),
        players: sortPlayers([...state.players, ...rp]),
      };
    }

    // === Atomic: Remove player from court ===
    case ACTIONS.REMOVE_COURT_PLAYER: {
      const { courtId: rcid, playerId, returningPlayer } = action.payload;
      return {
        ...state,
        courts: state.courts.map((c) => {
          if (c.id !== rcid) return c;
          return {
            ...c,
            players: c.players.filter((p) => p.id !== playerId),
            startedAt: c.players.length - 1 < (c.format === "singles" ? 2 : 4) ? null : c.startedAt,
          };
        }),
        players: sortPlayers([...state.players, returningPlayer]),
      };
    }

    // === Reset ===
    case ACTIONS.RESET_SESSION:
      return {
        ...state,
        players: [],
        courts: action.payload.courts,
        courtPreviews: {},
      };

    case ACTIONS.FACTORY_RESET:
      return {
        ...state,
        players: [],
        directory: [],
        matches: [],
        attendance: [],
        standingsHistory: [],
        courts: action.payload.courts,
        courtPreviews: {},
      };

    default:
      return state;
  }
}

// ===== HOOK =====
export function useGameStore(initialCourts = []) {
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialGameState,
    courts: initialCourts,
  });

  return { state, dispatch };
}
