import { useState } from "react";

export default function SessionControls({
  name,
  setName,
  error,
  sessionId,
  players,
  courts,
  directory,
  matchingPlayers,
  highlightedIndex,
  setHighlightedIndex,
  activePlayers,
  totalPlayers,
  totalGamesPlayed,
  inputRef,
  addingPlayer,
  onOpenTierSelection,
  onStartNextGame,
  onShowCourtTypeModal,
  onRemoveCourt,
  onStartNewSession,
  onResetSession,
  onFactoryReset,
  onDeleteDirectoryPlayer,
  onReCheckin,
  onUndoLastMatch,
  inviteCode,
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center justify-around px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{players.length}</div>
          <div className="text-[10px] text-slate-400 uppercase">Queue</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{activePlayers}</div>
          <div className="text-[10px] text-slate-400 uppercase">Playing</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">{courts.length}</div>
          <div className="text-[10px] text-slate-400 uppercase">Courts</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">{totalGamesPlayed}</div>
          <div className="text-[10px] text-slate-400 uppercase">Matches</div>
        </div>
      </div>

      {/* Main controls */}
      <div className="p-3">
        {/* Add player input + button */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={name}
              placeholder="Player name..."
              onChange={(e) => { setName(e.target.value); setHighlightedIndex(-1); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIndex((prev) => prev < matchingPlayers.length - 1 ? prev + 1 : prev); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIndex((prev) => prev > 0 ? prev - 1 : 0); }
                else if (e.key === "Enter" && highlightedIndex >= 0) { e.preventDefault(); setName(matchingPlayers[highlightedIndex].name); setHighlightedIndex(-1); }
                else if (e.key === "Enter") { onOpenTierSelection(); }
                else if (e.key === "Escape") { setHighlightedIndex(-1); }
              }}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {matchingPlayers.length > 0 && name.trim() !== "" && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto z-20">
                {matchingPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between px-3 py-2 text-sm ${highlightedIndex === index ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  >
                    <button type="button" onClick={() => { setName(player.name); setHighlightedIndex(-1); inputRef.current?.focus(); }}
                      className="flex-1 text-left truncate">{player.name}</button>
                    <button type="button" onClick={(e) => onDeleteDirectoryPlayer(e, player)}
                      className="text-red-400 hover:text-red-600 ml-2 text-xs">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onOpenTierSelection}
            disabled={addingPlayer}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {addingPlayer ? "..." : "+ Add"}
          </button>
        </div>

        {/* Primary actions */}
        <div className="flex gap-2 mb-2">
          <button onClick={onStartNextGame}
            className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
            ▶ Start Game
          </button>
          <button onClick={onShowCourtTypeModal}
            className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium">
            + Court
          </button>
          <button onClick={onRemoveCourt}
            className="h-10 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium">
            − Court
          </button>
        </div>

        {/* Toggle more options */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full text-xs text-slate-400 hover:text-slate-600 py-1"
        >
          {showMore ? "▲ Less options" : "▼ More options"}
        </button>

        {/* Advanced options — hidden by default */}
        {showMore && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
            <button onClick={onReCheckin}
              className="col-span-2 h-9 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100">
              🔁 Re-check-in Last Session
            </button>
            <button onClick={onUndoLastMatch}
              className="col-span-2 h-9 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100">
              ⏪ Undo Last Match
            </button>
            <button onClick={onStartNewSession}
              className="h-9 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100">
              ➡️ New Session
            </button>
            <button onClick={onResetSession}
              className="h-9 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100">
              🔄 Restart Session
            </button>
            <button onClick={onFactoryReset}
              className="col-span-2 h-9 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100">
              ☢️ Factory Reset
            </button>
            {inviteCode && (
              <div className="col-span-2 flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div>
                  <div className="text-[10px] text-slate-500">Invite Code</div>
                  <div className="text-sm font-mono font-bold text-slate-800">{inviteCode}</div>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteCode); alert("Invite code copied!"); }}
                  className="h-7 px-2 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}


