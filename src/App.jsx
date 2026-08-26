import { useEffect, useRef, useState, useMemo, useCallback, useDeferredValue } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";

import { supabase } from "./db/supabase";
import { getDirectory, saveDirectoryPlayer, deleteDirectoryPlayer } from "./db/directoryService";
import { getPlayers, savePlayers, savePlayer, removePlayer as removePlayerFromDb, clearPlayers } from "./db/playerService";
import { saveMatch, getMatches, updateMatch, deleteMatchesBySession, clearAllMatches } from "./db/matchService";
import { getAttendance, saveAttendance, clearAttendance, deleteAttendanceBySession } from "./db/attendanceService";
import { getStandingsHistory, saveStandingsHistory, clearStandingsHistory } from "./db/standingsHistoryService";
import { clearQueue } from "./db/syncQueue";

import AuthScreen from "./components/auth/AuthScreen";
import ClubSetupScreen from "./components/auth/ClubSetupScreen";

import { DEFAULT_COURTS, STORAGE_KEYS, TIER_LIMITS, EXTENDED_TIER_LIMITS, EXTENDED_TIER_TRANSITIONS, SESSION_MODES, OPEN_COURT_TYPES, getDefaultCourts } from "./constants";
import { sortPlayers, shufflePlayers } from "./utils/playerUtils";
import { calculateNewRating, getTeamRating, reverseRating } from "./utils/eloUtils";
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
import ClubPickerScreen from "./components/auth/ClubPickerScreen";
import CsvImportModal from "./components/modals/CsvImportModal";
import QrCodeModal from "./components/modals/QrCodeModal";
import SlugEditorModal from "./components/modals/SlugEditorModal";
import { useTheme } from "./contexts/ThemeContext";
import { useI18n, LANGUAGES } from "./i18n/index.jsx";
import { useToast } from "./components/ui/Toast";
import { swissPairing, roundRobinNextMatch } from "./utils/pairingUtils";
import { requestNotificationPermission, getNotificationStatus, isNotificationEnabled, setNotificationEnabled, notifyPlayerTurn } from "./utils/notifications";
import { updateClubSlug } from "./db/clubResolver";
import { useAtomicGameOps } from "./hooks/useAtomicGameOps";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { DashboardSkeleton } from "./components/ui/SkeletonLoader";
import QueueSearch from "./components/dashboard/QueueSearch";
import { isSoundEnabled, setSoundEnabled } from "./utils/timerAlert";
import { generateSessionText } from "./utils/csvUtils";
import Confetti from "./components/ui/Confetti";
import GuidedTour, { shouldShowTour } from "./components/ui/GuidedTour";
import ActivityFeed from "./components/dashboard/ActivityFeed";

// ===== AUTH WRAPPER =====
// Handles auth state and club selection. Renders the main App or auth/picker screens.
export default function App() {
  const [authUser, setAuthUser]       = useState(null);
  const [club, setClub]               = useState(null);
  const [clubs, setClubs]             = useState([]);  // all memberships
  const [authLoading, setAuthLoading] = useState(true);
  const [membershipsLoaded, setMembershipsLoaded] = useState(false);
  const [showPicker, setShowPicker]   = useState(false);
  const [showSetup, setShowSetup]     = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) loadMemberships(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) loadMemberships(session.user.id);
      else { setClub(null); setClubs([]); setAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadMemberships = async (userId) => {
    const { data } = await supabase
      .from("club_members")
      .select("club_id, role, club:clubs(*)")
      .eq("user_id", userId);

    const memberships = data || [];
    setClubs(memberships);

    if (memberships.length === 1) {
      // Only 1 club — go directly
      setClub(memberships[0].club);
    } else if (memberships.length > 1) {
      // Multiple clubs — check if there's a saved preference
      const savedClubId = localStorage.getItem("kngsstack_active_club");
      const saved = memberships.find((m) => m.club_id === savedClubId);
      if (saved) {
        setClub(saved.club);
      } else {
        setShowPicker(true);
      }
    } else {
      // No clubs — show setup screen
      setClub(null);
    }

    setAuthLoading(false);
    setMembershipsLoaded(true);
  };

  const handleSelectClub = (selectedClub) => {
    setClub(selectedClub);
    setShowPicker(false);
    localStorage.setItem("kngsstack_active_club", selectedClub.id);
  };

  const handleCreateClub = () => {
    setShowPicker(false);
    setShowSetup(true);
  };

  const handleClubCreated = async (newClub) => {
    // Add owner as member
    await supabase.from("club_members").insert({
      club_id: newClub.id,
      user_id: authUser.id,
      role: "owner",
    });
    setClub(newClub);
    setShowSetup(false);
    localStorage.setItem("kngsstack_active_club", newClub.id);
    loadMemberships(authUser.id);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="" className="w-12 h-12 mx-auto mb-4" />
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!authUser) return <AuthScreen />;

  // Still loading memberships — show loading
  if (!membershipsLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="" className="w-12 h-12 mx-auto mb-4" />
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  // Show club setup (creating a new club)
  if (showSetup || (clubs.length === 0 && !club)) {
    return (
      <ClubSetupScreen
        user={authUser}
        onClubCreated={handleClubCreated}
      />
    );
  }

  // Show club picker if multiple clubs or user requests it
  if (showPicker || (clubs.length > 1 && !club)) {
    return (
      <ClubPickerScreen
        user={authUser}
        clubs={clubs}
        onSelectClub={handleSelectClub}
        onCreateClub={handleCreateClub}
        onRefresh={() => loadMemberships(authUser.id)}
      />
    );
  }

  // No clubs — show setup
  if (!club) return (
    <ClubSetupScreen
      user={authUser}
      onClubCreated={handleClubCreated}
    />
  );

  return (
    <AppMain
      club={club}
      authUser={authUser}
      clubs={clubs}
      onSwitchClub={() => setShowPicker(true)}
      onDeleteClub={async () => {
        if (!window.confirm(`Delete "${club.name}" permanently? This will delete ALL data (players, matches, history). This cannot be undone.`)) return;
        if (!window.confirm("Are you REALLY sure? Type the club name in the next prompt to confirm.")) return;
        const typed = window.prompt(`Type "${club.name}" to confirm deletion:`);
        if (typed !== club.name) { addToast("Club name didn't match.", "error"); return; }

        // Delete all related data
        await supabase.from("players").delete().eq("club_id", club.id);
        await supabase.from("directory").delete().eq("club_id", club.id);
        await supabase.from("matches").delete().eq("club_id", club.id);
        await supabase.from("attendance").delete().eq("club_id", club.id);
        await supabase.from("standings_history").delete().eq("club_id", club.id);
        await supabase.from("courts").delete().eq("club_id", club.id);
        await supabase.from("club_members").delete().eq("club_id", club.id);
        await supabase.from("clubs").delete().eq("id", club.id);

        localStorage.removeItem("kngsstack_active_club");
        setClub(null);
        setClubs([]);
        loadMemberships(authUser.id);
        addToast("Club deleted.", "success");
      }}
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
function AppMain({ club, authUser, clubs, onSwitchClub, onDeleteClub, onLogout }) {

  // ===== THEME & I18N =====
  const { dark, toggle: toggleDark } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { addToast } = useToast();

  // ===== REFS =====
  const inputRef = useRef(null);
  const endingGameRef = useRef(new Set()); // tracks courts currently processing endGame

  // ===== UI STATE =====
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  // ===== VIEW MODE =====
  // Per-device read-only mode. Stored in localStorage so it persists on refresh.
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("KNGS Stack_view_mode") === "true";
  });

  const toggleViewMode = () => {
    setViewMode((prev) => {
      const next = !prev;
      localStorage.setItem("KNGS Stack_view_mode", String(next));
      if (next) setActiveTab("standings"); // default to standings in view mode
      return next;
    });
  };

  // ===== REST TIMER / COOLDOWN =====
  // Number of minutes a player must rest after playing. 0 = disabled.
  const [cooldownMinutes, setCooldownMinutes] = useState(() => {
    return Number(localStorage.getItem("rallystack_cooldown") || 0);
  });

  // ===== SOUND TOGGLE =====
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled);

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
  const [tapSelectedPlayer, setTapSelectedPlayer] = useState(null); // tap-to-assign: selected player waiting for court tap
  const [selectedCourt, setSelectedCourt] = useState({});
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [tierAssignmentPreview, setTierAssignmentPreview] = useState(null);
  const [partnerWarnings, setPartnerWarnings] = useState({});
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showQrModal, setShowQrModal] = useState(null); // "checkin" | "liveboard" | null
  const [showSlugEditor, setShowSlugEditor] = useState(false);
  const [pendingEndGame, setPendingEndGame] = useState(null); // { courtId, winningTeam } — for score prompt
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [queueSearchQuery, setQueueSearchQuery] = useState("");
  const [confetti, setConfetti] = useState(null); // { color: "blue"|"purple" } or null
  const [activityEvents, setActivityEvents] = useState([]);
  const [showTour, setShowTour] = useState(shouldShowTour);
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
    setCourts((prev) => {
      if (mode === "extended_ladder") {
        const tierTypes = ["king", "general", "knight", "squire"];
        return prev.map((c, i) => {
          if (c.players.length > 0) return c;
          return { ...c, type: tierTypes[i % tierTypes.length] };
        });
      }
      if (mode === "ladder") {
        const tierTypes = ["king", "knight", "squire"];
        return prev.map((c, i) => {
          if (c.players.length > 0) return c;
          return { ...c, type: tierTypes[i % tierTypes.length] };
        });
      }
      return prev.map((c) => {
        if (c.players.length > 0) return c;
        return { ...c, type: mode === "open" ? "any" : null };
      });
    });

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

    const limits = targetMode === SESSION_MODES.EXTENDED_LADDER
      ? { king: 8, general: 10, knight: 10, squire: 10 }
      : { king: 8, knight: 10, squire: 10 };

    const tiers = Object.keys(limits);
    const tierCount = tiers.length;
    const totalPlayers = sorted.length;

    // Calculate even distribution, respecting caps
    const perTier = Math.floor(totalPlayers / tierCount);
    const tierSizes = {};
    let remaining = totalPlayers;

    // First pass: assign min(perTier, limit) to each tier
    for (const tier of tiers) {
      tierSizes[tier] = Math.min(perTier, limits[tier]);
      remaining -= tierSizes[tier];
    }

    // Second pass: distribute remainder to tiers that have room (bottom tiers first for overflow)
    for (let i = tiers.length - 1; i >= 0 && remaining > 0; i--) {
      const tier = tiers[i];
      const canAdd = limits[tier] - tierSizes[tier];
      const toAdd = Math.min(canAdd, remaining);
      tierSizes[tier] += toAdd;
      remaining -= toAdd;
    }

    // Build assignments
    const assignments = [];
    let playerIndex = 0;

    for (const tier of tiers) {
      for (let j = 0; j < tierSizes[tier] && playerIndex < sorted.length; j++) {
        assignments.push({ player: sorted[playerIndex], tier });
        playerIndex++;
      }
    }

    // Any overflow beyond all limits → squire
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

    // Persist tier changes to Supabase (players table + directory)
    updatedPlayers.forEach((p) => {
      savePlayer(p, club.id);
      saveDirectoryPlayer(p, club.id);
    });

    // Update directory in state as well
    setDirectory((prev) => prev.map((dp) => {
      const assignment = assignments.find((a) => a.player.id === dp.id);
      return assignment ? { ...dp, tier: assignment.tier } : dp;
    }));

    // Update courts to the correct default type for the target mode
    setCourts((prev) => {
      if (targetMode === "extended_ladder") {
        const tierTypes = ["king", "general", "knight", "squire"];
        return prev.map((c, i) => {
          if (c.players.length > 0) return c;
          return { ...c, type: tierTypes[i % tierTypes.length] };
        });
      }
      if (targetMode === "ladder") {
        const tierTypes = ["king", "knight", "squire"];
        return prev.map((c, i) => {
          if (c.players.length > 0) return c;
          return { ...c, type: tierTypes[i % tierTypes.length] };
        });
      }
      return prev.map((c) => {
        if (c.players.length > 0) return c;
        return { ...c, type: targetMode === "open" ? "any" : null };
      });
    });

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
    return Number(localStorage.getItem(`${STORAGE_KEYS.SESSION}_${club.id}`) || 1);
  });

  // ===== EFFECTS =====

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEYS.SESSION}_${club.id}`, sessionId);
  }, [sessionId, club.id]);

  // Timer is now handled by CourtTimer component — no need for full-app re-render

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
    const timer = setInterval(refresh, 5000);
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
        setPlayersLoaded(true); // Don't leave user stuck on skeleton
      }
    }
    loadAll();
  }, [club.id]);

  // ===== MANUAL REFRESH (operator dashboard) =====
  const handleManualRefresh = async () => {
    try {
      const [freshPlayers, freshDir, freshMatches, freshAttendance] = await Promise.all([
        getPlayers(club.id),
        getDirectory(club.id),
        getMatches(club.id),
        getAttendance(club.id),
      ]);
      setPlayers(freshPlayers);
      setDirectory(freshDir);
      setMatches(freshMatches);
      setAttendance(freshAttendance);

    } catch (err) {
      console.error("Manual refresh failed:", err);
    }
  };

  // Players are now saved individually (event-driven) — no bulk sync effect needed

  // ===== ATOMIC GAME OPERATIONS (prevents stale closures) =====
  const { atomicAssignToCourts, atomicEndGame, atomicClearCourt, atomicRemoveCourtPlayer } =
    useAtomicGameOps({ players, courts, setPlayers, setCourts });

  // ===== KEYBOARD SHORTCUTS (desktop) =====
  const startNextGameRef = useRef(null);
  useKeyboardShortcuts({
    onStartGame: () => { if (!viewMode && activeTab === "dashboard") startNextGameRef.current?.(); },
    onFocusInput: () => inputRef.current?.focus(),
    onCloseModal: () => {
      setShowTierModal(false);
      setShowCourtTypeModal(false);
      setSelectedCourtForEdit(null);
      setSelectedPlayerForEdit(null);
      setSelectedPlayerProfile(null);
      setEditingPlayer(null);
      setShowCsvImport(false);
      setShowQrModal(null);
      setShowSlugEditor(false);
      setShowMobileMenu(false);
      if (!sessionMode) setSessionMode(localStorage.getItem(STORAGE_KEYS.SESSION_MODE) || "open");
    },
    onEndCourt: (index) => {
      const court = courts[index];
      if (court && court.players.length >= (court.format === "singles" ? 2 : 4)) {
        setPendingEndGame({ courtId: court.id, winningTeam: null });
      }
    },
    enabled: !viewMode,
  });

  // ===== SAVE COURTS TO SUPABASE =====
  useEffect(() => {
    async function persistCourts() {
      // Save to localStorage for fast local reads
      localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(courts));
      // Save to Supabase for public board access
      const { error } = await supabase
        .from("courts")
        .upsert({ club_id: club.id, data: courts }, { onConflict: "club_id" });
      if (error) {
        console.error("Failed to persist courts to Supabase:", error);
        addToast("⚠️ Court data couldn't be saved. Check your connection.", "warning");
      }
    }
    persistCourts();
  }, [courts, club.id]);

  // ===== DERIVED DATA (memoized for performance) =====

  const sortedPlayers = useMemo(() => sortPlayers(players), [players]);
  // Filter out any players that are currently on courts (safety check)
  const courtPlayerIds = useMemo(() => new Set(courts.flatMap((c) => c.players || []).map((p) => p.id)), [courts]);
  // Deduplicate players by ID (prevents duplicate rendering)
  const waitingPlayers = useMemo(() => {
    const seenIds = new Set();
    return sortedPlayers.filter((p) => {
      if (courtPlayerIds.has(p.id) || seenIds.has(p.id) || p.waitlisted) return false;
      seenIds.add(p.id);
      return true;
    });
  }, [sortedPlayers, courtPlayerIds]);

  // Waitlisted players (checked in via public link, awaiting operator approval)
  const waitlistedPlayers = useMemo(() => {
    return sortedPlayers.filter((p) => p.waitlisted && !courtPlayerIds.has(p.id));
  }, [sortedPlayers, courtPlayerIds]);

  // Players available for auto-fill (not on cooldown)
  const readyPlayers = useMemo(() => waitingPlayers.filter((p) => !p.cooldownUntil || Date.now() >= p.cooldownUntil), [waitingPlayers]);

  const kingQueue = useMemo(() => waitingPlayers.filter((p) => p.tier === "king"), [waitingPlayers]);
  const knightQueue = useMemo(() => waitingPlayers.filter((p) => p.tier === "knight"), [waitingPlayers]);
  const squireQueue = useMemo(() => waitingPlayers.filter((p) => p.tier === "squire"), [waitingPlayers]);

  // Open Mode queues — split by last result regardless of tier
  const winnerQueue = useMemo(() => waitingPlayers.filter((p) => p.lastResult === "win"), [waitingPlayers]);
  const loserQueue  = useMemo(() => waitingPlayers.filter((p) => p.lastResult === "loss"), [waitingPlayers]);
  const newQueue    = useMemo(() => waitingPlayers.filter((p) => !p.lastResult), [waitingPlayers]);

  const isOpenMode     = sessionMode === SESSION_MODES.OPEN;
  const isExtendedMode = sessionMode === SESSION_MODES.EXTENDED_LADDER;
  const isLadderMode   = sessionMode === SESSION_MODES.LADDER;
  const isKingOfCourt  = sessionMode === SESSION_MODES.KING_OF_COURT;
  const isRoundRobin   = sessionMode === SESSION_MODES.ROUND_ROBIN;
  const isSwiss        = sessionMode === SESSION_MODES.SWISS;
  const isRandomDraw   = sessionMode === SESSION_MODES.RANDOM_DRAW;
  const isFixedTeams   = sessionMode === SESSION_MODES.FIXED_TEAMS;
  const isChallenge    = sessionMode === SESSION_MODES.CHALLENGE;

  const isEloMatch    = sessionMode === SESSION_MODES.ELO_MATCH;

  // Modes that don't use tier-based queues
  const isTierless = isOpenMode || isKingOfCourt || isRandomDraw || isRoundRobin || isSwiss || isFixedTeams || isChallenge || isEloMatch;

  // Extended Ladder queues (4-tier)
  const generalQueue = useMemo(() => waitingPlayers.filter((p) => p.tier === "general"), [waitingPlayers]);

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
    // Generic courts (new modes) — return all waiting players
    return waitingPlayers;
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

  const activePlayers = useMemo(() => courts.reduce((count, court) => count + court.players.length, 0), [courts]);
  const totalPlayers = players.length + activePlayers;
  const totalGamesPlayed = matches.length;

  // Debounced matching players with deferred value
  const deferredName = useDeferredValue(name);
  const matchingPlayers = useMemo(() =>
    deferredName.trim().length > 0
      ? directory
          .filter((player) => {
            const playerName = player.name.toLowerCase();
            const searchName = deferredName.toLowerCase();
            return playerName.includes(searchName) && playerName !== searchName;
          })
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 5)
      : []
  , [deferredName, directory]);

  const currentAttendance = useMemo(() => attendance.filter((r) => r.sessionId === sessionId), [attendance, sessionId]);

  // Count unique sessions attended per player (across all sessions)
  const attendanceLeaders = useMemo(() => {
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
    return Object.values(attendanceMap)
      .map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
        count: entry.sessions.size,
      }))
      .sort((a, b) => b.count - a.count);
  }, [attendance]);

  const totalSessions = useMemo(() => Math.max(
    new Set(attendance.map((r) => r.sessionId)).size,
    1
  ), [attendance]);

  const groupedAttendance = useMemo(() => attendance.reduce((groups, record) => {
    const key = record.sessionId;
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
    return groups;
  }, {}), [attendance]);

  const currentMatches = useMemo(() => matches.filter((m) => m.sessionId === sessionId), [matches, sessionId]);

  const groupedMatches = useMemo(() => matches.reduce((groups, match) => {
    const key = match.sessionId || 1;
    if (!groups[key]) groups[key] = [];
    groups[key].push(match);
    return groups;
  }, {}), [matches]);

  const standings = useMemo(() => directory
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
    }), [directory]);

  // Estimated wait time calculation (based on avg match duration and queue position)
  const estimatedWaitPerPlayer = useMemo(() => {
    const recentMatches = matches.filter((m) => m.startedAt && m.endedAt).slice(0, 20);
    if (recentMatches.length === 0) return null;
    const avgDuration = recentMatches.reduce((sum, m) => sum + (m.endedAt - m.startedAt), 0) / recentMatches.length / 60000;
    const activeCourts = courts.filter((c) => c.players.length >= (c.format === "singles" ? 2 : 4)).length;
    if (activeCourts === 0) return null;
    const playersPerRound = activeCourts * 4;
    return Math.round(avgDuration); // minutes per round
  }, [matches, courts]);

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
    // Safe immutable partner tracking — mutations applied to the spread copies in returningPlayers
    const histA = { ...(playerA.partnerHistory || {}), [playerB.id]: (playerA.partnerHistory?.[playerB.id] || 0) + 1 };
    const histB = { ...(playerB.partnerHistory || {}), [playerA.id]: (playerB.partnerHistory?.[playerA.id] || 0) + 1 };
    playerA.partnerHistory = histA;
    playerB.partnerHistory = histB;
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

    // In tierless modes skip tier selection — add directly
    if (isTierless) {
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
    if (!isTierless) {
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

    const validName = /^[\p{L}\p{N}\s'.-]+$/u;
    if (!validName.test(trimmedName)) {
      setError("Only letters, numbers, spaces, hyphens and apostrophes are allowed.");
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
        cooldownUntil: null,
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
    savePlayer(newPlayer, club.id); // persist immediately
    setName("");
    setError("");
    setPendingPlayerName("");
    setShowTierModal(false);
    inputRef.current?.focus();
  };

  // ===== BULK IMPORT =====
  const handleBulkImport = async (importedPlayers) => {
    const addedNames = new Set(players.map((p) => p.name.toLowerCase()));
    courts.forEach((c) => c.players.forEach((p) => addedNames.add(p.name.toLowerCase())));
    const newPlayers = [];
    const newAttendance = [];

    for (const { name: playerName, tier } of importedPlayers) {
      if (addedNames.has(playerName.toLowerCase())) continue;
      addedNames.add(playerName.toLowerCase());

      const existingDirectoryPlayer = directory.find(
        (p) => p.name.toLowerCase() === playerName.toLowerCase()
      );

      let newPlayer;
      if (existingDirectoryPlayer) {
        newPlayer = {
          ...existingDirectoryPlayer,
          tier: existingDirectoryPlayer.tier || tier,
          consecutiveGames: 0,
          restedOnce: false,
          lastPartnerId: null,
          lastOpponents: [],
          partnerHistory: existingDirectoryPlayer.partnerHistory || {},
          priority: false,
          noPriority: false,
          cooldownUntil: null,
          waitingSince: Date.now(),
        };
      } else {
        newPlayer = {
          id: crypto.randomUUID(),
          name: playerName,
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

      // Attendance
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
        newAttendance.push(attendanceRecord);
      }

      newPlayers.push(newPlayer);
      savePlayer(newPlayer, club.id);
    }

    // Batch state updates
    if (newPlayers.length > 0) setPlayers((prev) => [...prev, ...newPlayers]);
    if (newAttendance.length > 0) setAttendance((prev) => [...prev, ...newAttendance]);
  };

  const removePlayer = (id) => {
    const player = players.find((p) => p.id === id);
    if (!player) return;
    // Remove immediately, show undo toast
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    removePlayerFromDb(id);
    if (navigator.vibrate) navigator.vibrate(30);
    addToast(`${player.name} removed`, "info", 4000);
  };

  // ===== WAITLIST ACTIONS =====
  const acceptWaitlistedPlayer = async (playerId) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const accepted = { ...player, waitlisted: false, waitingSince: Date.now() };
    setPlayers((prev) => prev.map((p) => p.id === playerId ? accepted : p));
    await savePlayer(accepted, club.id);
    addToast(`${player.name} added to queue`, "success");
  };

  const acceptAllWaitlisted = async () => {
    if (waitlistedPlayers.length === 0) return;
    const updated = players.map((p) =>
      p.waitlisted ? { ...p, waitlisted: false, waitingSince: Date.now() } : p
    );
    setPlayers(updated);
    await Promise.all(
      waitlistedPlayers.map((p) => savePlayer({ ...p, waitlisted: false, waitingSince: Date.now() }, club.id))
    );
    addToast(`${waitlistedPlayers.length} players added to queue`, "success");
  };

  const rejectWaitlistedPlayer = async (playerId) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    removePlayerFromDb(playerId);
    addToast(`${player.name} rejected`, "info");
  };

  const handleTogglePriority = async (player) => {
    const updated = { ...player, priority: !player.priority };
    setPlayers((prev) => prev.map((p) => p.id === player.id ? updated : p));
    await savePlayer(updated, club.id);
    await saveDirectoryPlayer(updated, club.id);
  };

  const handleToggleNoPriority = async (player) => {
    const updated = { ...player, noPriority: !player.noPriority };
    setPlayers((prev) => prev.map((p) => p.id === player.id ? updated : p));
    await savePlayer(updated, club.id);
    await saveDirectoryPlayer(updated, club.id);
  };

  // Accept/dismiss a challenge: clear the pendingChallenge from the player
  const handleAcceptChallenge = async (player) => {
    const ch = player.pendingChallenge;
    if (!ch) return;

    const isDoubles = ch.type === "doubles";
    const challenger = players.find((p) => p.id === ch.fromId);

    // Clear the challenge flag from this player (and second opponent if doubles)
    const updatedPlayer = { ...player };
    delete updatedPlayer.pendingChallenge;
    setPlayers((prev) => prev.map((p) => p.id === player.id ? updatedPlayer : p));
    await savePlayer(updatedPlayer, club.id);

    // For doubles: also clear pendingChallenge from the second opponent
    if (isDoubles && ch.opponents && ch.opponents.length > 1) {
      const secondOpponent = players.find(
        (p) => p.name.toLowerCase() === ch.opponents[1].toLowerCase() && p.id !== player.id
      );
      if (secondOpponent && secondOpponent.pendingChallenge) {
        const updatedSecond = { ...secondOpponent };
        delete updatedSecond.pendingChallenge;
        setPlayers((prev) => prev.map((p) => p.id === secondOpponent.id ? updatedSecond : p));
        await savePlayer(updatedSecond, club.id);
      }
    }

    // Gather all match participants
    let matchPlayers = [];

    if (isDoubles) {
      // Team A: challenger + partner
      const partner = ch.partner ? players.find((p) => p.name.toLowerCase() === ch.partner.toLowerCase()) : null;
      // Team B: both opponents
      const opponent1 = updatedPlayer;
      const opponent2 = ch.opponents && ch.opponents.length > 1
        ? players.find((p) => p.name.toLowerCase() === ch.opponents[1].toLowerCase() && p.id !== player.id)
        : null;

      if (challenger) matchPlayers.push(challenger);
      if (partner) matchPlayers.push(partner);
      matchPlayers.push(opponent1);
      if (opponent2) matchPlayers.push(opponent2);
    } else {
      // Singles: challenger vs opponent
      if (challenger) matchPlayers.push(challenger);
      matchPlayers.push(updatedPlayer);
    }

    // Clean up all players
    matchPlayers = matchPlayers.map((p) => {
      const clean = { ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 };
      delete clean.pendingChallenge;
      return clean;
    });

    const needed = isDoubles ? 4 : 2;

    if (matchPlayers.length >= needed) {
      // Find an empty court
      const emptyCourt = courts.find((c) => c.players.length === 0);
      if (emptyCourt) {
        const courtPlayers = matchPlayers.slice(0, needed);
        const courtFormat = isDoubles ? "doubles" : "singles";
        const updatedCourts = courts.map((c) => {
          if (c.id !== emptyCourt.id) return c;
          return { ...c, players: courtPlayers, format: courtFormat, startedAt: Date.now() };
        });
        setCourts(updatedCourts);
        const usedIds = courtPlayers.map((p) => p.id);
        setPlayers((prev) => prev.filter((p) => !usedIds.includes(p.id)));
        usedIds.forEach((id) => removePlayerFromDb(id));

        const teamANames = courtPlayers.slice(0, needed / 2).map((p) => p.name).join(" & ");
        const teamBNames = courtPlayers.slice(needed / 2).map((p) => p.name).join(" & ");
        addToast(`⚔️ ${teamANames} vs ${teamBNames} — matched on Court #${emptyCourt.id}!`, "success", 5000);
      } else {
        const names = matchPlayers.map((p) => p.name).join(", ");
        addToast(`Challenge accepted! No empty court available. Assign manually: ${names}`, "warning", 5000);
      }
    } else {
      const names = matchPlayers.map((p) => p.name).join(", ");
      addToast(`Challenge accepted but not all players found. Found: ${names}. Assign manually.`, "warning", 5000);
    }
  };

  const handleDeleteDirectoryPlayer = async (e, player) => {
    e.stopPropagation();

    const isActive =
      players.some((p) => p.id === player.id) ||
      courts.some((court) => court.players.some((p) => p.id === player.id));
    if (isActive) {
      addToast("Cannot delete — player is active.", "error");
      return;
    }
    await deleteDirectoryPlayer(player.id);
    setDirectory((prev) => prev.filter((p) => p.id !== player.id));
    if (name.toLowerCase() === player.name.toLowerCase()) setName("");
    addToast(`${player.name} deleted from directory`, "info");
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

  const handleSaveNotes = async (player, notes) => {
    const updated = { ...player, notes };
    setDirectory((prev) => prev.map((p) => p.id === player.id ? updated : p));
    await saveDirectoryPlayer(updated, club.id);
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
      addToast("Cannot change court type while players are on court.", "warning");
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
      addToast("Cannot change format while players are on court.", "warning");
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
      addToast(`${newTier.toUpperCase()} queue is already full (${limits[newTier]}/${limits[newTier]}).`, "warning");
      return;
    }
    const updatedPlayers = players.map((p) =>
      p.id === playerId ? { ...p, tier: newTier } : p
    );
    setPlayers(updatedPlayers);
    const targetPlayer = updatedPlayers.find((p) => p.id === playerId);
    if (targetPlayer) {
      await savePlayer(targetPlayer, club.id);
      await saveDirectoryPlayer(targetPlayer, club.id);
    }
    setSelectedPlayerForEdit(null);
  };

  const removeCourtPlayer = (courtId, playerId) => {
    const court = courts.find((c) => c.id === courtId);
    if (!court) return;
    const player = court.players.find((p) => p.id === playerId);
    if (!player) return;

    const returningPlayer = {
      ...player,
      consecutiveGames: Math.max(0, (player.consecutiveGames || 0) - 1),
      cooldownUntil: null,
      waitingSince: Date.now(),
    };

    atomicRemoveCourtPlayer(courtId, playerId, returningPlayer);
    savePlayer(returningPlayer, club.id);
    addToast(`${player.name} returned to queue`, "info");
  };

  const clearCourt = (courtId) => {
    const court = courts.find((c) => c.id === courtId);
    if (!court || court.players.length === 0) return;

    const returningPlayers = court.players.map((p) => ({
      ...p,
      consecutiveGames: Math.max(0, (p.consecutiveGames || 0) - 1),
      cooldownUntil: null,
      waitingSince: Date.now(),
    }));

    atomicClearCourt(courtId, returningPlayers);
    returningPlayers.forEach((p) => savePlayer(p, club.id));
    addToast(`Court #${courtId} cleared — ${returningPlayers.length} players returned to queue`, "info");
  };

  const addPlayerToCourt = (playerId, courtId) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const court = courts.find((c) => c.id === Number(courtId));
    if (!court) return;

    // In Ladder Mode enforce tier matching; in tierless modes skip this check
    if (!isTierless && court.type && player.tier !== court.type) {
      addToast(`${player.name} belongs to ${player.tier.toUpperCase()} queue — cannot assign to ${court.type.toUpperCase()} court.`, "warning");
      return;
    }

    if (isOpenMode && court.type !== "any") {
      const playerResult = player.lastResult;
      if (court.type === "winner" && playerResult !== "win") {
        addToast(`${player.name} is not a winner yet. Only winners can be assigned to a Winner Court.`, "warning");
        return;
      }
      if (court.type === "loser" && playerResult !== "loss") {
        addToast(`${player.name} has not lost a game yet. Only losers can be assigned to a Loser Court.`, "warning");
        return;
      }
    }
    if (court.players.length >= (court.format === "singles" ? 2 : 4)) { addToast("Court is full.", "warning"); return; }

    // Assign immediately (no blocking confirm)
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
    removePlayerFromDb(playerId);
    addToast(`${player.name} → Court #${court.id}`, "success", 3000);
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
    if (courts.length <= 1) { addToast("At least one court must remain.", "warning"); return; }
    if (targetCourt.players.length > 0) {
      setPlayers((prev) =>
        sortPlayers([
          ...prev,
          ...targetCourt.players.map((p) => ({ ...p, waitingSince: Date.now() })),
        ])
      );
    }
    setCourts((prev) => {
      const remaining = prev.filter((c) => c.id !== courtId);
      // Auto-renumber courts sequentially (1, 2, 3, ...) to avoid gaps
      return remaining.map((c, i) => ({ ...c, id: i + 1 }));
    });
    // Clear stale data keyed by old court IDs
    setCourtPreviews({});
    setPartnerWarnings({});
    setSelectedCourtForEdit(null);
    addToast(`Court #${courtId} deleted`, "info");
  };

  const renameCourt = (courtId, newNumber) => {
    // Check if the new number is already taken
    const exists = courts.find((c) => c.id === newNumber && c.id !== courtId);
    if (exists) {
      addToast(`Court #${newNumber} already exists. Pick a different number.`, "warning");
      return;
    }
    setCourts((prev) =>
      prev.map((c) => c.id === courtId ? { ...c, id: newNumber } : c)
    );
    setSelectedCourtForEdit(null);
    addToast(`Court renamed to #${newNumber}`, "success");
  };

  const toggleCourtLock = (courtId) => {
    setCourts((prev) =>
      prev.map((c) => c.id === courtId ? { ...c, locked: !c.locked } : c)
    );
  };

  const setCourtCustomName = (courtId, name) => {
    setCourts((prev) =>
      prev.map((c) => c.id === courtId ? { ...c, customName: name } : c)
    );
    addToast(name ? `Court #${courtId} named "${name}"` : `Court #${courtId} name cleared`, "success");
  };

  // ===== DRAG & DROP ACTIONS =====

  const swapCourtPlayers = (sourcePlayerId, targetPlayerId) => {
    setCourts((prevCourts) => {
      const updatedCourts = prevCourts.map((c) => ({ ...c, players: [...c.players] }));
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
        addToast(`Cannot swap players between ${sourceCourt.type?.toUpperCase()} and ${targetCourt.type?.toUpperCase()} courts.`, "warning");
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
        addToast(`${queuePlayer.name} is not a winner yet. Only winners can be placed on a Winner Court.`, "warning");
        return;
      }
      if (targetCourt.type === "loser" && playerResult !== "loss") {
        addToast(`${queuePlayer.name} has not lost a game yet. Only losers can be placed on a Loser Court.`, "warning");
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
      addToast(`Cannot move ${playerToCheck.name} from ${playerToCheck.tier.toUpperCase()} to ${targetCourt.type.toUpperCase()} court.`, "warning");
      return;
    }
    if (sourceCourt && sourceCourt.players.length === (sourceCourt.format === "singles" ? 2 : 4)) {
      addToast("Cannot move players while match is active.", "warning");
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
        if (court.players.length >= (court.format === "singles" ? 2 : 4)) { addToast("Court is full.", "warning"); return court; }
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
    // Filter out players already in other court previews
    const otherPreviewIds = new Set(
      Object.entries(courtPreviews)
        .filter(([id]) => id !== String(court.id))
        .flatMap(([, players]) => players.map((p) => p.id))
    );
    const availableQueue = courtQueue.filter((p) => !otherPreviewIds.has(p.id));
    const isSingles = court.format === "singles";
    const maxPlayers = isSingles ? 2 : 4;
    const needed = maxPlayers - (court.players?.length || 0);

    if (needed <= 0) return [];

    // Try eligible players first; fall back to full pool if fewer than needed
    const eligible = eligiblePlayers(availableQueue);
    const pool = eligible.length >= needed ? eligible : availableQueue;

    if (pool.length < needed) return [];

    if (needed <= 2 || isSingles) {
      return pool.slice(0, needed);
    }

    const selectedPlayers = buildRotationGroup(pool);
    if (selectedPlayers.length < needed) return [];
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
    const maxPlayers = isSingles ? 2 : 4;
    const currentPlayers = court?.players?.length || 0;
    const needed = maxPlayers - currentPlayers;

    if (!preview || preview.length === 0) {
      addToast("No preview to confirm.", "warning");
      return;
    }
    if (currentPlayers >= maxPlayers) {
      addToast("Court is already full.", "warning");
      return;
    }

    const previewIds = preview.map((p) => p.id);
    const previewPlayers = preview.map((p) => ({
      ...p,
      consecutiveGames: (p.consecutiveGames || 0) + 1,
    }));

    setCourts((prev) =>
      prev.map((c) =>
        c.id === courtId
          ? {
              ...c,
              players: [...c.players, ...previewPlayers],
              startedAt: c.players.length + previewPlayers.length >= maxPlayers ? Date.now() : c.startedAt,
            }
          : c
      )
    );
    setPlayers((prev) => prev.filter((p) => !previewIds.includes(p.id)));
    previewIds.forEach((id) => removePlayerFromDb(id));
    setCourtPreviews((prev) => {
      const updated = { ...prev };
      delete updated[courtId];
      return updated;
    });
  };

  // ===== GAME ACTIONS =====

  // Helper: get eligible players for auto-fill, preferring non-resting players
  // Falls back to resting players only if not enough non-resting are available
  const getEligibleForCourt = (pool, needed) => {
    const notOnCourt = pool.filter((p) => !courts.flatMap((c) => c.players).some((cp) => cp.id === p.id));
    const ready = notOnCourt.filter((p) => !p.cooldownUntil || Date.now() >= p.cooldownUntil);
    if (ready.length >= needed) return ready;
    // Not enough ready players — include resting ones as fallback
    return notOnCourt;
  };

  const assignPlayersToAllCourts = () => {
    const availableCourts = courts.filter((c) => {
      if (c.locked) return false; // Skip locked courts
      const maxP = c.format === "singles" ? 2 : 4;
      return c.players.length < maxP;
    });
    if (availableCourts.length === 0) { addToast("No court available to fill.", "warning"); return; }

    // ===== RANDOM DRAW MODE =====
    if (isRandomDraw) {
      const shuffled = shufflePlayers([...waitingPlayers]);
      let idx = 0;

      const updatedCourts = courts.map((court) => {
        const maxP = court.format === "singles" ? 2 : 4;
        if (court.locked || court.players.length >= maxP) return court;
        const needed = maxP - court.players.length;
        if (idx + needed > shuffled.length) return court;
        const selected = shuffled.slice(idx, idx + needed).map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        idx += needed;
        return { ...court, players: [...court.players, ...selected], startedAt: court.players.length + selected.length >= maxP ? (court.startedAt || Date.now()) : court.startedAt };
      });

      setCourts(updatedCourts);
      const newlyAssignedIds = shuffled.slice(0, idx).map((p) => p.id);
      atomicAssignToCourts(updatedCourts, newlyAssignedIds);
      newlyAssignedIds.forEach((id) => removePlayerFromDb(id));
      return;
    }

    // ===== KING OF THE COURT / CHALLENGE / FIXED TEAMS =====
    // These modes use the same basic fill logic as Open Mode (fill from full queue)
    if (isKingOfCourt || isChallenge || isFixedTeams) {
      let usedInThisRound = new Set();
      const updatedCourts = courts.map((court) => {
        const maxP = court.format === "singles" ? 2 : 4;
        if (court.locked || court.players.length >= maxP) return court;
        const needed = maxP - court.players.length;
        const eligible = getEligibleForCourt(
          waitingPlayers.filter((p) => !usedInThisRound.has(p.id)), needed
        );
        if (eligible.length < needed) return court;

        const selected = eligible.slice(0, needed).map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        selected.forEach((p) => usedInThisRound.add(p.id));
        return { ...court, players: [...court.players, ...selected], startedAt: court.players.length + selected.length >= maxP ? (court.startedAt || Date.now()) : court.startedAt };
      });

      setCourts(updatedCourts);
      const newlyAssigned = [...usedInThisRound];
      atomicAssignToCourts(updatedCourts, newlyAssigned);
      newlyAssigned.forEach((id) => removePlayerFromDb(id));
      return;
    }

    // ===== SWISS SYSTEM =====
    // Pairs players with similar win records
    if (isSwiss) {
      let usedInThisRound = new Set();
      const updatedCourts = courts.map((court) => {
        const maxP = court.format === "singles" ? 2 : 4;
        if (court.locked || court.players.length >= maxP) return court;
        const needed = maxP - court.players.length;
        const eligible = getEligibleForCourt(
          waitingPlayers.filter((p) => !usedInThisRound.has(p.id)), needed
        );
        if (eligible.length < needed) return court;

        const paired = swissPairing(eligible, needed);
        const selected = paired.slice(0, needed).map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        selected.forEach((p) => usedInThisRound.add(p.id));
        return { ...court, players: [...court.players, ...selected], startedAt: court.players.length + selected.length >= maxP ? (court.startedAt || Date.now()) : court.startedAt };
      });

      setCourts(updatedCourts);
      const newlyAssigned = [...usedInThisRound];
      atomicAssignToCourts(updatedCourts, newlyAssigned);
      newlyAssigned.forEach((id) => removePlayerFromDb(id));
      // Notify next players
      if (isNotificationEnabled()) {
        updatedCourts.forEach((c, i) => {
          c.players.forEach((p) => notifyPlayerTurn(p.name, i + 1));
        });
      }
      return;
    }

    // ===== ROUND ROBIN =====
    // Picks the next unplayed matchup
    if (isRoundRobin) {
      let usedInThisRound = new Set();
      const updatedCourts = courts.map((court) => {
        const maxP = court.format === "singles" ? 2 : 4;
        if (court.locked || court.players.length >= maxP) return court;
        const needed = maxP - court.players.length;
        const eligible = getEligibleForCourt(
          waitingPlayers.filter((p) => !usedInThisRound.has(p.id)), needed
        );
        if (eligible.length < needed) return court;

        const isSingles = court.format === "singles";
        const nextMatch = roundRobinNextMatch(eligible, matches, isSingles);
        const selected = nextMatch.slice(0, needed).map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        selected.forEach((p) => usedInThisRound.add(p.id));
        return { ...court, players: [...court.players, ...selected], startedAt: court.players.length + selected.length >= maxP ? (court.startedAt || Date.now()) : court.startedAt };
      });

      setCourts(updatedCourts);
      const newlyAssigned = [...usedInThisRound];
      atomicAssignToCourts(updatedCourts, newlyAssigned);
      newlyAssigned.forEach((id) => removePlayerFromDb(id));
      // Notify next players
      if (isNotificationEnabled()) {
        updatedCourts.forEach((c, i) => {
          c.players.forEach((p) => notifyPlayerTurn(p.name, i + 1));
        });
      }
      return;
    }

    // ===== ELO MATCH MODE =====
    // Pairs players by closest ELO rating (top vs top, mid vs mid)
    if (isEloMatch) {
      // Sort all waiting players by ELO (highest first)
      const sortedByElo = [...waitingPlayers].sort((a, b) => (b.eloRating || 2.0) - (a.eloRating || 2.0));
      let eloIdx = 0;

      const updatedCourts = courts.map((court) => {
        const maxP = court.format === "singles" ? 2 : 4;
        if (court.locked || court.players.length >= maxP) return court;
        const needed = maxP - court.players.length;
        if (eloIdx + needed > sortedByElo.length) return court;

        const selected = sortedByElo.slice(eloIdx, eloIdx + needed).map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        eloIdx += needed;
        return { ...court, players: [...court.players, ...selected], startedAt: court.players.length + selected.length >= maxP ? (court.startedAt || Date.now()) : court.startedAt };
      });

      setCourts(updatedCourts);
      const newlyAssignedIds = sortedByElo.slice(0, eloIdx).map((p) => p.id);
      atomicAssignToCourts(updatedCourts, newlyAssignedIds);
      newlyAssignedIds.forEach((id) => removePlayerFromDb(id));
      return;
    }

    if (isOpenMode) {
      // Open Mode: each court pulls from its matching result pool
      // "winner" court → winners first, fall back to new players
      // "loser"  court → losers first, fall back to new players
      // "any"    court → all waiting players
      let usedIds = new Set();

      const updatedCourts = courts.map((court) => {
        const isSingles = court.format === "singles";
        const maxPlayers = isSingles ? 2 : 4;
        // Skip locked courts and courts that are already full
        if (court.locked || court.players.length >= maxPlayers) return court;

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
          const singlesPool = eligible.length >= needed ? eligible : pool;
          if (singlesPool.length < needed) return court;
          const selected = singlesPool
            .slice(0, needed)
            .map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
          selected.forEach((p) => usedIds.add(p.id));
          const allPlayers = [...court.players, ...selected];
          return { ...court, players: allPlayers, startedAt: allPlayers.length >= 2 ? (court.startedAt || Date.now()) : court.startedAt };
        }

        if (needed < 4 && court.players.length > 0) {
          // Partially filled doubles court — pull remaining needed players
          const eligible = eligiblePlayers(pool);
          const partialPool = eligible.length >= needed ? eligible : pool;
          if (partialPool.length < needed) return court;
          const selected = partialPool
            .slice(0, needed)
            .map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
          selected.forEach((p) => usedIds.add(p.id));
          const allPlayers = [...court.players, ...selected];
          return { ...court, players: allPlayers, startedAt: allPlayers.length >= 4 ? (court.startedAt || Date.now()) : court.startedAt };
        }

        const eligible = eligiblePlayers(pool);
        const doublesPool = eligible.length >= 4 ? eligible : pool;
        const selected = buildRotationGroup(doublesPool);
        if (selected.length < 4) return court;

        const teams = createBalancedTeams(
          selected.map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }))
        );
        teams.forEach((p) => usedIds.add(p.id));
        return { ...court, players: teams, startedAt: Date.now() };
      });

      const selectedIds = [...usedIds];
      atomicAssignToCourts(updatedCourts, selectedIds, true);
      // Remove assigned players from Supabase
      selectedIds.forEach((id) => removePlayerFromDb(id));

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

    // Ladder Mode — with usedIds tracking to prevent double-assignment across same-type courts
    let ladderUsedIds = new Set();
    const updatedCourts = courts.map((court) => {
      const isSingles = court.format === "singles";
      const maxPlayers = isSingles ? 2 : 4;
      if (court.locked || court.players.length >= maxPlayers) return court;
      const courtQueue = getQueueByCourtType(court.type).filter((p) => !ladderUsedIds.has(p.id));
      const needed = maxPlayers - court.players.length;

      if (isSingles) {
        const eligible = eligiblePlayers(courtQueue);
        const pool = eligible.length >= needed ? eligible : courtQueue;
        if (pool.length < needed) return court;
        const selected = pool
          .slice(0, needed)
          .map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        selected.forEach((p) => ladderUsedIds.add(p.id));
        const allPlayers = [...court.players, ...selected];
        return { ...court, players: allPlayers, startedAt: allPlayers.length >= 2 ? (court.startedAt || Date.now()) : court.startedAt };
      }

      if (court.players.length > 0 && needed < 4) {
        // Partially filled doubles — pull remaining
        const eligible = eligiblePlayers(courtQueue);
        const pool = eligible.length >= needed ? eligible : courtQueue;
        if (pool.length < needed) return court;
        const selected = pool
          .slice(0, needed)
          .map((p) => ({ ...p, consecutiveGames: (p.consecutiveGames || 0) + 1 }));
        selected.forEach((p) => ladderUsedIds.add(p.id));
        const allPlayers = [...court.players, ...selected];
        return { ...court, players: allPlayers, startedAt: allPlayers.length >= 4 ? (court.startedAt || Date.now()) : court.startedAt };
      }

      // Try eligible (rested) players first; fall back to full queue if not enough
      const eligible = eligiblePlayers(courtQueue);
      const pool = eligible.length >= 4 ? eligible : courtQueue;
      const selectedPlayers = buildRotationGroup(pool);
      if (selectedPlayers.length < 4) return court;

      const teams = createBalancedTeams(
        selectedPlayers.map((p) => ({
          ...p,
          consecutiveGames: (p.consecutiveGames || 0) + 1,
        }))
      );
      teams.forEach((p) => ladderUsedIds.add(p.id));
      return { ...court, players: teams, startedAt: Date.now() };
    });

    setCourts(updatedCourts);

    const selectedIds = [...ladderUsedIds];
    atomicAssignToCourts(updatedCourts, selectedIds, true);
    // Remove assigned players from Supabase
    selectedIds.forEach((id) => removePlayerFromDb(id));

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
    if (navigator.vibrate) navigator.vibrate(50);
    assignPlayersToAllCourts();
  };
  startNextGameRef.current = startNextGame;

  // ===== QUICK RE-CHECK-IN =====
  const handleReCheckin = async () => {
    // Find the last session's attendance (sessionId - 1)
    const prevSessionId = sessionId - 1;
    if (prevSessionId < 1) { addToast("No previous session to re-check-in from.", "warning"); return; }

    const prevAttendance = attendance.filter((r) => r.sessionId === prevSessionId);
    if (prevAttendance.length === 0) { addToast("No players found in the previous session.", "warning"); return; }

    // Get unique player IDs from last session
    const prevPlayerIds = [...new Set(prevAttendance.map((r) => r.playerId))];

    // Filter out players already in the current queue or on courts
    const currentPlayerIds = new Set([
      ...players.map((p) => p.id),
      ...courts.flatMap((c) => c.players.map((p) => p.id)),
    ]);

    const toAdd = prevPlayerIds
      .filter((id) => !currentPlayerIds.has(id))
      .map((id) => directory.find((d) => d.id === id))
      .filter(Boolean);

    if (toAdd.length === 0) { addToast("All already checked in.", "info"); return; }

    const confirmed = window.confirm(
      `Re-check-in ${toAdd.length} players from Session ${prevSessionId}?`
    );
    if (!confirmed) return;

    // Add each player to the queue and record attendance
    const newPlayers = [];
    const newAttendance = [];

    for (const dirPlayer of toAdd) {
      const newPlayer = {
        ...dirPlayer,
        consecutiveGames: 0,
        restedOnce: false,
        lastPartnerId: null,
        lastOpponents: [],
        priority: false,
        noPriority: false,
        lastResult: null,
        queueGroup: "unmatched",
        cooldownUntil: null,
        waitingSince: Date.now(),
      };
      newPlayers.push(newPlayer);

      const alreadyAttended = attendance.some(
        (r) => r.sessionId === sessionId && r.playerId === newPlayer.id
      );
      if (!alreadyAttended) {
        const record = {
          id: crypto.randomUUID(),
          playerId: newPlayer.id,
          playerName: newPlayer.name,
          sessionId,
          timestamp: Date.now(),
        };
        await saveAttendance(record, club.id);
        newAttendance.push(record);
      }
    }

    setPlayers((prev) => [...prev, ...newPlayers]);
    setAttendance((prev) => [...prev, ...newAttendance]);
    addToast(`${toAdd.length} players re-checked in!`, "success");
  };

  // ===== MATCH UNDO =====
  const [showUndoPicker, setShowUndoPicker] = useState(false);

  const undoLastMatch = async () => {
    if (matches.length === 0) { addToast("No matches to undo.", "info"); return; }
    setShowUndoPicker(true);
  };

  const undoSpecificMatch = async (matchToUndo) => {
    if (!matchToUndo) return;
    setShowUndoPicker(false);

    // Delete from Supabase
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchToUndo.id);
    if (error) { console.error("undoMatch:", error); addToast("Failed to undo.", "error"); return; }

    // Remove from state
    setMatches((prev) => prev.filter((m) => m.id !== matchToUndo.id));

    // Find the players involved and revert their stats
    const allMatchPlayers = [...(matchToUndo.teamA || []), ...(matchToUndo.teamB || [])];
    const winningNames = matchToUndo.winner === "A" ? matchToUndo.teamA : matchToUndo.teamB;
    const losingNames = matchToUndo.winner === "A" ? matchToUndo.teamB : matchToUndo.teamA;

    // Revert directory stats (including ELO and streak)
    const revertedDirectory = directory.map((p) => {
      if (winningNames?.includes(p.name)) {
        // This player had won — reverse the ELO gain
        const oppRating = losingNames?.length > 0
          ? directory.filter((d) => losingNames.includes(d.name)).reduce((s, d) => s + (d.eloRating || 2.0), 0) / losingNames.length
          : 2.0;
        const previousElo = reverseRating(p.eloRating, oppRating, true);
        return {
          ...p,
          gamesPlayed: Math.max(0, (p.gamesPlayed || 0) - 1),
          wins: Math.max(0, (p.wins || 0) - 1),
          eloRating: previousElo,
          currentStreak: Math.max(0, (p.currentStreak || 0) - 1),
        };
      }
      if (losingNames?.includes(p.name)) {
        // This player had lost — reverse the ELO loss
        const oppRating = winningNames?.length > 0
          ? directory.filter((d) => winningNames.includes(d.name)).reduce((s, d) => s + (d.eloRating || 2.0), 0) / winningNames.length
          : 2.0;
        const previousElo = reverseRating(p.eloRating, oppRating, false);
        return {
          ...p,
          gamesPlayed: Math.max(0, (p.gamesPlayed || 0) - 1),
          losses: Math.max(0, (p.losses || 0) - 1),
          eloRating: previousElo,
        };
      }
      return p;
    });

    setDirectory(revertedDirectory);
    await Promise.all(
      revertedDirectory
        .filter((p) => allMatchPlayers.includes(p.name))
        .map((p) => saveDirectoryPlayer(p, club.id))
    );

    // Also revert queue player stats if they're in the queue
    setPlayers((prev) =>
      prev.map((p) => {
        if (winningNames?.includes(p.name)) {
          const oppRating = losingNames?.length > 0
            ? directory.filter((d) => losingNames.includes(d.name)).reduce((s, d) => s + (d.eloRating || 2.0), 0) / losingNames.length
            : 2.0;
          const previousElo = reverseRating(p.eloRating, oppRating, true);
          return { ...p, gamesPlayed: Math.max(0, (p.gamesPlayed || 0) - 1), wins: Math.max(0, (p.wins || 0) - 1), lastResult: null, eloRating: previousElo, currentStreak: Math.max(0, (p.currentStreak || 0) - 1) };
        }
        if (losingNames?.includes(p.name)) {
          const oppRating = winningNames?.length > 0
            ? directory.filter((d) => winningNames.includes(d.name)).reduce((s, d) => s + (d.eloRating || 2.0), 0) / winningNames.length
            : 2.0;
          const previousElo = reverseRating(p.eloRating, oppRating, false);
          return { ...p, gamesPlayed: Math.max(0, (p.gamesPlayed || 0) - 1), losses: Math.max(0, (p.losses || 0) - 1), lastResult: null, eloRating: previousElo };
        }
        return p;
      })
    );

    addToast(`Match undone: ${(matchToUndo.teamA || []).join(" & ")} vs ${(matchToUndo.teamB || []).join(" & ")}`, "success");
  };

  const endGame = async (courtId, winningTeam, score = null) => {
    // Prevent duplicate calls (spam-clicking)
    if (endingGameRef.current.has(courtId)) return;
    endingGameRef.current.add(courtId);
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

    const court = courts.find((c) => c.id === courtId);
    if (!court) { endingGameRef.current.delete(courtId); return; }

    // Data integrity check: court must have enough players
    const isSingles = court.format === "singles";
    const minPlayers = isSingles ? 2 : 4;
    if (court.players.length < minPlayers) {
      endingGameRef.current.delete(courtId);
      addToast(`Court needs ${minPlayers} players to end a game. Currently has ${court.players.length}.`, "warning");
      return;
    }
    try {
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
      score: score || null,
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

      // Clean up any challenge data
      const { pendingChallenge, ...cleanPlayer } = player;

      if (isTierless) {
        // Tierless modes: no tier changes, just update stats and lastResult
        return {
          ...cleanPlayer,
          consecutiveGames: cleanPlayer.consecutiveGames || 0,
          priority: false,
          noPriority: false,
          gamesPlayed: cleanPlayer.gamesPlayed + 1,
          wins: (cleanPlayer.wins || 0) + (won ? 1 : 0),
          losses: (cleanPlayer.losses || 0) + (won ? 0 : 1),
          currentStreak,
          bestStreak: Math.max(cleanPlayer.bestStreak || 0, currentStreak),
          queueGroup: won ? "winner" : "loser",
          lastResult: won ? "win" : "loss",
          waitingSince: Date.now(),
        };
      }

      // Ladder Mode: tier promotions/demotions unchanged
      const rawNextTier = getNextTier(court.type, won);
      const nextTier = getEffectiveTier(cleanPlayer.tier, rawNextTier);

      return {
        ...cleanPlayer,
        tier: nextTier,
        kingCourtEntries:
          (cleanPlayer.kingCourtEntries || 0) +
          (nextTier === "king" && cleanPlayer.tier !== "king" ? 1 : 0),
        consecutiveGames: cleanPlayer.consecutiveGames || 0,
        priority: false,
        noPriority: false,
        gamesPlayed: cleanPlayer.gamesPlayed + 1,
        wins: (cleanPlayer.wins || 0) + (won ? 1 : 0),
        losses: (cleanPlayer.losses || 0) + (won ? 0 : 1),
        currentStreak,
        bestStreak: Math.max(cleanPlayer.bestStreak || 0, currentStreak),
        queueGroup: "matched",
        lastResult: won ? "win" : "loss",
        waitingSince: Date.now(),
      };
    });

    // ===== ELO RATING UPDATE =====
    // Calculate team ratings and update each player's ELO
    if (!isSingles) {
      const teamARating = getTeamRating(court.players.slice(0, 2));
      const teamBRating = getTeamRating(court.players.slice(2, 4));
      returningPlayers.forEach((p, idx) => {
        const isTeamA = idx < 2;
        const won = (winningTeam === "A" && isTeamA) || (winningTeam === "B" && !isTeamA);
        const oppRating = isTeamA ? teamBRating : teamARating;
        p.eloRating = calculateNewRating(p.eloRating, oppRating, won);
      });
    } else {
      const p1Rating = court.players[0]?.eloRating || 2.0;
      const p2Rating = court.players[1]?.eloRating || 2.0;
      returningPlayers.forEach((p, idx) => {
        const won = (winningTeam === "A" && idx === 0) || (winningTeam === "B" && idx === 1);
        const oppRating = idx === 0 ? p2Rating : p1Rating;
        p.eloRating = calculateNewRating(p.eloRating, oppRating, won);
      });
    }

    const updatedDirectory = directory.map((dp) => {
      const updated = returningPlayers.find((p) => p.id === dp.id);
      return updated ? updated : dp;
    });

    setDirectory(updatedDirectory);
    // Only persist the players that actually changed (not the entire directory)
    await Promise.all(returningPlayers.map((p) => saveDirectoryPlayer(p, club.id)));

    const playersWithCooldown = returningPlayers.map((p) => ({
      ...p,
      cooldownUntil: cooldownMinutes > 0 ? Date.now() + cooldownMinutes * 60000 : null,
    }));

    // ===== KING OF THE COURT: Winners stay on court =====
    if (isKingOfCourt) {
      const winners = playersWithCooldown.filter((p) => p.lastResult === "win");
      const losers = playersWithCooldown.filter((p) => p.lastResult !== "win");
      // Only persist losers to DB (winners stay on court, not in queue)
      losers.forEach((p) => savePlayer(p, club.id));
      atomicEndGame(courtId, losers, winners);
      // Remove winners from players DB (they're on court, not in queue)
      winners.forEach((w) => removePlayerFromDb(w.id));
    } else {
      // Normal: all players return to queue, clear court
      playersWithCooldown.forEach((p) => savePlayer(p, club.id));
      atomicEndGame(courtId, playersWithCooldown, null);
    }

    // Clear warning for this court once game ends
    setPartnerWarnings((prev) => {
      const updated = { ...prev };
      delete updated[courtId];
      return updated;
    });

    // Confetti celebration
    setConfetti({ color: winningTeam === "A" ? "blue" : "purple" });

    // Activity feed event
    const winnerNames = winningTeam === "A"
      ? (isSingles ? [court.players[0]?.name] : court.players.slice(0, 2).map((p) => p.name))
      : (isSingles ? [court.players[1]?.name] : court.players.slice(2, 4).map((p) => p.name));
    setActivityEvents((prev) => [{
      id: Date.now(),
      icon: "🏆",
      text: `${winnerNames.join(" & ")} won on Court #${courtId}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }, ...prev].slice(0, 50));

    } catch (err) {
      console.error("endGame error:", err);
      addToast("Error ending game. Please try again.", "error");
    } finally {
      // Always release the lock
      endingGameRef.current.delete(courtId);
    }
  };

  // ===== SESSION ACTIONS =====

  const startNewSession = async () => {
    if (hasActiveGames()) {
      addToast("Finish all active games first.", "warning");
      return;
    }

    // Start new session immediately (no blocking confirm)
    setPlayers([]);
    await clearPlayers(club.id);
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
        eloRating: p.eloRating || 2.0,
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
    // End-of-session summary
    const sessionMatches2 = matches.filter((m) => m.sessionId === sessionId);
    const mvp = standings.length > 0 ? standings[0] : null;
    const summaryText = [
      `🏸 Session ${sessionId} Complete!`,
      `📊 ${sessionMatches2.length} matches · ${standings.length} players`,
      mvp ? `🏆 MVP: ${mvp.name} (${mvp.gamesPlayed > 0 ? Math.round((mvp.wins / mvp.gamesPlayed) * 100) : 0}% win rate)` : "",
      ``,
      `Top 3:`,
      ...standings.slice(0, 3).map((p, i) => `${["🥇","🥈","🥉"][i]} ${p.name} — ${p.wins}W ${p.losses}L`),
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(summaryText).catch(() => {});
    addToast(`Session ${sessionId} complete! Summary copied.`, "success", 5000);

    setSessionId((prev) => prev + 1);
    // Reset mode so the picker shows at the start of the next session
    setSessionMode(null);
    localStorage.removeItem(STORAGE_KEYS.SESSION_MODE);
  };

  const resetSession = async () => {
    if (hasActiveGames()) {
      addToast("Finish all active games first.", "warning");
      return;
    }
    const confirmed = window.confirm(`Reset Session ${sessionId}?`);
    if (!confirmed) return;
    setPlayers([]);
    await clearPlayers(club.id);
    setCourts(getDefaultCourts(sessionMode));
    setName("");
    setError("");
    addToast(`Session ${sessionId} has been reset.`, "success");
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
    const updatedMatches = matches.map((m) =>
      m.id === matchId ? { ...m, winner: newWinner } : m
    );
    const targetMatch = updatedMatches.find((m) => m.id === matchId);
    if (!targetMatch) { addToast("Match not found.", "error"); return; }
    await updateMatch(targetMatch);
    setMatches(updatedMatches);
    await recalculateStandings(updatedMatches);
    addToast(`Winner changed to Team ${newWinner}. Stats recalculated.`, "success");
  };

  const clearHistory = async () => {
    const confirmed = window.confirm("Delete ALL match history?");
    if (!confirmed) return;
    await clearAllMatches(club.id);
    setMatches([]);
    addToast("Match history cleared.", "success");
  };

  const clearAttendanceRecords = async () => {
    const confirmed = window.confirm("Reset all attendance records?");
    if (!confirmed) return;
    await clearAttendance(club.id);
    setAttendance([]);
    addToast("Attendance records cleared.", "success");
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
    addToast("Standings reset.", "success");
  };

  const factoryReset = async () => {
    const confirmed = window.confirm(
      "WARNING: This will permanently delete ALL data including saved players. Continue?"
    );
    if (!confirmed) return;

    await clearAllMatches(club.id);
    await clearAttendance(club.id);
    await clearStandingsHistory(club.id);
    await clearPlayers(club.id);

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

    // Clear sync queue
    clearQueue();

    setCourts(getDefaultCourts(null));
    setSessionId(1);
    setSessionMode(null);

    localStorage.setItem(`${STORAGE_KEYS.SESSION}_${club.id}`, "1");

    addToast("Factory Reset completed.", "success");
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
        eloRating: 2.0, // Reset ELO and replay all matches
        queueGroup: "unmatched",
      };
    });

    // Replay all matches in chronological order to rebuild stats + ELO + streaks
    const chronological = [...updatedMatches].sort((a, b) => (a.endedAt || a.date || 0) - (b.endedAt || b.date || 0));

    chronological.forEach((match) => {
      const winningNames = match.winner === "A" ? match.teamA : match.teamB;
      const losingNames = match.winner === "A" ? match.teamB : match.teamA;

      // Calculate team ratings before this match
      const winnerIds = directory.filter((p) => winningNames?.includes(p.name)).map((p) => p.id);
      const loserIds = directory.filter((p) => losingNames?.includes(p.name)).map((p) => p.id);
      const winnerAvgRating = winnerIds.length > 0
        ? winnerIds.reduce((s, id) => s + (playerStats[id]?.eloRating || 2.0), 0) / winnerIds.length
        : 2.0;
      const loserAvgRating = loserIds.length > 0
        ? loserIds.reduce((s, id) => s + (playerStats[id]?.eloRating || 2.0), 0) / loserIds.length
        : 2.0;

      directory.forEach((p) => {
        if (winningNames?.includes(p.name)) {
          playerStats[p.id].gamesPlayed++;
          playerStats[p.id].wins++;
          playerStats[p.id].currentStreak = (playerStats[p.id].currentStreak || 0) + 1;
          playerStats[p.id].bestStreak = Math.max(playerStats[p.id].bestStreak || 0, playerStats[p.id].currentStreak);
          playerStats[p.id].eloRating = calculateNewRating(playerStats[p.id].eloRating, loserAvgRating, true);
          playerStats[p.id].lastResult = "win";
        } else if (losingNames?.includes(p.name)) {
          playerStats[p.id].gamesPlayed++;
          playerStats[p.id].losses++;
          playerStats[p.id].currentStreak = 0;
          playerStats[p.id].eloRating = calculateNewRating(playerStats[p.id].eloRating, winnerAvgRating, false);
          playerStats[p.id].lastResult = "loss";
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
          ? { ...p, gamesPlayed: updated.gamesPlayed, wins: updated.wins, losses: updated.losses, eloRating: updated.eloRating, currentStreak: updated.currentStreak, bestStreak: updated.bestStreak, lastResult: updated.lastResult }
          : p;
      })
    );
  };

  // ===== RENDER =====

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-20 sm:pb-6">

      {/* Slim sticky header — Glassmorphism */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
          {/* Left: Logo + Club name */}
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="KNGS Stack" className="w-6 h-6 shrink-0" />
            <h1 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
              {club?.name || "KNGS Stack"}
            </h1>
          </div>

          {/* Right: Desktop icons */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {sessionMode && !viewMode && (
              <button
                onClick={() => {
                  setIsSwitchingMode(true);
                  setSessionMode(null);
                  localStorage.removeItem(STORAGE_KEYS.SESSION_MODE);
                  if (hasActiveGames()) { addToast("Active courts will finish their current game.", "info"); }
                }}
                className="h-7 px-1.5 rounded text-[10px] text-[#7ABFED] hover:bg-white/10"
              >
                Switch Mode
              </button>
            )}
            <button onClick={handleManualRefresh} className="h-7 w-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-xs" title="Refresh">🔄</button>
            <button onClick={() => setShowLiveBoard(true)} className="h-7 w-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-xs">📺</button>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/live/${club.slug || club.id}`); addToast("Live board link copied!", "success"); }} className="h-7 w-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-xs">🔗</button>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/checkin/${club.slug || club.id}`); addToast("Check-in link copied!", "success"); }} className="h-7 w-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-xs">📋</button>
            <button onClick={toggleViewMode} className={`h-7 px-1.5 rounded text-[10px] font-medium ${viewMode ? "bg-[#7ABFED] text-[#003369]" : "bg-white/10 text-white hover:bg-white/20"}`}>{viewMode ? "✓ View" : "👁"}</button>
            <button onClick={toggleDark} className="h-7 w-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-xs">{dark ? "☀️" : "🌙"}</button>
            <button onClick={onSwitchClub} className="h-7 px-2 rounded bg-white/10 text-[10px] text-white hover:bg-white/20">{clubs.length > 1 ? "Switch" : "+"}</button>
            <button onClick={onLogout} className="h-7 w-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-xs" title="Log out">🚪</button>
          </div>

          {/* Right: Mobile — just refresh + hamburger */}
          <div className="flex sm:hidden items-center gap-1">
            <button onClick={handleManualRefresh} className="h-7 w-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-xs">🔄</button>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="h-7 w-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-sm" aria-expanded={showMobileMenu} aria-label={showMobileMenu ? "Close menu" : "Open menu"}>
              {showMobileMenu ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {showMobileMenu && (
          <div className="sm:hidden glass-menu border-t border-white/10 px-4 py-3 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => { setShowLiveBoard(true); setShowMobileMenu(false); }} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                <span className="text-lg">📺</span>
                <span className="text-[9px] text-[#7ABFED]">Live</span>
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/live/${club.slug || club.id}`); addToast("Link copied!", "success"); setShowMobileMenu(false); }} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                <span className="text-lg">🔗</span>
                <span className="text-[9px] text-[#7ABFED]">Share</span>
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/checkin/${club.slug || club.id}`); addToast("Link copied!", "success"); setShowMobileMenu(false); }} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                <span className="text-lg">📋</span>
                <span className="text-[9px] text-[#7ABFED]">Check-in</span>
              </button>
              <button onClick={() => { toggleDark(); setShowMobileMenu(false); }} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                <span className="text-lg">{dark ? "☀️" : "🌙"}</span>
                <span className="text-[9px] text-[#7ABFED]">Theme</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {sessionMode && !viewMode && (
                <button onClick={() => { setIsSwitchingMode(true); setSessionMode(null); localStorage.removeItem(STORAGE_KEYS.SESSION_MODE); setShowMobileMenu(false); if (hasActiveGames()) addToast("Active courts will finish their current game.", "info"); }} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                  <span className="text-lg">⚙️</span>
                  <span className="text-[9px] text-[#7ABFED]">Mode</span>
                </button>
              )}
              <button onClick={() => { toggleViewMode(); setShowMobileMenu(false); }} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                <span className="text-lg">{viewMode ? "✓" : "👁"}</span>
                <span className="text-[9px] text-[#7ABFED]">View</span>
              </button>
              <button onClick={() => { onSwitchClub(); setShowMobileMenu(false); }} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                <span className="text-lg">🏢</span>
                <span className="text-[9px] text-[#7ABFED]">Club</span>
              </button>
              <button onClick={() => { onLogout(); }} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10">
                <span className="text-lg">🚪</span>
                <span className="text-[9px] text-[#7ABFED]">Logout</span>
              </button>
            </div>
            {/* Language selector */}
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full h-8 px-3 rounded-lg bg-white/10 text-xs text-white border-0">
              {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{l.flag} {l.label}</option>))}
            </select>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4">

        {/* Session badge (mobile) — compact */}
        <div className="sm:hidden text-center mb-2">
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
            S{sessionId} · {sessionMode === "open" ? "Open" : sessionMode === "ladder" ? "Ladder" : sessionMode === "extended_ladder" ? "Extended" : sessionMode === "elo_match" ? "ELO Match" : sessionMode || "—"}
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
              🔄 Auto-refreshes every 5 seconds
            </p>
          </div>
        )}

        {/* Dashboard Tab — operator only */}
        {!viewMode && activeTab === "dashboard" && (
          <>
            {!playersLoaded ? (
              <DashboardSkeleton />
            ) : (
            <>
            <SessionControls
              name={name}
              setName={setName}
              error={error}
              sessionId={sessionId}
              sessionMode={sessionMode}
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
              onShowCourtTypeModal={() => {
                // New modes don't need court types — just add a generic court
                if (isTierless && !isOpenMode) {
                  addCourt(null);
                } else {
                  setShowCourtTypeModal(true);
                }
              }}
              onRemoveCourt={removeCourt}
              onStartNewSession={startNewSession}
              onResetSession={resetSession}
              onFactoryReset={factoryReset}
              onDeleteClub={onDeleteClub}
              onDeleteDirectoryPlayer={handleDeleteDirectoryPlayer}
              onReCheckin={handleReCheckin}
              onUndoLastMatch={undoLastMatch}
              inviteCode={club.invite_code}
              clubId={club.id}
              clubSlug={club.slug}
              cooldownMinutes={cooldownMinutes}
              onSetCooldown={(val) => { setCooldownMinutes(val); localStorage.setItem("rallystack_cooldown", val); }}
              onBulkImport={() => setShowCsvImport(true)}
              onShowQrCheckin={() => setShowQrModal("checkin")}
              onShowQrLiveBoard={() => setShowQrModal("liveboard")}
              onQuickAdd={(playerName) => { setName(playerName); openTierSelection(); }}
              soundEnabled={soundEnabled}
              onToggleSound={() => { const next = !soundEnabled; setSoundEnabledState(next); setSoundEnabled(next); }}
              onExportSession={() => {
                const text = generateSessionText(sessionId, matches, standings, club?.name);
                navigator.clipboard.writeText(text);
                addToast("Session summary copied to clipboard!", "success");
              }}
            />

            <DndContext
              onDragStart={(event) => setActivePlayer(event.active.data.current?.player)}
              onDragEnd={(event) => { handleDragEnd(event); setActivePlayer(null); }}
              onDragCancel={() => setActivePlayer(null)}
            >
              {/* Pending Challenges Banner */}
              {players.filter((p) => p.pendingChallenge).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <div className="text-xs font-semibold text-red-700 mb-2">⚔️ Pending Challenges</div>
                  <div className="space-y-1.5">
                    {(() => {
                      const seen = new Set();
                      return players.filter((p) => p.pendingChallenge).filter((p) => {
                        const key = `${p.pendingChallenge.fromId}-${p.pendingChallenge.time}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                      }).map((p) => {
                      const ch = p.pendingChallenge;
                      const isDoubles = ch.type === "doubles";
                      const teamA = isDoubles && ch.partner ? `${ch.from} & ${ch.partner}` : ch.from;
                      const teamB = isDoubles && ch.opponents ? ch.opponents.join(" & ") : p.name;
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                          <div className="text-sm text-slate-700">
                            <strong>{teamA}</strong>
                            <span className="text-slate-400 mx-1.5">vs</span>
                            <strong>{teamB}</strong>
                            {isDoubles && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">2v2</span>}
                          </div>
                          <button
                            onClick={() => handleAcceptChallenge(p)}
                            className="h-7 px-2.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                          >
                            ⚔️ Match Them
                          </button>
                        </div>
                      );
                    });
                    })()}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Waitlist Banner — shows when players are waiting for approval */}
                {waitlistedPlayers.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-amber-800">
                        📋 Waitlist <span className="ml-1 bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-xs">{waitlistedPlayers.length}</span>
                      </div>
                      <button
                        onClick={acceptAllWaitlisted}
                        className="h-7 px-3 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600"
                      >
                        ✓ Accept All
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {waitlistedPlayers.map((player) => (
                        <div key={player.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-slate-700 truncate">{player.name}</span>
                            <span className="text-[10px] text-slate-400">{player.gamesPlayed || 0}GP</span>
                            {(player.eloRating || 0) > 2.0 && (
                              <span className="text-[10px] text-blue-600 font-medium">⭐{(player.eloRating || 2.0).toFixed(1)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => acceptWaitlistedPlayer(player.id)}
                              className="h-7 px-2.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => rejectWaitlistedPlayer(player.id)}
                              className="h-7 px-2.5 rounded-lg bg-red-100 text-red-600 text-xs font-medium hover:bg-red-200"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Queue Search Filter */}
                <QueueSearch onSearch={setQueueSearchQuery} playerCount={waitingPlayers.length} />

                <div>
                  {isTierless ? (
                    <OpenPlayerQueue
                      winnerQueue={queueSearchQuery ? winnerQueue.filter(p => p.name.toLowerCase().includes(queueSearchQuery)) : winnerQueue}
                      loserQueue={queueSearchQuery ? loserQueue.filter(p => p.name.toLowerCase().includes(queueSearchQuery)) : loserQueue}
                      newQueue={queueSearchQuery ? newQueue.filter(p => p.name.toLowerCase().includes(queueSearchQuery)) : newQueue}
                      courts={courts}
                      selectedCourt={selectedCourt}
                      setSelectedCourt={setSelectedCourt}
                      onAddToCourt={addPlayerToCourt}
                      onRemovePlayer={removePlayer}
                      onTogglePriority={handleTogglePriority}
                      onToggleNoPriority={handleToggleNoPriority}
                      onViewProfile={(player) => setSelectedPlayerProfile(player)}
                      onEditName={(player) => setEditingPlayer(player)}
                      onDismissChallenge={handleAcceptChallenge}
                      tapSelectedPlayer={tapSelectedPlayer}
                      onTapSelect={setTapSelectedPlayer}
                      estimatedWait={estimatedWaitPerPlayer}
                    />
                  ) : (
                    <PlayerQueue
                      kingQueue={queueSearchQuery ? kingQueue.filter(p => p.name.toLowerCase().includes(queueSearchQuery)) : kingQueue}
                      knightQueue={queueSearchQuery ? knightQueue.filter(p => p.name.toLowerCase().includes(queueSearchQuery)) : knightQueue}
                      squireQueue={queueSearchQuery ? squireQueue.filter(p => p.name.toLowerCase().includes(queueSearchQuery)) : squireQueue}
                      generalQueue={queueSearchQuery ? generalQueue.filter(p => p.name.toLowerCase().includes(queueSearchQuery)) : generalQueue}
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
                      onDismissChallenge={handleAcceptChallenge}
                      tapSelectedPlayer={tapSelectedPlayer}
                      onTapSelect={setTapSelectedPlayer}
                      estimatedWait={estimatedWaitPerPlayer}
                    />
                  )}
                </div>

                <div className="mt-4">
                  <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 hidden sm:block">Active Courts</h2>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-3">
                    {[...courts].sort((a, b) => (b.players?.length || 0) - (a.players?.length || 0)).map((court) => (
                      <CourtCard
                        key={court.id}
                        court={court}
                        courtPreviews={courtPreviews}
                        selectedPreviewPlayer={selectedPreviewPlayer}
                        partnerWarning={partnerWarnings[court.id] || null}
                        onEndGame={(courtId, winningTeam) => setPendingEndGame({ courtId, winningTeam })}
                        onRemoveCourtPlayer={removeCourtPlayer}
                        onClearCourt={clearCourt}
                        onSetCourtForEdit={setSelectedCourtForEdit}
                        onGeneratePreview={handleGeneratePreview}
                        onRegeneratePreview={regeneratePreview}
                        onConfirmPreview={confirmPreview}
                        onPreviewPlayerClick={handlePreviewPlayerClick}
                        onRemovePreviewPlayer={removePreviewPlayer}
                        onSetSelectedPreviewCourt={setSelectedPreviewCourt}
                        onSetSelectedPreviewPlayer={setSelectedPreviewPlayer}
                        tapSelectedPlayer={tapSelectedPlayer}
                        onCourtTap={(courtId) => {
                          if (tapSelectedPlayer) {
                            addPlayerToCourt(tapSelectedPlayer.id, courtId);
                            setTapSelectedPlayer(null);
                          }
                        }}
                        onToggleLock={toggleCourtLock}
                      />
                    ))}
                  </div>
                </div>

                {/* Activity Feed */}
                {activityEvents.length > 0 && (
                  <div className="mt-4">
                    <ActivityFeed events={activityEvents} />
                  </div>
                )}
              </div>

              <DragOverlay>
                {activePlayer ? (
                  <div
                    className="px-3 py-2 rounded-xl bg-blue-600 text-white shadow-2xl border-2 border-white flex items-center gap-2"
                    style={{ zIndex: 999999 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                      {activePlayer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{activePlayer.name}</div>
                      <div className="text-[9px] opacity-75">{activePlayer.gamesPlayed || 0}GP · {activePlayer.wins || 0}W</div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
            )}
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

      {/* Sticky Start Game FAB — mobile only, when courts need filling */}
      {!viewMode && activeTab === "dashboard" && waitingPlayers.length >= 4 && courts.some((c) => c.players.length < (c.format === "singles" ? 2 : 4)) && (
        <button
          onClick={startNextGame}
          className="fixed bottom-16 right-4 z-50 sm:hidden w-14 h-14 rounded-full gradient-success text-white shadow-xl flex items-center justify-center text-xl active:animate-spring-bounce transition-transform"
        >
          ▶
        </button>
      )}

      {/* Bottom Tab Navigation — mobile native feel */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 sm:hidden safe-area-pb" aria-label="Main navigation">
        <div className="flex justify-around py-1.5 pb-[env(safe-area-inset-bottom)]" role="tablist">
          {(viewMode
            ? ["standings", "attendance", "history"]
            : ["dashboard", "standings", "attendance", "history"]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              aria-label={tab.charAt(0).toUpperCase() + tab.slice(1)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === tab ? "text-blue-600 bg-blue-50 scale-105" : "text-slate-400"
              }`}
            >
              <span className="text-xl" aria-hidden="true">
                {tab === "dashboard" && "🏠"}
                {tab === "standings" && "🏆"}
                {tab === "attendance" && "👥"}
                {tab === "history" && "📜"}
              </span>
              <span className={`text-[11px] font-bold leading-tight ${activeTab === tab ? "text-blue-600" : "text-slate-400"}`}>
                {tab === "dashboard" && t("tab_dashboard")}
                {tab === "standings" && t("tab_standings")}
                {tab === "attendance" && t("tab_attendance")}
                {tab === "history" && t("tab_history")}
              </span>
              {activeTab === tab && <div className="w-4 h-0.5 bg-blue-600 rounded-full mt-0.5" aria-hidden="true" />}
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
                {tab === "dashboard" && `🏠 ${t("tab_dashboard")}`}
                {tab === "standings" && `🏆 ${t("tab_standings")}`}
                {tab === "attendance" && `👥 ${t("tab_attendance")}`}
                {tab === "history" && `📜 ${t("tab_history")}`}
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
              : () => {
                  // First login: default to Open Mode
                  handleSelectSessionMode("open");
                }
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
          onRenameCourt={renameCourt}
          onSetCustomName={setCourtCustomName}
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
          onSaveNotes={handleSaveNotes}
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

      {/* CSV Import Modal */}
      {showCsvImport && (
        <CsvImportModal
          onImport={handleBulkImport}
          onClose={() => setShowCsvImport(false)}
          existingNames={[
            ...players.map((p) => p.name),
            ...courts.flatMap((c) => c.players.map((p) => p.name)),
          ]}
        />
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <QrCodeModal
          url={
            showQrModal === "checkin"
              ? `${window.location.origin}/checkin/${club.slug || club.id}`
              : `${window.location.origin}/live/${club.slug || club.id}`
          }
          title={showQrModal === "checkin" ? "Player Check-in" : "Live Board"}
          onClose={() => setShowQrModal(null)}
        />
      )}

      {/* Slug Editor Modal */}
      {showSlugEditor && (
        <SlugEditorModal
          currentSlug={club.slug || ""}
          clubId={club.id}
          onSave={async (newSlug) => {
            const result = await updateClubSlug(club.id, newSlug);
            if (result.error) { addToast(result.error, "error"); return; }
            // Update local club state (mutation + force re-render)
            club.slug = result.slug;
            forceUpdate((v) => v + 1);
            setShowSlugEditor(false);
            addToast(`Slug updated to /${result.slug}`, "success");
          }}
          onClose={() => setShowSlugEditor(false)}
        />
      )}

      {/* Confetti celebration */}
      {confetti && <Confetti color={confetti.color} onComplete={() => setConfetti(null)} />}

      {/* Guided Tour (first-run only) */}
      {showTour && <GuidedTour onComplete={() => setShowTour(false)} />}

      {/* Undo Match Picker Modal */}
      {showUndoPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUndoPicker(false)}>
          <div className="force-light bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-3">↩️ Undo Match</h2>
            <p className="text-xs text-slate-500 mb-3">Select a match to undo. Player stats will be reverted.</p>
            {currentMatches.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No matches this session</p>
            ) : (
              <div className="space-y-2">
                {currentMatches.slice(0, 10).map((match, i) => {
                  const teamA = (match.teamA || []).join(" & ");
                  const teamB = (match.teamB || []).join(" & ");
                  const winnerLabel = match.winner === "A" ? teamA : teamB;
                  return (
                    <button
                      key={match.id || i}
                      onClick={() => undoSpecificMatch(match)}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-700">
                          <span className="text-blue-600 font-medium">{teamA}</span>
                          <span className="text-slate-400 mx-1.5">vs</span>
                          <span className="text-purple-600 font-medium">{teamB}</span>
                        </div>
                        {i === 0 && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Latest</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Winner: {winnerLabel}{match.score ? ` (${match.score})` : ""}</div>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => setShowUndoPicker(false)} className="w-full mt-4 h-9 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Score Prompt Modal */}
      {pendingEndGame && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="force-light bg-white rounded-2xl shadow-xl w-full max-w-xs p-5">
            <h3 className="text-lg font-bold text-slate-800 text-center mb-1">
              {pendingEndGame.winningTeam === "A" ? "Team A Wins!" : "Team B Wins!"}
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4">Enter score (optional)</p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <input
                id="scoreA"
                type="number"
                min="0"
                max="99"
                placeholder="0"
                className="w-16 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <span className="text-slate-400 font-bold text-lg">-</span>
              <input
                id="scoreB"
                type="number"
                min="0"
                max="99"
                placeholder="0"
                className="w-16 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const scoreA = Number(document.getElementById("scoreA")?.value) || null;
                  const scoreB = Number(document.getElementById("scoreB")?.value) || null;
                  const score = (scoreA || scoreB) ? { a: scoreA || 0, b: scoreB || 0 } : null;
                  endGame(pendingEndGame.courtId, pendingEndGame.winningTeam, score);
                  setPendingEndGame(null);
                }}
                className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
              >
                ✓ Confirm
              </button>
              <button
                onClick={() => {
                  endGame(pendingEndGame.courtId, pendingEndGame.winningTeam, null);
                  setPendingEndGame(null);
                }}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
              >
                Skip Score
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}










