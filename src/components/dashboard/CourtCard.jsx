import { memo } from "react";
import DroppableCourt from "../dnd/DroppableCourt";
import DroppableCourtPlayer from "../dnd/DroppableCourtPlayer";
import DraggableCourtPlayer from "../dnd/DraggableCourtPlayer";
import CountdownRing from "./CountdownRing";
import { getCourtMinutes } from "../../utils/playerUtils";
import { useI18n } from "../../i18n/index.jsx";
import { alertCourtOvertime } from "../../utils/timerAlert";

function getCourtLabel(type) {
  if (type === "king")    return "👑 King's Court";
  if (type === "general") return "🎖️ General Court";
  if (type === "knight")  return "⚔️ Knight Court";
  if (type === "squire")  return "🛡️ Squire Court";
  if (type === "winner")  return "🏆 Winner Court";
  if (type === "loser")   return "🔄 Loser Court";
  if (type === "any")     return "🏓 Open Court";
  return "📌 Court";
}

function CourtCard({
  court,
  courtPreviews,
  selectedPreviewPlayer,
  partnerWarning,
  onEndGame,
  onRemoveCourtPlayer,
  onClearCourt,
  onSetCourtForEdit,
  onGeneratePreview,
  onRegeneratePreview,
  onConfirmPreview,
  onPreviewPlayerClick,
  onRemovePreviewPlayer,
  onSetSelectedPreviewCourt,
  onSetSelectedPreviewPlayer,
  tapSelectedPlayer,
  onCourtTap,
  onToggleLock,
}) {
  const { t } = useI18n();
  const preview = courtPreviews[court.id] || [];
  const isSingles = court.format === "singles";
  const maxPlayers = isSingles ? 2 : 4;
  const isFull = court.players.length >= maxPlayers;
  const courtMinutes = getCourtMinutes(court.startedAt);

  // Border color based on court state
  const borderColor = isFull && court.startedAt
    ? courtMinutes >= 20
      ? "border-l-red-500"
      : courtMinutes > 15
      ? "border-l-amber-500"
      : "border-l-green-500"
    : "border-l-slate-300";

  return (
    <DroppableCourt courtId={court.id}>
      <div
        className={`glass-card rounded-2xl p-4 border-l-4 hover:shadow-premium-hover transition-all animate-slide-up ${borderColor}`}
        role="region"
        aria-label={`${getCourtLabel(court.type)} number ${court.id}, ${court.players.length} of ${maxPlayers} players`}
      >
        {/* Court Header */}
        <div className="flex justify-between items-start mb-3 pb-3 border-b border-blue-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-blue-700">
                {court.customName || `${getCourtLabel(court.type)} #${court.id}`}
              </h2>
              <button
                onClick={() => onSetCourtForEdit(court.id)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-all"
                title="Change Court Type"
                aria-label={`Court ${court.id} settings`}
              >
                ⚙️
              </button>
              <button
                onClick={() => onToggleLock && onToggleLock(court.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${court.locked ? "bg-red-100 hover:bg-red-200" : "hover:bg-slate-100"}`}
                title={court.locked ? "Unlock court (allow auto-fill)" : "Lock court (prevent auto-fill)"}
                aria-label={court.locked ? "Unlock court" : "Lock court"}
                aria-pressed={!!court.locked}
              >
                {court.locked ? "🔒" : "🔓"}
              </button>
            </div>
            {isFull && (
              <span className="inline-block mt-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                🟢 Active {isSingles ? "Singles" : "Match"}
              </span>
            )}
            {court.locked && !isFull && (
              <span className="inline-block mt-1 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-semibold">
                🔒 Locked — no auto-fill
              </span>
            )}
          </div>
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold" aria-label={`${court.players.length} of ${maxPlayers} players`}>
            {court.players.length}/{maxPlayers}
          </span>
        </div>

        {/* Timer — Countdown Ring with circular progress */}
        <CountdownRing startedAt={court.startedAt} onThresholdReached={alertCourtOvertime} />

        {/* Partner repeat warning */}
        {partnerWarning && (partnerWarning.teamA > 0 || partnerWarning.teamB > 0) && (
          <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-700 font-semibold" role="alert">
            ⚠️ Repeat partners detected —{" "}
            {partnerWarning.teamA > 0 && `Team A played together ${partnerWarning.teamA}× before`}
            {partnerWarning.teamA > 0 && partnerWarning.teamB > 0 && " · "}
            {partnerWarning.teamB > 0 && `Team B played together ${partnerWarning.teamB}× before`}
          </div>
        )}

        {/* Players */}
        {court.players.length === 0 ? (
          <>
            <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-400">
              {tapSelectedPlayer ? "👇 Tap below to assign" : "Drag players here or tap to assign"}
            </div>
            {tapSelectedPlayer && !isFull && (
              <button
                onClick={() => onCourtTap && onCourtTap(court.id)}
                className="w-full mt-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold"
                aria-label={`Assign ${tapSelectedPlayer.name} to court ${court.id}`}
              >
                ➕ Assign {tapSelectedPlayer.name} here
              </button>
            )}
          </>
        ) : isSingles ? (
          <div className="space-y-3">
            <div className="text-center mb-2">
              <span className="font-bold text-blue-600">🔵 Player A</span>
              <span className="mx-3 text-gray-400">VS</span>
              <span className="font-bold text-purple-600">🟣 Player B</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {court.players.filter(Boolean).map((player, idx) => (
                <div
                  key={player.id}
                  className={`bg-white border-l-4 p-3 rounded-lg flex items-center shadow-sm min-h-[72px] ${idx === 0 ? "border-blue-500" : "border-purple-500"}`}
                >
                  <div className="flex-1 min-w-0">
                    <DroppableCourtPlayer player={player}>
                      <DraggableCourtPlayer player={player} color={idx === 0 ? "blue" : "purple"} />
                    </DroppableCourtPlayer>
                  </div>
                  <button
                    onClick={() => onRemoveCourtPlayer(court.id, player.id)}
                    className="ml-2 w-8 h-8 flex-shrink-0 text-red-600 font-bold rounded-lg hover:bg-red-50 flex items-center justify-center"
                    aria-label={`Remove ${player.name} from court`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {/* Team A */}
              <div>
                <span className="inline-block bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-bold mb-1">
                  Team A
                </span>
                {court.players.filter(Boolean).slice(0, 2).map((player) => (
                  <div key={player.id} className="bg-white border-l-4 border-blue-500 p-2 rounded-lg mb-1.5 flex items-center shadow-sm">
                    <div className="flex-1 min-w-0">
                      <DroppableCourtPlayer player={player}>
                        <DraggableCourtPlayer player={player} />
                      </DroppableCourtPlayer>
                    </div>
                    <button
                      onClick={() => onRemoveCourtPlayer(court.id, player.id)}
                      className="ml-2 w-8 h-8 flex-shrink-0 text-red-600 font-bold rounded-lg hover:bg-red-50 flex items-center justify-center"
                      aria-label={`Remove ${player.name} from court`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {/* Team B */}
              <div>
                <span className="inline-block bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-bold mb-1">
                  Team B
                </span>
                {court.players.filter(Boolean).slice(2, 4).map((player) => (
                  <div key={player.id} className="bg-white border-l-4 border-purple-500 p-2 rounded-lg mb-1.5 flex items-center shadow-sm">
                    <div className="flex-1 min-w-0">
                      <DroppableCourtPlayer player={player}>
                        <DraggableCourtPlayer player={player} color="purple" />
                      </DroppableCourtPlayer>
                    </div>
                    <button
                      onClick={() => onRemoveCourtPlayer(court.id, player.id)}
                      className="ml-2 w-8 h-8 flex-shrink-0 text-red-600 font-bold rounded-lg hover:bg-red-50 flex items-center justify-center"
                      aria-label={`Remove ${player.name} from court`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview Controls */}
        <button
          onClick={() => onGeneratePreview(court)}
          className="w-full mb-3 mt-3 bg-slate-700 hover:bg-slate-800 text-white py-2.5 rounded-xl font-medium"
          aria-label={`Preview next match for court ${court.id}`}
        >
          👀 {t("preview_next")}
        </button>

        {preview.length > 0 && (
          <button
            onClick={() => onRegeneratePreview(court)}
            className="w-full mb-3 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-medium"
            aria-label="Regenerate preview"
          >
            🔄 Regenerate Preview
          </button>
        )}

        {/* Preview Panel */}
        {preview.length > 0 && (
          <div className="mb-4 border rounded-xl p-3 bg-slate-50">
            <div className="font-bold mb-2">Next Match Preview</div>

            {selectedPreviewPlayer && (
              <div className="mb-3 rounded-lg bg-yellow-100 text-yellow-800 p-2 text-xs font-semibold">
                <div>🔄 Selected: {selectedPreviewPlayer.playerName}</div>
                <div className="mt-1">Click another player to swap.</div>
                <button
                  onClick={() => onSetSelectedPreviewPlayer(null)}
                  className="mt-2 px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600"
                  aria-label="Cancel preview selection"
                >
                  🚫 Cancel Selection
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 mb-2">
              {isSingles ? "Click two players to swap." : "Click two players to swap positions."}
            </p>

            {isSingles ? (
              <>
                <div className="text-sm">
                  🔵 Player A<br />
                  {preview[0] && (
                    <div className={`flex justify-between items-center p-2 rounded mb-1 ${selectedPreviewPlayer?.playerId === preview[0].id ? "bg-yellow-200" : "bg-white"}`}>
                      <span className="flex-1 cursor-pointer" onClick={() => onPreviewPlayerClick(court.id, preview[0])} tabIndex={0} role="button">{preview[0].name}</span>
                      <button onClick={() => onRemovePreviewPlayer(court.id, preview[0].id)} className="ml-2 text-red-500 font-bold" aria-label={`Remove ${preview[0].name} from preview`}>✕</button>
                    </div>
                  )}
                </div>
                <div className="text-sm mt-2">
                  🟣 Player B
                  {preview[1] && (
                    <div className={`flex justify-between items-center p-2 rounded mb-1 ${selectedPreviewPlayer?.playerId === preview[1].id ? "bg-yellow-200" : "bg-white"}`}>
                      <span className="flex-1 cursor-pointer" onClick={() => onPreviewPlayerClick(court.id, preview[1])} tabIndex={0} role="button">{preview[1].name}</span>
                      <button onClick={() => onRemovePreviewPlayer(court.id, preview[1].id)} className="ml-2 text-red-500 font-bold" aria-label={`Remove ${preview[1].name} from preview`}>✕</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm">
                  🔵 Team A
                  {(() => {
                    const count = preview[0] && preview[1] ? (preview[0].partnerHistory?.[preview[1].id] || 0) : 0;
                    return count > 0 ? <span className="ml-2 text-xs text-amber-600 font-semibold">⚠️ Partnered {count}×</span> : null;
                  })()}
                  <br />
                  {preview.slice(0, 2).map((player) => (
                    <div key={player.id} className={`flex justify-between items-center p-2 rounded mb-1 ${selectedPreviewPlayer?.playerId === player.id ? "bg-yellow-200" : "bg-white"}`}>
                      <span className="flex-1 cursor-pointer" onClick={() => onPreviewPlayerClick(court.id, player)} tabIndex={0} role="button">{player.name}</span>
                      <button onClick={() => onRemovePreviewPlayer(court.id, player.id)} className="ml-2 text-red-500 font-bold" aria-label={`Remove ${player.name} from preview`}>✕</button>
                    </div>
                  ))}
                </div>
                <div className="text-sm mt-2">
                  🟣 Team B
                  {(() => {
                    const count = preview[2] && preview[3] ? (preview[2].partnerHistory?.[preview[3].id] || 0) : 0;
                    return count > 0 ? <span className="ml-2 text-xs text-amber-600 font-semibold">⚠️ Partnered {count}×</span> : null;
                  })()}
                  {preview.slice(2, 4).map((player) => (
                    <div key={player.id} className={`flex justify-between items-center p-2 rounded mb-1 ${selectedPreviewPlayer?.playerId === player.id ? "bg-yellow-200" : "bg-white"}`}>
                      <span className="flex-1 cursor-pointer" onClick={() => onPreviewPlayerClick(court.id, player)} tabIndex={0} role="button">{player.name}</span>
                      <button onClick={() => onRemovePreviewPlayer(court.id, player.id)} className="ml-2 text-red-500 font-bold" aria-label={`Remove ${player.name} from preview`}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {preview.length < (isSingles ? 2 : 4) ? (
              <button onClick={() => onSetSelectedPreviewCourt(court.id)} className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-medium" aria-label="Add missing player to preview">
                ➕ Add Missing Player
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!selectedPreviewPlayer) {
                    // Use toast instead — caller handles this
                    return;
                  }
                  onSetSelectedPreviewCourt(court.id);
                }}
                className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl font-medium"
                aria-label="Replace preview player"
              >
                🔄 Replace Preview Player
              </button>
            )}

            <button
              onClick={() => onConfirmPreview(court.id)}
              disabled={!!selectedPreviewPlayer}
              className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              aria-label="Confirm match preview"
            >
              ✅ Confirm Match
            </button>
          </div>
        )}

        {/* Tap-to-assign button */}
        {tapSelectedPlayer && !isFull && court.players.length > 0 && (
          <button
            onClick={() => onCourtTap && onCourtTap(court.id)}
            className="w-full mt-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold"
            aria-label={`Assign ${tapSelectedPlayer.name} to court ${court.id}`}
          >
            ➕ Assign {tapSelectedPlayer.name} here
          </button>
        )}

        {/* Clear Court */}
        {court.players.length > 0 && (
          <button
            onClick={() => onClearCourt(court.id)}
            className="w-full mt-2 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            aria-label={`Clear all players from court ${court.id}`}
          >
            🧹 Clear Court
          </button>
        )}

        {/* End Game Buttons — with micro-interactions */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => onEndGame(court.id, "A")}
            disabled={!isFull}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:animate-spring-bounce"
            aria-label={isSingles ? "Player A wins" : "Team A wins"}
          >
            {isSingles ? "Player A Wins" : t("team_a_wins")}
          </button>
          <button
            onClick={() => onEndGame(court.id, "B")}
            disabled={!isFull}
            className="bg-gradient-to-r from-purple-500 to-purple-700 text-white font-semibold py-2.5 rounded-xl shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed active:animate-spring-bounce"
            aria-label={isSingles ? "Player B wins" : "Team B wins"}
          >
            {isSingles ? "Player B Wins" : t("team_b_wins")}
          </button>
        </div>
      </div>
    </DroppableCourt>
  );
}

export default memo(CourtCard);
