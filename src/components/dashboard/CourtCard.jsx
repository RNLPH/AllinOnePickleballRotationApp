import DroppableCourt from "../dnd/DroppableCourt";
import DroppableCourtPlayer from "../dnd/DroppableCourtPlayer";
import DraggableCourtPlayer from "../dnd/DraggableCourtPlayer";
import { getCourtDuration, getCourtMinutes } from "../../utils/playerUtils";
import { useI18n } from "../../i18n/index.jsx";

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

export default function CourtCard({
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
}) {
  const { t } = useI18n();
  const preview = courtPreviews[court.id] || [];
  const isSingles = court.format === "singles";
  const maxPlayers = isSingles ? 2 : 4;
  const isFull = court.players.length >= maxPlayers;

  return (
    <DroppableCourt courtId={court.id}>
      <div
        className={`
          bg-white
          rounded-2xl
          shadow-lg
          p-5
          border-l-4
          border
          ${isFull && court.startedAt ? (getCourtMinutes(court.startedAt) > 15 ? "border-l-amber-500" : "border-l-green-500") : "border-l-slate-300"}
          border-slate-200
          hover:shadow-xl
          transition-all
          hover:-translate-y-1
        `}
      >
        {/* Court Header */}
        <div
          className="
            flex
            justify-between
            items-start
            mb-3
            pb-3
            border-b
            border-blue-100
          "
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-blue-700">
                {getCourtLabel(court.type)}
                {" "}#{court.id}
              </h2>

              <button
                onClick={() => onSetCourtForEdit(court.id)}
                className="text-lg hover:scale-110 transition-all"
                title="Change Court Type"
              >
                ⚙️
              </button>
            </div>

            {isFull && (
              <span
                className="
                  inline-block
                  mt-1
                  bg-green-100
                  text-green-700
                  px-2
                  py-1
                  rounded-full
                  text-xs
                  font-semibold
                "
              >
                🟢 Active {isSingles ? "Singles" : "Match"}
              </span>
            )}
          </div>

          <span
            className="
              bg-blue-500
              text-white
              px-3
              py-1
              rounded-full
              text-sm
              font-semibold
            "
          >
            {court.players.length}/{maxPlayers}
          </span>
        </div>

        {/* Timer */}
        {court.startedAt && (
          <>
            <div
              className={`
                mb-2
                font-bold
                text-lg
                ${
                  getCourtMinutes(court.startedAt) >= 20
                    ? "text-red-600 animate-pulse"
                    : getCourtMinutes(court.startedAt) >= 15
                    ? "text-yellow-600"
                    : "text-green-600"
                }
              `}
            >
              ⏱ {getCourtDuration(court.startedAt)}
            </div>
            {getCourtMinutes(court.startedAt) > 15 && (
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold mb-2 inline-block">⚡ Long match</span>
            )}

            {/* Partner repeat warning */}
            {partnerWarning && (partnerWarning.teamA > 0 || partnerWarning.teamB > 0) && (
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-700 font-semibold">
                ⚠️ Repeat partners detected —{" "}
                {partnerWarning.teamA > 0 && `Team A have played together ${partnerWarning.teamA}× before`}
                {partnerWarning.teamA > 0 && partnerWarning.teamB > 0 && " · "}
                {partnerWarning.teamB > 0 && `Team B have played together ${partnerWarning.teamB}× before`}
              </div>
            )}
          </>
        )}

        {/* Players */}
        {court.players.length === 0 ? (
          <>
            <div
              className="
                text-center
                py-8
                border-2
                border-dashed
                border-gray-300
                rounded-xl
                text-gray-400
              "
            >
              {tapSelectedPlayer ? "👇 Tap below to assign" : "Drag players here"}
            </div>
            {tapSelectedPlayer && !isFull && (
              <button
                onClick={() => onCourtTap && onCourtTap(court.id)}
                className="w-full mt-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold animate-pulse"
              >
                ➕ Assign {tapSelectedPlayer.name} here
              </button>
            )}
          </>
        ) : isSingles ? (
          /* Singles layout — Player A vs Player B */
          <div className="space-y-4">
            <div className="text-center mb-2">
              <span className="font-bold text-blue-600">🔵 Player A</span>
              <span className="mx-3 text-gray-400">VS</span>
              <span className="font-bold text-purple-600">🟣 Player B</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {court.players.filter(Boolean).map((player, idx) => (
                <div
                  key={player.id}
                  className={`
                    bg-white border-l-4 p-3 rounded-lg flex items-center shadow-sm min-h-[72px]
                    ${idx === 0 ? "border-blue-500" : "border-purple-500"}
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <DroppableCourtPlayer player={player}>
                      <DraggableCourtPlayer player={player} color={idx === 0 ? "blue" : "purple"} />
                    </DroppableCourtPlayer>
                  </div>
                  <button
                    onClick={() => onRemoveCourtPlayer(court.id, player.id)}
                    className="ml-2 flex-shrink-0 text-red-600 font-bold"
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
                <span
                  className="
                    inline-block
                    bg-blue-500
                    text-white
                    px-2
                    py-0.5
                    rounded-full
                    text-xs
                    font-bold
                    mb-1
                  "
                >
                  Team A
                </span>

                {court.players
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((player) => (
                    <div
                      key={player.id}
                      className="
                        bg-white
                        border-l-4
                        border-blue-500
                        p-2
                        rounded-lg
                        mb-1.5
                        flex
                        items-center
                        shadow-sm
                      "
                    >
                      <div className="flex-1 min-w-0">
                        <DroppableCourtPlayer player={player}>
                          <DraggableCourtPlayer player={player} />
                        </DroppableCourtPlayer>
                      </div>

                      <button
                        onClick={() => onRemoveCourtPlayer(court.id, player.id)}
                        className="ml-2 flex-shrink-0 text-red-600 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>

              {/* Team B */}
              <div>
                <span
                  className="
                    inline-block
                    bg-purple-500
                    text-white
                    px-2
                    py-0.5
                    rounded-full
                    text-xs
                    font-bold
                    mb-1
                  "
                >
                  Team B
                </span>

                {court.players
                  .filter(Boolean)
                  .slice(2, 4)
                  .map((player) => (
                    <div
                      key={player.id}
                      className="
                        bg-white
                        border-l-4
                        border-purple-500
                        p-2
                        rounded-lg
                        mb-1.5
                        flex
                        items-center
                        shadow-sm
                      "
                    >
                      <div className="flex-1 min-w-0">
                        <DroppableCourtPlayer player={player}>
                          <DraggableCourtPlayer player={player} color="purple" />
                        </DroppableCourtPlayer>
                      </div>

                      <button
                        onClick={() => onRemoveCourtPlayer(court.id, player.id)}
                        className="ml-2 flex-shrink-0 text-red-600 font-bold"
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
          className="
            w-full
            mb-3
            bg-slate-700
            hover:bg-slate-800
            text-white
            py-2
            rounded-xl
          "
        >
          👀 {t("preview_next")}
        </button>

        {preview.length > 0 && (
          <button
            onClick={() => onRegeneratePreview(court)}
            className="
              w-full
              mb-3
              bg-orange-500
              hover:bg-orange-600
              text-white
              py-2
              rounded-xl
            "
          >
            🔄 Regenerate Preview
          </button>
        )}

        {/* Preview Panel */}
        {preview.length > 0 && (
          <div className="mb-4 border rounded-xl p-3 bg-slate-50">
            <div className="font-bold mb-2">Next Match Preview</div>

            {selectedPreviewPlayer && (
              <div
                className="
                  mb-3
                  rounded-lg
                  bg-yellow-100
                  text-yellow-800
                  p-2
                  text-xs
                  font-semibold
                "
              >
                <div>🔄 Selected: {selectedPreviewPlayer.playerName}</div>
                <div className="mt-1">Click another player to swap.</div>

                <button
                  onClick={() => onSetSelectedPreviewPlayer(null)}
                  className="
                    mt-2
                    px-2
                    py-1
                    rounded
                    bg-red-500
                    text-white
                    text-xs
                    hover:bg-red-600
                  "
                >
                  🚫 Cancel Selection
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 mb-2">
              {isSingles ? "Click two players to swap." : "Click two players to swap positions."}
            </p>

            {isSingles ? (
              /* Singles Preview — Player A vs Player B */
              <>
                <div className="text-sm">
                  🔵 Player A
                  <br />
                  {preview[0] && (
                    <div className={`flex justify-between items-center p-2 rounded mb-1 ${selectedPreviewPlayer?.playerId === preview[0].id ? "bg-yellow-200" : "bg-white"}`}>
                      <span className="flex-1 cursor-pointer" onClick={() => onPreviewPlayerClick(court.id, preview[0])}>{preview[0].name}</span>
                      <button onClick={() => onRemovePreviewPlayer(court.id, preview[0].id)} className="ml-2 text-red-500 font-bold">✕</button>
                    </div>
                  )}
                </div>
                <div className="text-sm mt-2">
                  🟣 Player B
                  {preview[1] && (
                    <div className={`flex justify-between items-center p-2 rounded mb-1 ${selectedPreviewPlayer?.playerId === preview[1].id ? "bg-yellow-200" : "bg-white"}`}>
                      <span className="flex-1 cursor-pointer" onClick={() => onPreviewPlayerClick(court.id, preview[1])}>{preview[1].name}</span>
                      <button onClick={() => onRemovePreviewPlayer(court.id, preview[1].id)} className="ml-2 text-red-500 font-bold">✕</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Doubles Preview — Team A vs Team B */
              <>
            {/* Team A Preview */}
            <div className="text-sm">
              🔵 Team A
              {(() => {
                const count = preview[0] && preview[1]
                  ? (preview[0].partnerHistory?.[preview[1].id] || 0)
                  : 0;
                return count > 0 ? (
                  <span className="ml-2 text-xs text-amber-600 font-semibold">
                    ⚠️ Partnered {count}×
                  </span>
                ) : null;
              })()}
              <br />
              {preview.slice(0, 2).map((player) => (
                <div
                  key={player.id}
                  className={`
                    flex
                    justify-between
                    items-center
                    p-2
                    rounded
                    mb-1
                    ${
                      selectedPreviewPlayer?.playerId === player.id
                        ? "bg-yellow-200"
                        : "bg-white"
                    }
                  `}
                >
                  <span
                    className="flex-1 cursor-pointer"
                    onClick={() => onPreviewPlayerClick(court.id, player)}
                  >
                    {player.name}
                  </span>

                  <button
                    onClick={() => onRemovePreviewPlayer(court.id, player.id)}
                    className="ml-2 text-red-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Team B Preview */}
            <div className="text-sm mt-2">
              🟣 Team B
              {(() => {
                const count = preview[2] && preview[3]
                  ? (preview[2].partnerHistory?.[preview[3].id] || 0)
                  : 0;
                return count > 0 ? (
                  <span className="ml-2 text-xs text-amber-600 font-semibold">
                    ⚠️ Partnered {count}×
                  </span>
                ) : null;
              })()}
              {preview.slice(2, 4).map((player) => (
                <div
                  key={player.id}
                  className={`
                    flex
                    justify-between
                    items-center
                    p-2
                    rounded
                    mb-1
                    ${
                      selectedPreviewPlayer?.playerId === player.id
                        ? "bg-yellow-200"
                        : "bg-white"
                    }
                  `}
                >
                  <span
                    className="flex-1 cursor-pointer"
                    onClick={() => onPreviewPlayerClick(court.id, player)}
                  >
                    {player.name}
                  </span>

                  <button
                    onClick={() => onRemovePreviewPlayer(court.id, player.id)}
                    className="ml-2 text-red-500 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
              </>
            )}

            {/* Add / Replace player */}
            {preview.length < (isSingles ? 2 : 4) ? (
              <button
                onClick={() => onSetSelectedPreviewCourt(court.id)}
                className="
                  w-full
                  mt-2
                  bg-green-500
                  hover:bg-green-600
                  text-white
                  py-2
                  rounded-xl
                "
              >
                ➕ Add Missing Player
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!selectedPreviewPlayer) {
                    alert("Select a preview player to replace first.");
                    return;
                  }
                  onSetSelectedPreviewCourt(court.id);
                }}
                className="
                  w-full
                  mt-2
                  bg-blue-500
                  hover:bg-blue-600
                  text-white
                  py-2
                  rounded-xl
                "
              >
                🔄 Replace Preview Player
              </button>
            )}

            <button
              onClick={() => onConfirmPreview(court.id)}
              disabled={!!selectedPreviewPlayer}
              className="
                w-full
                mt-3
                bg-green-600
                hover:bg-green-700
                text-white
                py-2
                rounded-xl
                disabled:bg-gray-400
                disabled:cursor-not-allowed
              "
            >
              ✅ Confirm Match
            </button>
          </div>
        )}

        {/* Tap-to-assign button (shows when player selected and court not full) */}
        {tapSelectedPlayer && !isFull && court.players.length > 0 && (
          <button
            onClick={() => onCourtTap && onCourtTap(court.id)}
            className="w-full mt-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold animate-pulse"
          >
            ➕ Assign {tapSelectedPlayer.name} here
          </button>
        )}

        {/* Clear Court */}
        {court.players.length > 0 && (
          <button
            onClick={() => onClearCourt(court.id)}
            className="w-full mt-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          >
            🧹 Clear Court
          </button>
        )}

        {/* End Game */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => onEndGame(court.id, "A")}
            disabled={!isFull}
            className="
              bg-gradient-to-r
              from-blue-500
              to-blue-700
              text-white
              font-semibold
              py-2
              rounded-xl
              shadow-sm
              hover:shadow-md
              disabled:bg-gray-400
            "
          >
            {isSingles ? "Player A Wins" : t("team_a_wins")}
          </button>

          <button
            onClick={() => onEndGame(court.id, "B")}
            disabled={!isFull}
            className="
              bg-gradient-to-r
              from-purple-500
              to-purple-700
              text-white
              font-semibold
              py-2
              rounded-xl
              shadow-sm
              hover:shadow-md
              disabled:bg-gray-400
            "
          >
            {isSingles ? "Player B Wins" : t("team_b_wins")}
          </button>
        </div>
      </div>
    </DroppableCourt>
  );
}


