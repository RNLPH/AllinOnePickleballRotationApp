import { useEffect, useRef, useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";

import { supabase } from "./db/supabase";
import { getDirectory, saveDirectoryPlayer, deleteDirectoryPlayer } from "./db/directoryService";
import { getPlayers, savePlayers } from "./db/playerService";
import { saveMatch, getMatches, updateMatch, deleteMatchesBySession, clearAllMatches } from "./db/matchService";
import { getAttendance, saveAttendance, clearAttendance, deleteAttendanceBySession } from "./db/attendanceService";
import { getStandingsHistory, saveStandingsHistory, clearStandingsHistory } from "./db/standingsHistoryService";

import AuthScreen from "./components/auth/AuthScreen";
import ClubSetupScreen from "./components/auth/ClubSetupScreen";

import { DEFAULT_COURTS, STORAGE_KEYS, TIER_LIMITS, EXTENDED_TIER_LIMITS, EXTENDED_TIER_TRANSITIONS, SESSION_MODES, OPEN_COURT_TYPES, getDefaultCourts } from "./constants";
import { sortPlayers, shufflePlayers } from "./utils/playerUtils";
import {
  buildRotationGroup,
  eligiblePlayers,
  resetRestedPlayers,
  createBalancedTeams,
} from "./utils/teamUtils";

import SessionControls from "./components/dashboard/SessionControls";
import PlayerQueue from "./components/dashboard/PlayerQueue";
import OpenPlayerQueue from "./components/dashboard/OpenPlayerQueue";
import CourtCard from "./components/dashboard/CourtCard";
import StandingsTab from "./components/tabs/StandingsTab";
import AttendanceTab from "./components/tabs/AttendanceTab";
import HistoryTab from "./components/tabs/HistoryTab";
import TierModal from "./components/modals/TierModal";
import CourtTypeModal from "./components/modals/CourtTypeModal";
import CourtSettingsModal from "./components/modals/CourtSettingsModal";
import PlayerTierModal from "./components/modals/PlayerTierModal";
import PlayerProfileModal from "./components/modals/PlayerProfileModal";
import PreviewPlayerModal from "./components/modals/PreviewPlayerModal";
import SessionModeModal from "./components/modals/SessionModeModal";
import EditPlayerNameModal from "./components/modals/EditPlayerNameModal";
import TierAssignmentPreviewModal from "./components/modals/TierAssignmentPreviewModal";
import LiveBoard from "./components/LiveBoard";

// ===== AUTH WRAPPER =====
// Handles auth state ONLY. Renders the main App or auth screens.
// This keeps all hooks in AppMain unconditional.
export default function App() {
  const [authUser, setAuthUser]       = useState(null);
  const [club, setClub]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) loadClub(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) loadClub(session.user.id);
      else { setClub(null); setAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadClub = async (userId) => {
    const { data } = await supabase
      .from("clubs")
      .select("*")
      .eq("owner_id", userId)
      .single();
    setClub(data || null);
    setAuthLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.svg" alt="RallyStack" className="w-12 h-12 mx-auto mb-4" />
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!authUser) return <AuthScreen />;

  if (!club) return (
    <ClubSetupScreen
      user={authUser}
      onClubCreated={(newClub) => setClub(newClub)}
    />
  );

  return (
    <AppMain
      club={club}
      authUser={authUser}
      onLogout={async () => { 
        await supabase.auth.signOut({ scope: 'local' }); 
        localStorage.clear();
        window.location.href = "/";
      }}
    />
  );
}

// ===== MAIN APP =====
// All hooks live here, unconditionally. club is always set.
function AppMain({ club, authUser, onLogout }) {

  // ===== REFS =====
  const inputRef = useRef(null);

  // ===== UI STATE =====
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [, forceUpdate] = useState(0);

  // ===== VIEW MODE =====
  // Per-device read-only mode. Stored in localStorage so it persists on refresh.
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("rallystack_view_mode") === "true";
  });

  const toggleViewMode = () => {
    setViewMode((prev) => {
      const next = !prev;
      localStorage.setItem("rallystack_view_mode", String(next));
      if (next) setActiveTab("standings"); // default to standings in view mode
      return next;
    });
  };

  const [showLiveBoard, setShowLiveBoard] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showTierModal, setShowTierModal] = useState(false);
  const [pendingPlayerName, setPendingPlayerName] = useState("");
  const [showCourtTypeModal, setShowCourtTypeModal] = useState(false);
  const [selectedCourtForEdit, setSelectedCourtForEdit] = useState(null);
  const [selectedPlayerForEdit, setSelectedPlayerForEdit] = useState(null);
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState(null);
  const [selectedPreviewPlayer, setSelectedPreviewPlayer] = useState(null);
  const [selectedPreviewCourt, setSelectedPreviewCourt] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState({});
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [tierAssignmentPreview, setTierAssignmentPreview] = useState(null);
  const [partnerWarnings, setPartnerWarnings] = useState({});
  // { [courtId]: { teamA: count, teamB: count } }

  // ===== SESSION MODE =====
  // null means "not yet chosen for this session" — triggers the mode picker modal
  const [sessionMode, setSessionMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.SESSION_MODE) || null;
  });

  const handleSelectSessionMode = (mode) => {
    // If switching to a ladder mode and there are players in the queue,
    // build a tier assignment preview first
    if (
      (mode === SESSION_MODES.LADDER || mode === SESSION_MODES.EXTENDED_LADDER) &&
      players.length > 0
    ) {
      const assignments = buildTierAssignment(players, mode);
      setTierAssignmentPreview({ assignments, targetMode: mode });
      return;
    }

    // Set courts to the correct default type for this mode
    setCourts((prev) =>
      prev.map((c) => {
        if (c.players.length > 0) return c; // don't touch active courts
        return {
          ...c,
          type:
            mode === "open"            ? "any"  :
            mode === "ladder"          ? "king" :
            mode === "extended_ladder" ? "king" :
            c.type,
        };
      })
    );

    setSessionMode(mode);
    localStorage.setItem(STORAGE_KEYS.SESSION_MODE, mode);
  };

  // ===== TIER AUTO-ASSIGNMENT =====
  // Ranks queue players by win rate (then wins as tiebreaker),
  // fills tier slots top-down, remaining players go to Squire.
  const buildTierAssignment = (queuePlayers, targetMode) => {
    const sorted = [...queuePlayers].sort((a, b) => {
      const wrA = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
      const wrB = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
      if (wrB !== wrA) return wrB - wrA;
      return (b.wins || 0) - (a.wins || 0);
    });

    const slots = targetMode === SESSION_MODES.EXTENDED_LADDER
      ? [
          { tier: "king",    limit: 8  },
          { tier: "general", limit: 10 },
          { tier: "knight",  limit: 10 },
          { tier: "squire",  limit: 8  },
        ]
      : [
          { tier: "king",   limit: 8  },
          { tier: "knight", limit: 10 },
          { tier: "squire", limit: 10 },
        ];

    const assignments = [];
    let playerIndex = 0;

    for (const { tier, limit } of slots) {
      let filled = 0;
      while (filled < limit && playerIndex < sorted.length) {
        assignments.push({ player: sorted[playerIndex], tier });
        playerIndex++;
        filled++;
      }
      if (playerIndex >= sorted.length) break;
    }

    // Any remaining players beyond the defined slots → Squire
    while (playerIndex < sorted.length) {
      assignments.push({ player: sorted[playerIndex], tier: "squire" });
      playerIndex++;
    }

    return assignments;
  };

  const applyTierAssignment = (assignments, targetMode) => {
    const updatedPlayers = players.map((player) => {
      const assignment = assignments.find((a) => a.player.id === player.id);
      return assignment ? { ...player, tier: assignment.tier } : player;
    });

    setPlayers(updatedPlayers);

    // Update courts to the correct default type for the target mode
    setCourts((prev) =>
      prev.map((c) => {
        if (c.players.length > 0) return c;
        return {
          ...c,
          type:
            targetMode === "ladder"          ? "king" :
            targetMode === "extended_ladder" ? "king" :
            "any",
        };
      })
    );

    setSessionMode(targetMode);
    localStorage.setItem(STORAGE_KEYS.SESSION_MODE, targetMode);
    setTierAssignmentPreview(null);
  };

  // ===== DATA STATE =====
  const [players, setPlayers] = useState([]);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [directory, setDirectory] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standingsHistory, setStandingsHistory] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [courtPreviews, setCourtPreviews] = useState({});

  const [courts, setCourts] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COURTS);
    const savedMode = localStorage.getItem(STORAGE_KEYS.SESSION_MODE);
    if (saved) {
      const parsed = JSON.parse(saved);
      // If courts have no type set, apply default for the current mode
      const defaultType =
        savedMode === "open"            ? "any"  :
        savedMode === "ladder"          ? "king" :
        savedMode === "extended_ladder" ? "king" :
        null;
      if (defaultType && parsed.some((c) => !c.type)) {
        return parsed.map((c) => ({ ...c, type: c.type || defaultType }));
      }
      return parsed;
    }
    return getDefaultCourts(savedMode);
  });

  const [sessionId, setSessionId] = useState(() => {
    return Number(localStorage.getItem(STORAGE_KEYS.SESSION) || 1);
  });

  // ===== EFFECTS =====

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
  }, [sessionId]);

  useEffect(() => {
    const timer = setInterval(() => forceUpdate((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // ===== VIEW MODE AUTO-REFRESH =====
  useEffect(() => {
    if (!viewMode || !club?.id) return;

    const refresh = async () => {
      try {
        const [freshPlayers, freshMatches, freshAttendance, freshDirectory] =
          await Promise.all([
            getPlayers(club.id),
            getMatches(club.id),
            getAttendance(club.id),
            getDirectory(club.id),
          ]);
        setPlayers(freshPlayers);
        setMatches(freshMatches);
        setAttendance(freshAttendance);
        setDirectory(freshDirectory);
        // Read courts from Supabase for cross-device support
        const { data: courtsData } = await supabase
          .from("courts")
          .select("data")
          .eq("club_id", club.id)
          .single();
        if (courtsData?.data) setCourts(courtsData.data);
      } catch (err) {
        console.error("View mode refresh failed:", err);
      }
    };

    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [viewMode, club?.id]);

  // ===== LOAD ALL DATA =====
  // Runs once after club is confirmed. club is always set here
  // because the auth guards above prevent rendering without it.
  useEffect(() => {
    async function loadAll() {
      try {
        const [storedPlayers, savedMatches, history, records, dir] =
          await Promise.all([
            getPlayers(club.id),
            getMatches(club.id),
            getStandingsHistory(club.id),
            getAttendance(club.id),
            getDirectory(club.id),
          ]);
        setPlayers(storedPlayers);
        setPlayersLoaded(true);
        setMatches(savedMatches);
        setStandingsHistory(history);
        setAttendance(records);
        setDirectory(dir);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    loadAll();
  }, [club.id]);

  useEffect(() => {
    if (!playersLoaded) return;
    async function persistPlayers() {
      await savePlayers(players, club.id);
    }
    persistPlayers();
  }, [players, playersLoaded]);

  // ===== SAVE COURTS TO SUPABASE =====
  useEffect(() => {
    async function persistCourts() {
      // Save to localStorage for fast local reads
      localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(courts));
      // Save to Supabase for public board access
      await supabase
        .from("courts")
        .upsert({ club_id: club.id, data: courts }, { onConflict: "club_id" });
    }
    persistCourts();
  }, [courts, club.id]);

  // ===== DERIVED DATA =====

  const sortedPlayers = sortPlayers(players);
  const waitingPlayers = sortedPlayers;

  const kingQueue = waitingPlayers.filter((p) => p.tier === "king");
  const knightQueue = waitingPlayers.filter((p) => p.tier === "knight");
  const squireQueue = waitingPlayers.filter((p) => p.tier === "squire");

  // Open Mode queues — split by last result regardless of tier
  const winnerQueue = waitingPlayers.filter((p) => p.lastResult === "win");
  const loserQueue  = waitingPlayers.filter((p) => p.lastResult === "loss");
  const newQueue    = waitingPlayers.filter((p) => !p.lastResult);

  const isOpenMode     = sessionMode === SESSION_MODES.OPEN;
  const isExtendedMode = sessionMode === SESSION_MODES.EXTENDED_LADDER;
  const isLadderMode   = sessionMode === SESSION_MODES.LADDER;

  // Extended Ladder queues (4-tier)
  const generalQueue = waitingPlayers.filter((p) => p.tier === "general");

  const getQueueByCourtType = (courtType) => {
    // Open Mode court types
    if (courtType === OPEN_COURT_TYPES.WINNER) return winnerQueue;
    if (courtType === OPEN_COURT_TYPES.LOSER)  return loserQueue;
    if (courtType === OPEN_COURT_TYPES.ANY)    return waitingPlayers;
    // Ladder + Extended Ladder court types
    if (courtType === "king")    return kingQueue;
    if (courtType === "general") return generalQueue;
    if (courtType === "knight")  return knightQueue;
    if (courtType === "squire")  return squireQueue;
    return [];
  };

  const getTierCounts = () => {
    if (isExtendedMode) {
      return {
        king:    kingQueue.length,
        general: generalQueue.length,
        knight:  knightQueue.length,
        squire:  squireQueue.length,
      };
    }
    return {
      king:   kingQueue.length,
      knight: knightQueue.length,
      squire: squireQueue.length,
    };
  };

  const getActiveTierLimits = () => isExtendedMode ? EXTENDED_TIER_LIMITS : TIER_LIMITS;

  const getEffectiveTier = (currentTier, nextTier) => {
    if (currentTier === nextTier) return currentTier;
    const counts = getTierCounts();
    const limits = getActiveTierLimits();
    const limit = limits[nextTier];
    if (!limit) return currentTier;
    const currentCount = counts[nextTier] || 0;
    if (currentCount >= limit) return currentTier;
    return nextTier;
  };

  const activePlayers = courts.reduce((count, court) => count + court.players.length, 0);
  const totalPlayers = players.length + activePlayers;
  const totalGamesPlayed = matches.length;

  const matchingPlayers =
    name.trim().length > 0
      ? directory
          .filter((player) => {
            const playerName = player.name.toLowerCase();
            const searchName = name.toLowerCase();
            return playerName.includes(searchName) && playerName !== searchName;
          })
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 5)
      : [];

  const currentAttendance = attendance.filter((r) => r.sessionId === sessionId);

  // Count unique sessions attended per player (across all sessions)
  const attendanceMap = {};
  attendance.forEach((record) => {
    if (!attendanceMap[record.playerId]) {
      attendanceMap[record.playerId] = {
        playerId: record.playerId,
        playerName: record.playerName,
        sessions: new Set(),
      };
    }
    attendanceMap[record.playerId].sessions.add(record.sessionId);
  });

  const attendanceLeaders = Object.values(attendanceMap)
    .map((entry) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      count: entry.sessions.size,
    }))
    .sort((a, b) => b.count - a.count);

  const totalSessions = Math.max(
    new Set(attendance.map((r) => r.sessionId)).size,
    1
  );

  const groupedAttendance = attendance.reduce((groups, record) => {
    const key = record.sessionId;
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
    return groups;
  }, {});

  const currentMatches = matches.filter((m) => m.sessionId === sessionId);

  const groupedMatches = matches.reduce((groups, match) => {
    const key = match.sessionId || 1;
    if (!groups[key]) groups[key] = [];
    groups[key].push(match);
    return groups;
  }, {});

  const standings = directory
    .filter((player) => (player.gamesPlayed || 0) > 0)
    .sort((a, b) => {
      const winRateA =
        (a.wins || 0) + (a.losses || 0) > 0
          ? (a.wins || 0) / ((a.wins || 0) + (a.losses || 0))
          : 0;
      const winRateB =
        (b.wins || 0) + (b.losses || 0) > 0
          ? (b.wins || 0) / ((b.wins || 0) + (b.losses || 0))
          : 0;
      if (winRateB !== winRateA) return winRateB - winRateA;
      return (b.wins || 0) - (a.wins || 0);
    });

  const editingCourt = courts.find((c) => c.id === selectedCourtForEdit);

  const hasActiveGames = () => courts.some((court) => court.players.length > 0);

  // ===== HELPER FUNCTIONS =====

  const getStandingRank = (standings, index) => {
    let rank = 1;
    for (let i = 1; i <= index; i++) {
      const current = standings[i];
      const previous = standings[i - 1];
      const currentWinRate = current.gamesPlayed > 0 ? current.wins / current.gamesPlayed : 0;
      const previousWinRate = previous.gamesPlayed > 0 ? previous.wins / previous.gamesPlayed : 0;
      const tied =
        currentWinRate === previousWinRate &&
        current.wins === previous.wins &&
        current.losses === previous.losses;
      if (!tied) rank++;
    }
    return rank;
  };

  const getAttendanceCount = (playerId) =>
    attendance.filter((r) => r.playerId === playerId).length;

  const getPlayerNameById = (id) => {
    const found = directory.find((p) => p.id === id);
    return found ? found.name : "Unknown";
  };

  const getNextTier = (courtType, won) => {
    // Extended Ladder uses the transition table
    if (isExtendedMode && EXTENDED_TIER_TRANSITIONS[courtType]) {
      return won
        ? EXTENDED_TIER_TRANSITIONS[courtType].win
        : EXTENDED_TIER_TRANSITIONS[courtType].loss;
    }
    // Ladder Mode (3-tier)
    if (courtType === "king")   return won ? "king"   : "knight";
    if (courtType === "knight") return won ? "king"   : "squire";
    if (courtType === "squire") return won ? "knight" : "squire";
    return "squire";
  };

  const recordPartners = (playerA, playerB) => {
    // NOTE: these mutations happen on court.players objects BEFORE returningPlayers is built
    // This is technically safe because returningPlayers spreads them, but ideally
    // this should be refactored to pure functions. For now, ensure the mutations persist.
    playerA.partnerHistory = {
      ...(playerA.partnerHistory || {}),
      [playerB.id]: (playerA.partnerHistory?.[playerB.id] || 0) + 1,
    };
    playerB.partnerHistory = {
      ...(playerB.partnerHistory || {}),
      [playerA.id]: (playerB.partnerHistory?.[playerA.id] || 0) + 1,
    };
    playerA.lastPartnerId = playerB.id;
    playerB.lastPartnerId = playerA.id;
  };

  const recordOpponents = (teamA, teamB) => {
    teamA.forEach((a) => { a.lastOpponents = teamB.map((p) => p.id); });
    teamB.forEach((b) => { b.lastOpponents = teamA.map((p) => p.id); });
  };

  const getSessionStats = (playerName) => {
    const sessionMatches = matches.filter(
      (m) =>
        m.sessionId === sessionId &&
        (m.teamA.includes(playerName) || m.teamB.includes(playerName))
    );
    const wins = sessionMatches.filter(
      (m) =>
        (m.winner === "A" && m.teamA.includes(playerName)) ||
        (m.winner === "B" && m.teamB.includes(playerName))
    ).length;
    const losses = sessionMatches.length - wins;
    return {
      gamesPlayed: sessionMatches.length,
      wins,
      losses,
      winRate:
        sessionMatches.length > 0
          ? Math.round((wins / sessionMatches.length) * 100)
          : 0,
    };
  };

  const getSessionSummary = (sessionMatches) => {
    const playerStats = {};
    sessionMatches.forEach((match) => {
      [...match.teamA, ...match.teamB].forEach((player) => {
        if (!playerStats[player]) playerStats[player] = { wins: 0, losses: 0 };
        const won =
          (match.winner === "A" && match.teamA.includes(player)) ||
          (match.winner === "B" && match.teamB.includes(player));
        if (won) playerStats[player].wins++;
        else playerStats[player].losses++;
      });
    });

    const durations = sessionMatches
      .filter((m) => m.startedAt && m.endedAt)
      .map((m) => (m.endedAt - m.startedAt) / 60000)
      .filter((d) => d <= 120);

    const avgDuration =
      durations.length > 0
        ? Math.max(1, Math.round(durations.reduce((a, b) => a + b, 0) / durations.length))
        : 0;

    const longestMatch =
      durations.length > 0 ? Math.max(1, Math.round(Math.max(...durations))) : 0;

    const leaderboard = Object.entries(playerStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        winRate:
          stats.wins + stats.losses > 0
            ? stats.wins / (stats.wins + stats.losses)
            : 0,
      }))
      .sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });

    const bestRecord = leaderboard[0];
    const topRecordPlayers = leaderboard.filter(
      (p) =>
        p.winRate === bestRecord?.winRate &&
        p.wins === bestRecord?.wins &&
        p.losses === bestRecord?.losses
    );

    return {
      players: Object.keys(playerStats).length,
      matches: sessionMatches.length,
      avgDuration,
      longestMatch,
      bestRecord,
      topRecordPlayers,
    };
  };

  const getAvailablePreviewPlayers = (court) => {
    if (!court) return [];
    const previewPlayers = courtPreviews[court.id] || [];

    // Use the same pool that generatePreviewForCourt uses
    const courtQueue = getQueueByCourtType(court.type);

    return courtQueue.filter(
      (player) => !previewPlayers.some((pp) => pp.id === player.id)
    );
  };

  // ===== PLAYER ACTIONS =====

  const [addingPlayer, setAddingPlayer] = useState(false);

  async function openTierSelection() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a player name.");
      return;
    }

    // In Open Mode skip tier selection — add directly with a neutral tier
    if (isOpenMode) {
      if (addingPlayer) return;
      setAddingPlayer(true);
      setPendingPlayerName(trimmedName);
      await addPlayer("squire", trimmedName);
      setAddingPlayer(false);
      return;
    }

    setPendingPlayerName(trimmedName);
    setShowTierModal(true);
  }

  const addPlayer = async (tier, overrideName) => {
    const trimmedName = (overrideName ?? pendingPlayerName).trim();

    // Tier limit only enforced in Ladder/Extended Ladder Mode
    if (!isOpenMode) {
      const limits = getActiveTierLimits();
      const tierCount = players.filter((p) => p.tier === tier).length;
      if (tierCount >= (limits[tier] || Infinity)) {
        setError(`${tier.toUpperCase()} queue reached its limit of ${limits[tier]} players.`);
        setShowTierModal(false);
        return;
      }
    }
    if (!trimmedName) { setError("Please enter a player name."); return; }
    if (trimmedName.length < 2) { setError("Player name must be at least 2 characters."); return; }
    if (trimmedName.length > 20) { setError("Player name cannot exceed 20 characters."); return; }

    const validName = /^[a-zA-Z0-9\s]+$/;
    if (!validName.test(trimmedName)) {
      setError("Only letters, numbers and spaces are allowed.");
      return;
    }

    const existsInQueue = players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
    const existsInCourts = courts.some((court) =>
      court.players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())
    );
    if (existsInQueue || existsInCourts) {
      setError(`"${trimmedName}" is already checked in.`);
      return;
    }

    const existingDirectoryPlayer = directory.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    let newPlayer;
    if (existingDirectoryPlayer) {
      newPlayer = {
        ...existingDirectoryPlayer,
        tier: existingDirectoryPlayer.tier || tier,
        consecutiveGames: existingDirectoryPlayer.consecutiveGames ?? 0,
        restedOnce: existingDirectoryPlayer.restedOnce ?? false,
        lastPartnerId: existingDirectoryPlayer.lastPartnerId ?? null,
        lastOpponents: existingDirectoryPlayer.lastOpponents ?? [],
        partnerHistory: existingDirectoryPlayer.partnerHistory || {},
        priority: existingDirectoryPlayer.priority ?? false,
        noPriority: existingDirectoryPlayer.noPriority ?? false,
        currentStreak: existingDirectoryPlayer.currentStreak ?? 0,
        bestStreak: existingDirectoryPlayer.bestStreak ?? 0,
        kingCourtEntries: existingDirectoryPlayer.kingCourtEntries ?? 0,
        waitingSince: Date.now(),
      };
    } else {
      newPlayer = {
        id: crypto.randomUUID(),
        name: trimmedName,
        consecutiveGames: 0,
        tier,
        restedOnce: false,
        lastPartnerId: null,
        lastOpponents: [],
        priority: false,
        noPriority: false,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0,
        bestStreak: 0,
        kingCourtEntries: 0,
        partnerHistory: {},
        queueGroup: "unmatched",
        waitingSince: Date.now(),
      };
      await saveDirectoryPlayer(newPlayer, club.id);
      setDirectory((prev) => [...prev, newPlayer]);
    }

    const alreadyAttended = attendance.some(
      (r) => r.sessionId === sessionId && r.playerId === newPlayer.id
    );
    if (!alreadyAttended) {
      const attendanceRecord = {
        id: crypto.randomUUID(),
        playerId: newPlayer.id,
        playerName: newPlayer.name,
        sessionId,
        timestamp: Date.now(),
      };
      await saveAttendance(attendanceRecord, club.id);
      setAttendance((prev) => [...prev, attendanceRecord]);
    }

    setPlayers((prev) => [...prev, newPlayer]);
    setName("");
    setError("");
    setPendingPlayerName("");
    setShowTierModal(false);
    inputRef.current?.focus();
  };

  const removePlayer = (id) => {
    const player = players.find((p) => p.id === id);
    if (!player) return;
    if (!window.confirm(`Remove ${player.name} from the waiting queue?`)) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleTogglePriority = async (player) => {
    const updatedPlayers = players.map((p) =>
      p.id === player.id ? { ...p, priority: !p.priority } : p
    );
    setPlayers(updatedPlayers);
    await saveDirectoryPlayer({ ...player, priority: !player.priority }, club.id);
  };

  const handleToggleNoPriority = async (player) => {
    const updatedPlayers = players.map((p) =>
      p.id === player.id ? { ...p, noPriority: !p.noPriority } : p
    );
    setPlayers(updatedPlayers);
    await saveDirectoryPlayer({ ...player, noPriority: !player.noPriority }, club.id);
  };

  const handleDeleteDirectoryPlayer = async (e, player) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete ${player.name} permanently?`);
    if (!confirmed) return;

    const isActive =
      players.some((p) => p.id === player.id) ||
      courts.some((court) => court.players.some((p) => p.id === player.id));
    if (isActive) {
      alert("Cannot delete a player currently in the queue or on a court.");
      return;
    }
    await deleteDirectoryPlayer(player.id);
    setDirectory((prev) => prev.filter((p) => p.id !== player.id));
    if (name.toLowerCase() === player.name.toLowerCase()) setName("");
  };

  const handleEditPlayerName = async (player, newName) => {
    const oldName = player.name;

    // Update the queue
    setPlayers((prev) =>
      prev.map((p) => p.id === player.id ? { ...p, name: newName } : p)
    );

    // Update players on courts
    setCourts((prev) =>
      prev.map((court) => ({
        ...court,
        players: court.players.map((p) =>
          p.id === player.id ? { ...p, name: newName } : p
        ),
      }))
    );

    // Update the directory in state + IndexedDB
    const updatedDirectoryPlayer = { ...player, name: newName };
    setDirectory((prev) =>
      prev.map((p) => p.id === player.id ? updatedDirectoryPlayer : p)
    );
    await saveDirectoryPlayer(updatedDirectoryPlayer, club.id);

    // Update match history — replace old name string in teamA/teamB arrays
    const updatedMatches = matches.map((match) => ({
      ...match,
      teamA: match.teamA.map((n) => n === oldName ? newName : n),
      teamB: match.teamB.map((n) => n === oldName ? newName : n),
    }));
    setMatches(updatedMatches);
    // Persist each changed match
    await Promise.all(updatedMatches.filter((m, i) => {
          const orig = matches[i];
          return (
            m.teamA.join() !== orig.teamA.join() ||
            m.teamB.join() !== orig.teamB.join()
          );
        })
        .map((m) => updateMatch(m))
    );

    // Update attendance records in state (localStorage persistence handled separately)
    setAttendance((prev) =>
      prev.map((r) => r.playerId === player.id ? { ...r, playerName: newName } : r)
    );

    setEditingPlayer(null);
  };

  const handleSaveAvatar = async (player, base64OrNull) => {
    const updated = { ...player, photoUrl: base64OrNull };

    // Update directory
    setDirectory((prev) =>
      prev.map((p) => p.id === player.id ? updated : p)
    );
    await saveDirectoryPlayer(updated, club.id);

    // Update queue if player is waiting
    setPlayers((prev) =>
      prev.map((p) => p.id === player.id ? { ...p, photoUrl: base64OrNull } : p)
    );

    // Update courts if player is on a court
    setCourts((prev) =>
      prev.map((court) => ({
        ...court,
        players: court.players.map((p) =>
          p.id === player.id ? { ...p, photoUrl: base64OrNull } : p
        ),
      }))
    );

    // Keep the profile modal in sync
    setSelectedPlayerProfile(updated);
  };

  // ===== COURT ACTIONS =====

  const addCourt = (courtType) => {
    setCourts((prev) => {
      const nextId = Math.max(...prev.map((c) => c.id), 0) + 1;
      return [...prev, { id: nextId, type: courtType, players: [] }];
    });
    setShowCourtTypeModal(false);
  };

  const updateCourtType = (courtId, courtType) => {
    const targetCourt = courts.find((c) => c.id === courtId);
    if (!targetCourt) return;
    if (targetCourt.players.length > 0) {
      alert("Cannot change court type while players are on the court.");
      return;
    }
    setCourts((prev) =>
      prev.map((c) => (c.id === courtId ? { ...c, type: courtType } : c))
    );
    setSelectedCourtForEdit(null);
  };

  const updateCourtFormat = (courtId, format) => {
    const targetCourt = courts.find((c) => c.id === courtId);
    if (!targetCourt) return;
    if (targetCourt.players.length > 0) {
      alert("Cannot change court format while players are on the court.");
      return;
    }
    setCourts((prev) =>
      prev.map((c) => (c.id === courtId ? { ...c, format } : c))
    );
  };

  const updatePlayerTier = async (playerId, newTier) => {
    const tierCounts = getTierCounts();
    const limits = getActiveTierLimits();
    const currentPlayer = players.find((p) => p.id === playerId);
    if (!currentPlayer) return;
    if (currentPlayer.tier !== newTier && tierCounts[newTier] >= (limits[newTier] || Infinity)) {
      alert(`${newTier.toUpperCase()} queue is already full (${limits[newTier]}/${limits[newTier]}).`);
      return;
    }
    const updatedPlayers = players.map((p) =>
      p.id === playerId ? { ...p, tier: newTier } : p
    );
    setPlayers(updatedPlayers);
    const targetPlayer = updatedPlayers.find((p) => p.id === playerId);
    if (targetPlayer) await saveDirectoryPlayer(targetPlayer, club.id);
    setSelectedPlayerForEdit(null);
  };

  const removeCourtPlayer = (courtId, playerId) => {
    const court = courts.find((c) => c.id === courtId);
    if (!court) return;
    const player = court.players.find((p) => p.id === playerId);
    if (!player) return;
    if (!window.confirm(`Remove ${player.name} from the court?`)) return;

    setPlayers((prev) =>
      sortPlayers([
        ...prev,
        {
          ...player,
          consecutiveGames: Math.max(0, (player.consecutiveGames || 0) - 1),
          waitingSince: Date.now(),
        },
      ])
    );
    setCourts((prev) =>
      prev.map((c) => {
        if (c.id !== courtId) return c;
        const updatedPlayers = c.players.filter((p) => p.id !== playerId);
        return {
          ...c,
          players: updatedPlayers,
          startedAt: updatedPlayers.length < (c.format === "singles" ? 2 : 4) ? null : c.startedAt,
        };
      })
    );
  };

  const addPlayerToCourt = (playerId, courtId) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const court = courts.find((c) => c.id === Number(courtId));
    if (!court) return;

    // In Ladder Mode enforce tier matching; in Open Mode enforce result matching
    if (!isOpenMode && court.type && player.tier !== court.type) {
      alert(
        `${player.name} belongs to the ${player.tier.toUpperCase()} queue and cannot be assigned to a ${court.type.toUpperCase()} court.`
      );
      return;
    }

    if (isOpenMode && court.type !== "any") {
      const playerResult = player.lastResult; // "win", "loss", or null
      if (court.type === "winner" && playerResult !== "win") {
        alert(`${player.name} is not a winner yet. Only winners can be assigned to a Winner Court.`);
        return;
      }
      if (court.type === "loser" && playerResult !== "loss") {
        alert(`${player.name} has not lost a game yet. Only losers can be assigned to a Loser Court.`);
        return;
      }
    }
    if (court.players.length >= (court.format === "singles" ? 2 : 4)) { alert("Court is already full."); return; }
    if (!window.confirm(`Add ${player.name} to Court ${court.id}?`)) return;

    setCourts((prev) =>
      prev.map((c) => {
        if (c.id !== Number(courtId)) return c;
        const updatedPlayers = [...c.players, player];
        return {
          ...c,
          players: updatedPlayers,
          startedAt: updatedPlayers.length === (c.format === "singles" ? 2 : 4) && !c.startedAt ? Date.now() : c.startedAt,
        };
      })
    );
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  const removeCourt = () => {
    if (courts.length <= 1) return;
    const lastCourt = courts[courts.length - 1];
    if (lastCourt.players.length > 0) {
      setPlayers((prev) =>
        sortPlayers([
          ...prev,
          ...lastCourt.players.map((p) => ({ ...p, waitingSince: Date.now() })),
        ])
      );
    }
    setCourts((prev) => prev.slice(0, -1));
  };

  const deleteSpecificCourt = (courtId) => {
    const targetCourt = courts.find((c) => c.id === courtId);
    if (!targetCourt) return;
    const confirmed = window.confirm(
      `Delete ${targetCourt.type ? targetCourt.type.toUpperCase() : "COURT"} #${targetCourt.id}?`
    );
    if (!confirmed) return;
    if (courts.length <= 1) { alert("At least one court must remain."); return; }
    if (targetCourt.players.length > 0) {
      const confirmed2 = window.confirm("Delete this court and return all players to the queue?");
      if (!confirmed2) return;
      setPlayers((prev) =>
        sortPlayers([
          ...prev,
          ...targetCourt.players.map((p) => ({ ...p, waitingSince: Date.now() })),
        ])
      );
    }
    setCourts((prev) => prev.filter((c) => c.id !== courtId));
    setSelectedCourtForEdit(null);
  };

  // ===== DRAG & DROP ACTIONS =====

  const swapCourtPlayers = (sourcePlayerId, targetPlayerId) => {
    setCourts((prevCourts) => {
      const updatedCourts = JSON.parse(JSON.stringify(prevCourts));
      let sourceLocation = null;
      let targetLocation = null;

      updatedCourts.forEach((court, courtIndex) => {
        court.players.forEach((player, playerIndex) => {
          if (player.id === sourcePlayerId) sourceLocation = { courtIndex, playerIndex };
          if (player.id === targetPlayerId) targetLocation = { courtIndex, playerIndex };
        });
      });

      if (!sourceLocation || !targetLocation) return prevCourts;

      const sourceCourt = updatedCourts[sourceLocation.courtIndex];
      const targetCourt = updatedCourts[targetLocation.courtIndex];
      const sourcePlayer = sourceCourt.players[sourceLocation.playerIndex];
      const targetPlayer = targetCourt.players[targetLocation.playerIndex];

      if (sourceCourt.type !== targetCourt.type) {
        alert(
          `Cannot swap players between ${sourceCourt.type?.toUpperCase()} and ${targetCourt.type?.toUpperCase()} courts.`
        );
        return prevCourts;
      }

      updatedCourts[sourceLocation.courtIndex].players[sourceLocation.playerIndex] = targetPlayer;
      updatedCourts[targetLocation.courtIndex].players[targetLocation.playerIndex] = sourcePlayer;
      return updatedCourts;
    });
  };

  const swapQueueAndCourtPlayer = (queuePlayerId, courtPlayerId) => {
    const queuePlayer = players.find((p) => p.id === queuePlayerId);
    if (!queuePlayer) return;
    const courtPlayer = courts.flatMap((c) => c.players).find((p) => p.id === courtPlayerId);
    if (!courtPlayer) return;

    // Find which court the court player is on
    const targetCourt = courts.find((c) =>
      c.players.some((p) => p.id === courtPlayerId)
    );

    // Enforce Open Mode court type restriction on the incoming queue player
    if (isOpenMode && targetCourt && targetCourt.type !== "any") {
      const playerResult = queuePlayer.lastResult;
      if (targetCourt.type === "winner" && playerResult !== "win") {
        alert(`${queuePlayer.name} is not a winner yet. Only winners can be placed on a Winner Court.`);
        return;
      }
      if (targetCourt.type === "loser" && playerResult !== "loss") {
        alert(`${queuePlayer.name} has not lost a game yet. Only losers can be placed on a Loser Court.`);
        return;
      }
    }

    setCourts((prevCourts) =>
      prevCourts.map((court) => ({
        ...court,
        players: court.players.map((p) => (p.id === courtPlayerId ? queuePlayer : p)),
      }))
    );
    setPlayers((prev) =>
      sortPlayers([
        ...prev.filter((p) => p.id !== queuePlayerId),
        {
          ...courtPlayer,
          consecutiveGames: Math.max(0, (courtPlayer.consecutiveGames || 0) - 1),
          waitingSince: Date.now(),
        },
      ])
    );
  };

  const moveCourtPlayerToQueue = (playerId) => {
    let playerToMove = null;
    setCourts((prev) =>
      prev.map((court) => {
        const found = court.players.find((p) => p.id === playerId);
        if (found) playerToMove = found;
        const updatedPlayers = court.players.filter((p) => p.id !== playerId);
        return {
          ...court,
          players: updatedPlayers,
          startedAt: updatedPlayers.length < (court.format === "singles" ? 2 : 4) ? null : court.startedAt,
        };
      })
    );
    if (playerToMove) {
      setPlayers((prev) =>
        sortPlayers([
          ...prev,
          {
            ...playerToMove,
            consecutiveGames: Math.max(0, (playerToMove.consecutiveGames || 0) - 1),
            waitingSince: Date.now(),
          },
        ])
      );
    }
  };

  const moveCourtPlayer = (playerId, targetCourtId) => {
    const sourceCourt = courts.find((c) => c.players.some((p) => p.id === playerId));
    const targetCourt = courts.find((c) => c.id === targetCourtId);
    if (!targetCourt) return;

    const playerToCheck = sourceCourt?.players.find((p) => p.id === playerId);
    if (playerToCheck && targetCourt.type && playerToCheck.tier !== targetCourt.type) {
      alert(`Cannot move ${playerToCheck.name} from ${playerToCheck.tier.toUpperCase()} to ${targetCourt.type.toUpperCase()} court.`);
      return;
    }
    if (sourceCourt && sourceCourt.players.length === (sourceCourt.format === "singles" ? 2 : 4)) {
      alert("Cannot move players while a match is active.");
      return;
    }
    if (sourceCourt && sourceCourt.id === targetCourtId) return;

    let playerToMove = null;
    setCourts((prev) => {
      const updated = prev.map((court) => {
        const found = court.players.find((p) => p.id === playerId);
        if (found) playerToMove = found;
        return { ...court, players: court.players.filter((p) => p.id !== playerId) };
      });
      return updated.map((court) => {
        if (court.id !== targetCourtId) return court;
        if (court.players.length >= (court.format === "singles" ? 2 : 4)) { alert("Court is full."); return court; }
        const updatedPlayers = [...court.players, playerToMove];
        return {
          ...court,
          players: updatedPlayers,
          startedAt: updatedPlayers.length === 4 && !court.startedAt ? Date.now() : court.startedAt,
        };
      });
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const dragData = active.data.current;
    if (!dragData) return;

    if (over.id === "waiting-queue" && dragData.source === "court") {
      moveCourtPlayerToQueue(active.id.replace("court-player-", ""));
      return;
    }

    const targetCourtId = Number(over.id.replace("court-", ""));

    if (dragData.source === "queue") {
      const playerId = active.id.replace("queue-player-", "");
      if (over.id.startsWith("court-player-")) {
        swapQueueAndCourtPlayer(playerId, over.id.replace("court-player-", ""));
        return;
      }
      addPlayerToCourt(playerId, targetCourtId);
      return;
    }

    if (dragData.source === "court") {
      const playerId = active.id.replace("court-player-", "");
      if (over.id.startsWith("court-player-")) {
        const sourcePlayerId = active.id.replace("court-player-", "");
        const targetPlayerId = over.id.replace("court-player-", "");
        if (sourcePlayerId !== targetPlayerId) swapCourtPlayers(sourcePlayerId, targetPlayerId);
        return;
      }
      moveCourtPlayer(playerId, targetCourtId);
    }
  };

  // ===== PREVIEW ACTIONS =====

  const generatePreviewForCourt = (court) => {
    const courtQueue = getQueueByCourtType(court.type);
    const isSingles = court.format === "singles";
    const needed = isSingles ? 2 : 4;

    // Try eligible players first; fall back to full pool if fewer than needed
    const eligible = eligiblePlayers(courtQueue);
    const pool = eligible.length >= needed ? eligible : courtQueue;

    if (isSingles) {
      if (pool.length < 2) return [];
      return pool.slice(0, 2);
    }

    const selectedPlayers = buildRotationGroup(pool);
    if (selectedPlayers.length < 4) return [];
    return createBalancedTeams(selectedPlayers);
  };

  const handleGeneratePreview = (court) => {
    const preview = generatePreviewForCourt(court);
    setCourtPreviews((prev) => ({ ...prev, [court.id]: preview }));
  };

  const regeneratePreview = (court) => {
    const currentPreview = courtPreviews[court.id];
    const isSingles = court.format === "singles";
    const needed = isSingles ? 2 : 4;
    if (!currentPreview || currentPreview.length !== needed) return;
    const shuffled = shufflePlayers(currentPreview);
    const preview = isSingles ? shuffled : createBalancedTeams(shuffled);
    setCourtPreviews((prev) => ({ ...prev, [court.id]: preview }));
    setSelectedPreviewPlayer(null);
  };

  const swapPreviewPlayers = (courtId, firstPlayerId, secondPlayerId) => {
    setCourtPreviews((prev) => {
      const preview = [...(prev[courtId] || [])];
      const firstIndex = preview.findIndex((p) => p.id === firstPlayerId);
      const secondIndex = preview.findIndex((p) => p.id === secondPlayerId);
      if (firstIndex === -1 || secondIndex === -1) return prev;
      [preview[firstIndex], preview[secondIndex]] = [preview[secondIndex], preview[firstIndex]];
      return { ...prev, [courtId]: preview };
    });
  };

  const handlePreviewPlayerClick = (courtId, player) => {
    if (!selectedPreviewPlayer) {
      setSelectedPreviewPlayer({ courtId, playerId: player.id, playerName: player.name });
      return;
    }
    if (selectedPreviewPlayer.playerId === player.id) {
      setSelectedPreviewPlayer(null);
      return;
    }
    if (selectedPreviewPlayer.courtId !== courtId) {
      setSelectedPreviewPlayer(null);
      return;
    }
    swapPreviewPlayers(courtId, selectedPreviewPlayer.playerId, player.id);
    setSelectedPreviewPlayer(null);
  };

  const addPreviewPlayer = (courtId, player) => {
    setCourtPreviews((prev) => ({
      ...prev,
      [courtId]: [...(prev[courtId] || []), player],
    }));
    setSelectedPreviewCourt(null);
  };

  const replacePreviewPlayer = (courtId, oldPlayerId, newPlayer) => {
    setCourtPreviews((prev) => ({
      ...prev,
      [courtId]: (prev[courtId] || []).map((p) => (p.id === oldPlayerId ? newPlayer : p)),
    }));
    setSelectedPreviewPlayer(null);
    setSelectedPreviewCourt(null);
  };

  const removePreviewPlayer = (courtId, playerId) => {
    setCourtPreviews((prev) => ({
      ...prev,
      [courtId]: (prev[courtId] || []).filter((p) => p.id !== playerId),
    }));
    setSelectedPreviewPlayer(null);
  };

  const confirmPreview = (courtId) => {
    const preview = courtPreviews[courtId];
    const court = courts.find((c) => c.id === courtId);
    const isSingles = court?.format === "singles";
    const needed = isSingles ? 2 : 4;

    if (!preview || preview.length !== needed) {
      alert(`Preview requires exactly ${needed} players.`);
      return;
    }
    if (court && court.players.length > 0) {
      alert("Court already has an active match.");
      return;
    }
    const previewIds = preview.map((p) => p.id);
    setCourts((prev) =>
      prev.map((c) =>
        c.id === courtId
          ? {
              ...c,
              players: preview.map((p) => ({
                ...p,
                consecutiveGames: (p.consecutiveGames || 0) + 1,
              })),
              startedAt: Date.now(),
            }
          : c
      )
    );
    setPlayers((prev) => prev.filter((p) => !previewIds.includes(p.id)));
    setCourtPreviews((prev) => {
      const updated = { ...prev };
      delete updated[courtId];
      return updated;
    });
  };

  // ===== GAME ACTIONS =====

  const assignPlayersToAllCourts = () => {
    const emptyCourts = courts.filter((c) => c.players.length === 0);
    if (emptyCourts.length === 0) { alert("No empty court available."); return; }

    if (isOpenMode) {
      // Open Mode: each court pulls from its matching result pool
      // "winner" court → winners first, fall back to new players
      // "loser"  court → losers first, fall back to new players
      // "any"    court → all waiting players
      let usedIds = new Set();

      const updatedCourts = courts.map((court) => {
        const isSingles = court.format === "singles";
        const maxPlayers = isSingles ? 2 : 4;
        // Skip courts that are already full
        if (court.players.length >= maxPlayers) return court;

        let pool;
        if (court.type === OPEN_COURT_TYPES.WINNER) {
          // Only actual winners — no fallback
          pool = winnerQueue.filter((p) => !usedIds.has(p.id));
        } else if (court.type === OPEN_COURT_TYPES.LOSER) {
          // Only actual losers — no fallback
          pool = loserQueue.filter((p) => !usedIds.has(p.id));
        } else {
          // "any" or unset — take anyone
          pool = waitingPlayers.filter((p) => !usedIds.has(p.id));
        }

        const isSinglesC = court.format === "singles";
        const needed = (isSinglesC ? 2 : 4) - court.players.length;

        if (isSinglesC) {
          const eligible = eligiblePlayers(pool);
          if (eligible.length < needed) return court;
          const selected = eligible
            .slice(0, needed)
            .map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
          selected.forEach((p) => usedIds.add(p.id));
          const allPlayers = [...court.players, ...selected];
          return { ...court, players: allPlayers, startedAt: allPlayers.length >= 2 ? (court.startedAt || Date.now()) : court.startedAt };
        }

        if (needed < 4 && court.players.length > 0) {
          // Partially filled doubles court — pull remaining needed players
          const eligible = eligiblePlayers(pool);
          if (eligible.length < needed) return court;
          const selected = eligible
            .slice(0, needed)
            .map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
          selected.forEach((p) => usedIds.add(p.id));
          const allPlayers = [...court.players, ...selected];
          return { ...court, players: allPlayers, startedAt: allPlayers.length >= 4 ? (court.startedAt || Date.now()) : court.startedAt };
        }

        const selected = buildRotationGroup(eligiblePlayers(pool));
        if (selected.length < 4) return court;

        const teams = createBalancedTeams(
          selected.map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }))
        );
        teams.forEach((p) => usedIds.add(p.id));
        return { ...court, players: teams, startedAt: Date.now() };
      });

      setCourts(updatedCourts);
      const selectedIds = [...usedIds];
      setPlayers(
        resetRestedPlayers(
          players.filter((p) => !selectedIds.includes(p.id)),
          selectedIds
        )
      );

      // Check for repeat partners in newly assigned courts
      const warnings = {};
      updatedCourts.forEach((court) => {
        if (court.players.length === 4) {
          const teamA = court.players[0].partnerHistory?.[court.players[1].id] || 0;
          const teamB = court.players[2].partnerHistory?.[court.players[3].id] || 0;
          if (teamA > 0 || teamB > 0) warnings[court.id] = { teamA, teamB };
        }
      });
      setPartnerWarnings(warnings);
      return;
    }

    // Ladder Mode — original logic unchanged
    const updatedCourts = courts.map((court) => {
      const isSingles = court.format === "singles";
      const maxPlayers = isSingles ? 2 : 4;
      if (court.players.length >= maxPlayers) return court;
      const courtQueue = getQueueByCourtType(court.type);
      const needed = maxPlayers - court.players.length;

      if (isSingles) {
        const eligible = eligiblePlayers(courtQueue);
        if (eligible.length < needed) return court;
        const selected = eligible
          .slice(0, needed)
          .map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        const allPlayers = [...court.players, ...selected];
        return { ...court, players: allPlayers, startedAt: allPlayers.length >= 2 ? (court.startedAt || Date.now()) : court.startedAt };
      }

      if (court.players.length > 0 && needed < 4) {
        // Partially filled doubles — pull remaining
        const eligible = eligiblePlayers(courtQueue);
        if (eligible.length < needed) return court;
        const selected = eligible
          .slice(0, needed)
          .map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        const allPlayers = [...court.players, ...selected];
        return { ...court, players: allPlayers, startedAt: allPlayers.length >= 4 ? (court.startedAt || Date.now()) : court.startedAt };
      }

      const selectedPlayers = buildRotationGroup(eligiblePlayers(courtQueue));
      if (selectedPlayers.length < 4) return court;

      const teams = createBalancedTeams(
        selectedPlayers.map((p) => ({
          ...p,
          consecutiveGames: (p.consecutiveGames || 0) + 1,
        }))
      );
      return { ...court, players: teams, startedAt: Date.now() };
    });

    setCourts(updatedCourts);

    const selectedIds = updatedCourts.flatMap((c) => c.players || []).map((p) => p.id);
    setPlayers(
      resetRestedPlayers(
        players.filter((p) => !selectedIds.includes(p.id)),
        selectedIds
      )
    );

    // Check for repeat partners in newly assigned courts
    const warnings = {};
    updatedCourts.forEach((court) => {
      if (court.players.length === 4) {
        const teamA = court.players[0].partnerHistory?.[court.players[1].id] || 0;
        const teamB = court.players[2].partnerHistory?.[court.players[3].id] || 0;
        if (teamA > 0 || teamB > 0) warnings[court.id] = { teamA, teamB };
      }
    });
    setPartnerWarnings(warnings);
  };

  const startNextGame = () => {
    assignPlayersToAllCourts();
  };

  const endGame = async (courtId, winningTeam) => {
    const court = courts.find((c) => c.id === courtId);
    if (!court) return;

    const isSingles = court.format === "singles";

    const matchRecord = {
      sessionId,
      startedAt: court.startedAt,
      endedAt: Date.now(),
      sessionTimestamp: new Date().toISOString(),
      date: Date.now(),
      courtId,
      format: isSingles ? "singles" : "doubles",
      teamA: isSingles ? [court.players[0]?.name] : court.players.slice(0, 2).map((p) => p.name),
      teamB: isSingles ? [court.players[1]?.name] : court.players.slice(2, 4).map((p) => p.name),
      winner: winningTeam,
    };

    const matchId = await saveMatch(matchRecord, club.id);
    const savedMatch = { ...matchRecord, id: matchId };
    setMatches((prev) => [savedMatch, ...prev]);

    // Partner/opponent tracking — doubles only
    if (!isSingles) {
      recordPartners(court.players[0], court.players[1]);
      recordPartners(court.players[2], court.players[3]);
      recordOpponents(court.players.slice(0, 2), court.players.slice(2, 4));
    }

    const returningPlayers = court.players.map((player, index) => {
      const isTeamA = isSingles ? index === 0 : index < 2;
      const won =
        (winningTeam === "A" && isTeamA) || (winningTeam === "B" && !isTeamA);
      const currentStreak = won ? (player.currentStreak || 0) + 1 : 0;

      if (isOpenMode) {
        // Open Mode: no tier changes, just update stats and lastResult
        return {
          ...player,
          consecutiveGames: player.consecutiveGames || 0,
          priority: false,
          noPriority: false,
          gamesPlayed: player.gamesPlayed + 1,
          wins: (player.wins || 0) + (won ? 1 : 0),
          losses: (player.losses || 0) + (won ? 0 : 1),
          currentStreak,
          bestStreak: Math.max(player.bestStreak || 0, currentStreak),
          queueGroup: won ? "winner" : "loser",
          lastResult: won ? "win" : "loss",
          waitingSince: Date.now(),
        };
      }

      // Ladder Mode: tier promotions/demotions unchanged
      const rawNextTier = getNextTier(court.type, won);
      const nextTier = getEffectiveTier(player.tier, rawNextTier);

      return {
        ...player,
        tier: nextTier,
        kingCourtEntries:
          (player.kingCourtEntries || 0) +
          (nextTier === "king" && player.tier !== "king" ? 1 : 0),
        consecutiveGames: player.consecutiveGames || 0,
        priority: false,
        noPriority: false,
        gamesPlayed: player.gamesPlayed + 1,
        wins: (player.wins || 0) + (won ? 1 : 0),
        losses: (player.losses || 0) + (won ? 0 : 1),
        currentStreak,
        bestStreak: Math.max(player.bestStreak || 0, currentStreak),
        queueGroup: "matched",
        lastResult: won ? "win" : "loss",
        waitingSince: Date.now(),
      };
    });

    const updatedDirectory = directory.map((dp) => {
      const updated = returningPlayers.find((p) => p.id === dp.id);
      return updated ? updated : dp;
    });

    setDirectory(updatedDirectory);
    await Promise.all(updatedDirectory.map((p) => saveDirectoryPlayer(p, club.id)));

    setPlayers((prev) => sortPlayers([...prev, ...returningPlayers]));
    setCourts((prev) =>
      prev.map((c) => (c.id === courtId ? { ...c, players: [], startedAt: null } : c))
    );

    // Clear warning for this court once game ends
    setPartnerWarnings((prev) => {
      const updated = { ...prev };
      delete updated[courtId];
      return updated;
    });
  };

  // ===== SESSION ACTIONS =====

  const startNewSession = async () => {
    if (hasActiveGames()) {
      alert("Finish or clear all active games before starting a new session.");
      return;
    }
    const confirmed = window.confirm(
      `End Session ${sessionId} and start Session ${sessionId + 1}?`
    );
    if (!confirmed) return;

    setPlayers([]);
    setCourts(getDefaultCourts(sessionMode));
    setName("");
    setError("");

    const latestMatches = await getMatches(club.id);
    const sessionMatches = latestMatches.filter((m) => m.sessionId === sessionId);
    const historyRecord = {
      id: crypto.randomUUID(),
      sessionId,
      timestamp: Date.now(),
      matchCount: sessionMatches.length,
      standings: standings.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        gamesPlayed: p.gamesPlayed,
        wins: p.wins,
        losses: p.losses,
        currentStreak: p.currentStreak || 0,
        bestStreak: p.bestStreak || 0,
      })),
    };
    await saveStandingsHistory(historyRecord, club.id);
    setStandingsHistory((prev) => [...prev, historyRecord]);

    const resetDirectory = directory.map((p) => ({
      ...p,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      currentStreak: 0,
      bestStreak: 0,
      queueGroup: "unmatched",
    }));
    await Promise.all(resetDirectory.map((p) => saveDirectoryPlayer(p, club.id)));
    setDirectory(resetDirectory);
    setSessionId((prev) => prev + 1);
    // Reset mode so the picker shows at the start of the next session
    setSessionMode(null);
    localStorage.removeItem(STORAGE_KEYS.SESSION_MODE);
    alert(`Session ${sessionId + 1} started.`);
  };

  const resetSession = () => {
    if (hasActiveGames()) {
      alert("Finish or clear all active games before resetting the session.");
      return;
    }
    const confirmed = window.confirm(`Reset Session ${sessionId}?`);
    if (!confirmed) return;
    setPlayers([]);
    setCourts(getDefaultCourts(sessionMode));
    setName("");
    setError("");
    alert(`Session ${sessionId} has been reset.`);
  };

  const deleteSession = async (sessionToDelete) => {
    const confirmed = window.confirm(`Delete Session ${sessionToDelete}?`);
    if (!confirmed) return;
    await deleteMatchesBySession(sessionToDelete, club.id);
    await deleteAttendanceBySession(sessionToDelete, club.id);
    setMatches((prev) => prev.filter((m) => m.sessionId !== sessionToDelete));
    setAttendance((prev) => prev.filter((r) => r.sessionId !== sessionToDelete));
  };

  const editMatchWinner = async (matchId, newWinner) => {
    const confirmed = window.confirm(`Change winner to Team ${newWinner}?`);
    if (!confirmed) return;
    const updatedMatches = matches.map((m) =>
      m.id === matchId ? { ...m, winner: newWinner } : m
    );
    const targetMatch = updatedMatches.find((m) => m.id === matchId);
    if (!targetMatch) { alert("Match not found."); return; }
    await updateMatch(targetMatch);
    setMatches(updatedMatches);
    await recalculateStandings(updatedMatches);
    alert("Match updated and standings recalculated.");
  };

  const clearHistory = async () => {
    const confirmed = window.confirm("Delete ALL match history?");
    if (!confirmed) return;
    await clearAllMatches(club.id);
    setMatches([]);
    alert("All match history cleared.");
  };

  const clearAttendanceRecords = async () => {
    const confirmed = window.confirm("Reset all attendance records?");
    if (!confirmed) return;
    await clearAttendance(club.id);
    setAttendance([]);
    alert("Attendance records cleared.");
  };

  const clearStandings = async () => {
    const confirmed = window.confirm("Reset ALL player statistics?");
    if (!confirmed) return;
    await clearStandingsHistory(club.id);
    setStandingsHistory([]);
    const resetPlayers = directory.map((p) => ({
      ...p,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      currentStreak: 0,
      bestStreak: 0,
      queueGroup: "unmatched",
    }));
    await Promise.all(resetPlayers.map((p) => saveDirectoryPlayer(p, club.id)));
    setDirectory(resetPlayers);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0,
        bestStreak: 0,
        queueGroup: "unmatched",
      }))
    );
    setCourts((prev) =>
      prev.map((court) => ({
        ...court,
        players: court.players.map((p) => ({
          ...p,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          currentStreak: 0,
          bestStreak: 0,
          queueGroup: "unmatched",
        })),
      }))
    );
    alert("All standings have been reset.");
  };

  const factoryReset = async () => {
    const confirmed = window.confirm(
      "WARNING: This will permanently delete ALL data including saved players. Continue?"
    );
    if (!confirmed) return;

    await clearAllMatches(club.id);
    await clearAttendance(club.id);
    await clearStandingsHistory(club.id);

    for (const player of directory) {
      await deleteDirectoryPlayer(player.id);
    }

    setMatches([]);
    setAttendance([]);
    setDirectory([]);
    setStandingsHistory([]);
    setPlayers([]);
    setCourtPreviews({});

    localStorage.removeItem(STORAGE_KEYS.COURTS);
    localStorage.removeItem(STORAGE_KEYS.SESSION_MODE);

    setCourts(getDefaultCourts(null));
    setSessionId(1);
    setSessionMode(null);

    localStorage.setItem(STORAGE_KEYS.SESSION, "1");

    alert("Factory Reset completed.");
  };

  const recalculateStandings = async (updatedMatches) => {
    const playerStats = {};
    directory.forEach((p) => {
      playerStats[p.id] = {
        ...p,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0,
        bestStreak: 0,
        queueGroup: "unmatched",
      };
    });
    updatedMatches.forEach((match) => {
      const winningPlayers = match.winner === "A" ? match.teamA : match.teamB;
      const losingPlayers = match.winner === "A" ? match.teamB : match.teamA;
      directory.forEach((p) => {
        if (winningPlayers.includes(p.name)) {
          playerStats[p.id].gamesPlayed++;
          playerStats[p.id].wins++;
        } else if (losingPlayers.includes(p.name)) {
          playerStats[p.id].gamesPlayed++;
          playerStats[p.id].losses++;
        }
      });
    });
    const updatedDirectory = Object.values(playerStats);
    await Promise.all(updatedDirectory.map((p) => saveDirectoryPlayer(p, club.id)));
    setDirectory(updatedDirectory);
    setPlayers((prev) =>
      prev.map((p) => {
        const updated = updatedDirectory.find((d) => d.id === p.id);
        return updated
          ? { ...p, gamesPlayed: updated.gamesPlayed, wins: updated.wins, losses: updated.losses }
          : p;
      })
    );
  };

  // ===== RENDER =====

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-6">

      {/* Slim sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="RallyStack" className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">RallyStack</h1>
              {club && <p className="text-xs text-slate-400 leading-tight">{club.name}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {sessionMode && !viewMode && (
              <span className={`
                hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold mr-1
                ${sessionMode === SESSION_MODES.LADDER ? "bg-yellow-100 text-yellow-800"
                  : sessionMode === SESSION_MODES.EXTENDED_LADDER ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"}
              `}>
                {sessionMode === SESSION_MODES.LADDER && "Ladder"}
                {sessionMode === SESSION_MODES.EXTENDED_LADDER && "Extended"}
                {sessionMode === SESSION_MODES.OPEN && "Open"}
              </span>
            )}

            {sessionMode && !viewMode && (
              <button
                onClick={() => {
                  if (hasActiveGames()) { alert("Finish all active games before switching modes."); return; }
                  setIsSwitchingMode(true);
                  setSessionMode(null);
                  localStorage.removeItem(STORAGE_KEYS.SESSION_MODE);
                }}
                className="h-8 px-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100"
              >
                Switch
              </button>
            )}

            <button onClick={() => setShowLiveBoard(true)}
              className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 text-sm">
              📺
            </button>
            <button
              onClick={() => { const url = `${window.location.origin}/live/${club.id}`; navigator.clipboard.writeText(url); alert("Link copied!\n" + url); }}
              className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 text-sm">
              🔗
            </button>
            <button onClick={toggleViewMode}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium ${viewMode ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
              {viewMode ? "Managing" : "View"}
            </button>
            <button onClick={onLogout}
              className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 text-sm"
              title="Log out">
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4">

        {/* Session badge (mobile) */}
        <div className="sm:hidden text-center mb-3">
          <span className={`
            inline-flex px-3 py-1 rounded-full text-xs font-semibold
            ${sessionMode === SESSION_MODES.LADDER ? "bg-yellow-100 text-yellow-800"
              : sessionMode === SESSION_MODES.EXTENDED_LADDER ? "bg-purple-100 text-purple-800"
              : sessionMode === SESSION_MODES.OPEN ? "bg-blue-100 text-blue-800"
              : "bg-slate-100 text-slate-600"}
          `}>
            Session {sessionId}
            {sessionMode === SESSION_MODES.LADDER && " · Ladder"}
            {sessionMode === SESSION_MODES.EXTENDED_LADDER && " · Extended"}
            {sessionMode === SESSION_MODES.OPEN && " · Open"}
          </span>
        </div>

        {/* View Mode — active courts read-only display */}
        {viewMode && activeTab === "standings" && (
          <div className="mb-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {courts.map((court) => (
                <div
                  key={court.id}
                  className="bg-white rounded-2xl shadow p-4 border border-slate-200"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-blue-700">
                      {court.type === "king"    && "👑 King's Court"}
                      {court.type === "general" && "🎖️ General Court"}
                      {court.type === "knight"  && "⚔️ Knight Court"}
                      {court.type === "squire"  && "🛡️ Squire Court"}
                      {court.type === "winner"  && "🏆 Winner Court"}
                      {court.type === "loser"   && "🔄 Loser Court"}
                      {court.type === "any"     && "🏓 Open Court"}
                      {!court.type              && "📌 Court"}
                      {" "}#{court.id}
                    </h3>
                    <span className="text-sm font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      {court.players.length}/{court.format === "singles" ? 2 : 4}
                    </span>
                  </div>

                  {court.players.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No active match</p>
                  ) : (
                    <div>
                      <div className="flex justify-center gap-4 text-sm font-semibold mb-2">
                        <span className="text-blue-600">🔵 Team A</span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-purple-600">🟣 Team B</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-blue-50 rounded-lg p-2">
                          {court.players.slice(0, 2).map((p) => (
                            <div key={p.id} className="font-medium">{p.name}</div>
                          ))}
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2">
                          {court.players.slice(2, 4).map((p) => (
                            <div key={p.id} className="font-medium">{p.name}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-400 mt-3">
              🔄 Auto-refreshes every 30 seconds
            </p>
          </div>
        )}

        {/* Dashboard Tab — operator only */}
        {!viewMode && activeTab === "dashboard" && (
          <>
            <SessionControls
              name={name}
              setName={setName}
              error={error}
              sessionId={sessionId}
              players={players}
              courts={courts}
              directory={directory}
              matchingPlayers={matchingPlayers}
              highlightedIndex={highlightedIndex}
              setHighlightedIndex={setHighlightedIndex}
              activePlayers={activePlayers}
              totalPlayers={totalPlayers}
              totalGamesPlayed={totalGamesPlayed}
              inputRef={inputRef}
              onOpenTierSelection={openTierSelection}
              addingPlayer={addingPlayer}
              onStartNextGame={startNextGame}
              onShowCourtTypeModal={() => setShowCourtTypeModal(true)}
              onRemoveCourt={removeCourt}
              onStartNewSession={startNewSession}
              onResetSession={resetSession}
              onFactoryReset={factoryReset}
              onDeleteDirectoryPlayer={handleDeleteDirectoryPlayer}
            />

            <DndContext
              onDragStart={(event) => setActivePlayer(event.active.data.current?.player)}
              onDragEnd={(event) => { handleDragEnd(event); setActivePlayer(null); }}
              onDragCancel={() => setActivePlayer(null)}
            >
              <div className="space-y-6">
                <div>
                  {isOpenMode ? (
                    <OpenPlayerQueue
                      winnerQueue={winnerQueue}
                      loserQueue={loserQueue}
                      newQueue={newQueue}
                      courts={courts}
                      selectedCourt={selectedCourt}
                      setSelectedCourt={setSelectedCourt}
                      onAddToCourt={addPlayerToCourt}
                      onRemovePlayer={removePlayer}
                      onTogglePriority={handleTogglePriority}
                      onToggleNoPriority={handleToggleNoPriority}
                      onViewProfile={(player) => setSelectedPlayerProfile(player)}
                      onEditName={(player) => setEditingPlayer(player)}
                    />
                  ) : (
                    <PlayerQueue
                      kingQueue={kingQueue}
                      knightQueue={knightQueue}
                      squireQueue={squireQueue}
                      generalQueue={generalQueue}
                      isExtendedMode={isExtendedMode}
                      courts={courts}
                      selectedCourt={selectedCourt}
                      setSelectedCourt={setSelectedCourt}
                      onAddToCourt={addPlayerToCourt}
                      onRemovePlayer={removePlayer}
                      onTogglePriority={handleTogglePriority}
                      onToggleNoPriority={handleToggleNoPriority}
                      onEditTier={(playerId) => setSelectedPlayerForEdit(playerId)}
                      onViewProfile={(player) => setSelectedPlayerProfile(player)}
                      onEditName={(player) => setEditingPlayer(player)}
                    />
                  )}
                </div>

                <div className="mt-4">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Active Courts</h2>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {courts.map((court) => (
                      <CourtCard
                        key={court.id}
                        court={court}
                        courtPreviews={courtPreviews}
                        selectedPreviewPlayer={selectedPreviewPlayer}
                        partnerWarning={partnerWarnings[court.id] || null}
                        onEndGame={endGame}
                        onRemoveCourtPlayer={removeCourtPlayer}
                        onSetCourtForEdit={setSelectedCourtForEdit}
                        onGeneratePreview={handleGeneratePreview}
                        onRegeneratePreview={regeneratePreview}
                        onConfirmPreview={confirmPreview}
                        onPreviewPlayerClick={handlePreviewPlayerClick}
                        onRemovePreviewPlayer={removePreviewPlayer}
                        onSetSelectedPreviewCourt={setSelectedPreviewCourt}
                        onSetSelectedPreviewPlayer={setSelectedPreviewPlayer}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <DragOverlay>
                {activePlayer ? (
                  <div
                    className="
                      w-12 h-12 rounded-full bg-blue-500 text-white
                      flex items-center justify-center font-bold
                      shadow-xl border-2 border-white
                    "
                    style={{ zIndex: 999999 }}
                  >
                    {activePlayer.name.charAt(0).toUpperCase()}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}

        {/* Standings Tab */}
        {activeTab === "standings" && (
          <StandingsTab
            standings={standings}
            standingsHistory={standingsHistory}
            sessionId={sessionId}
            getSessionStats={getSessionStats}
            getStandingRank={getStandingRank}
            getAttendanceCount={getAttendanceCount}
            onClearStandings={clearStandings}
          />
        )}

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <AttendanceTab
            attendance={attendance}
            attendanceLeaders={attendanceLeaders}
            currentAttendance={currentAttendance}
            groupedAttendance={groupedAttendance}
            groupedMatches={groupedMatches}
            sessionId={sessionId}
            totalSessions={totalSessions}
            getSessionSummary={getSessionSummary}
            onClearAttendance={clearAttendanceRecords}
          />
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <HistoryTab
            matches={matches}
            groupedMatches={groupedMatches}
            getSessionSummary={getSessionSummary}
            onEditMatchWinner={editMatchWinner}
            onDeleteSession={deleteSession}
            onClearHistory={clearHistory}
          />
        )}

      </main>

      {/* Bottom Tab Navigation — mobile native feel */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 sm:hidden safe-area-pb">
        <div className="flex justify-around py-2 pb-[env(safe-area-inset-bottom)]">
          {(viewMode
            ? ["standings", "attendance", "history"]
            : ["dashboard", "standings", "attendance", "history"]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                activeTab === tab ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <span className="text-lg">
                {tab === "dashboard" && "🏠"}
                {tab === "standings" && "🏆"}
                {tab === "attendance" && "👥"}
                {tab === "history" && "📜"}
              </span>
              <span className="text-[10px] font-medium leading-tight">
                {tab === "dashboard" && "Home"}
                {tab === "standings" && "Stats"}
                {tab === "attendance" && "Attend"}
                {tab === "history" && "History"}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop tab navigation — hidden on mobile */}
      <div className="hidden sm:block fixed bottom-0 left-0 right-0 sm:relative sm:bottom-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`grid gap-2 mb-4 ${viewMode ? "grid-cols-3" : "grid-cols-4"}`}>
            {(viewMode
              ? ["standings", "attendance", "history"]
              : ["dashboard", "standings", "attendance", "history"]
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-10 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab === "dashboard" && "🏠 Dashboard"}
                {tab === "standings" && "🏆 Standings"}
                {tab === "attendance" && "👥 Attendance"}
                {tab === "history" && "📜 History"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}

      {/* Session Mode Picker — shown when no mode is selected */}
      {!sessionMode && (
        <SessionModeModal
          sessionId={sessionId}
          onSelect={(mode) => {
            setIsSwitchingMode(false);
            handleSelectSessionMode(mode);
          }}
          onCancel={
            isSwitchingMode
              ? () => {
                  const prev = sessionMode;
                  setIsSwitchingMode(false);
                  // Restore previous mode from what was active before
                  // Since we cleared it, just re-set from courts state
                  const courtType = courts[0]?.type;
                  const restored =
                    courtType === "any" || courtType === "winner" || courtType === "loser"
                      ? "open"
                      : courtType === "general"
                      ? "extended_ladder"
                      : "ladder";
                  setSessionMode(restored);
                  localStorage.setItem(STORAGE_KEYS.SESSION_MODE, restored);
                }
              : null
          }
        />
      )}

      {/* Tier Assignment Preview — shown when switching to a ladder mode */}
      {tierAssignmentPreview && (
        <TierAssignmentPreviewModal
          assignments={tierAssignmentPreview.assignments}
          targetMode={tierAssignmentPreview.targetMode}
          onConfirm={() =>
            applyTierAssignment(
              tierAssignmentPreview.assignments,
              tierAssignmentPreview.targetMode
            )
          }
          onCancel={() => setTierAssignmentPreview(null)}
        />
      )}

      {editingPlayer && (
        <EditPlayerNameModal
          player={editingPlayer}
          onSave={handleEditPlayerName}
          onCancel={() => setEditingPlayer(null)}
        />
      )}

      {showTierModal && (
        <TierModal
          pendingPlayerName={pendingPlayerName}
          isExtendedMode={isExtendedMode}
          onSelect={addPlayer}
          onCancel={() => setShowTierModal(false)}
        />
      )}

      {showCourtTypeModal && (
        <CourtTypeModal
          sessionMode={sessionMode}
          onSelect={addCourt}
          onCancel={() => setShowCourtTypeModal(false)}
        />
      )}

      {selectedCourtForEdit && (
        <CourtSettingsModal
          editingCourt={editingCourt}
          selectedCourtForEdit={selectedCourtForEdit}
          sessionMode={sessionMode}
          onUpdateType={updateCourtType}
          onUpdateFormat={updateCourtFormat}
          onDeleteCourt={deleteSpecificCourt}
          onCancel={() => setSelectedCourtForEdit(null)}
        />
      )}

      {selectedPlayerForEdit && (
        <PlayerTierModal
          selectedPlayerForEdit={selectedPlayerForEdit}
          isExtendedMode={isExtendedMode}
          onUpdateTier={updatePlayerTier}
          onCancel={() => setSelectedPlayerForEdit(null)}
        />
      )}

      {selectedPlayerProfile && (
        <PlayerProfileModal
          player={selectedPlayerProfile}
          getAttendanceCount={getAttendanceCount}
          getPlayerNameById={getPlayerNameById}
          onSaveAvatar={handleSaveAvatar}
          onClose={() => setSelectedPlayerProfile(null)}
        />
      )}

      {selectedPreviewCourt && (
        <PreviewPlayerModal
          selectedPreviewCourt={selectedPreviewCourt}
          selectedPreviewPlayer={selectedPreviewPlayer}
          courts={courts}
          courtPreviews={courtPreviews}
          getAvailablePreviewPlayers={getAvailablePreviewPlayers}
          addPreviewPlayer={addPreviewPlayer}
          replacePreviewPlayer={replacePreviewPlayer}
          onCancel={() => setSelectedPreviewCourt(null)}
        />
      )}

      {/* Live Session Board */}
      {showLiveBoard && (
        <LiveBoard club={club} onClose={() => setShowLiveBoard(false)} />
      )}

    </div>
  );
}



