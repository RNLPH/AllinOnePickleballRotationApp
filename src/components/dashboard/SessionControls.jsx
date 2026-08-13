const actionButton = `
  h-11
  px-4
  rounded-lg
  font-medium
  text-white
  transition-all
  shadow-sm
  hover:shadow-md
  hover:-translate-y-0.5
`;

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
  onOpenTierSelection,
  onStartNextGame,
  onShowCourtTypeModal,
  onRemoveCourt,
  onStartNewSession,
  onResetSession,
  onFactoryReset,
  onDeleteDirectoryPlayer,
}) {
  return (
    <div
      className="
        bg-white
        rounded-2xl
        shadow-md
        border
        border-slate-200
        p-4
        mb-6
      "
    >
      <h2 className="text-lg font-bold text-slate-700 mb-3">
        🎮 Session Controls
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Player Name Input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={name}
            placeholder="Player Name"
            onChange={(e) => {
              setName(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev < matchingPlayers.length - 1 ? prev + 1 : prev
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault();
                const selected = matchingPlayers[highlightedIndex];
                setName(selected.name);
                setHighlightedIndex(-1);
              } else if (e.key === "Enter") {
                onOpenTierSelection();
              } else if (e.key === "Escape") {
                setHighlightedIndex(-1);
              }
            }}
            className="
              w-full
              h-11
              px-4
              rounded-lg
              border
              border-slate-200
              bg-white
              shadow-sm
              focus:outline-none
              focus:ring-2
              focus:ring-blue-400
            "
          />

          {matchingPlayers.length > 0 && name.trim() !== "" && (
            <div className="absolute bg-white border rounded shadow mt-1 w-full max-h-40 overflow-y-auto z-10">
              {matchingPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-3 py-2 ${
                    highlightedIndex === index
                      ? "bg-blue-100"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setName(player.name);
                      setHighlightedIndex(-1);
                      inputRef.current?.focus();
                    }}
                    className="flex-1 text-left"
                  >
                    {player.name}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => onDeleteDirectoryPlayer(e, player)}
                    className="text-red-500 hover:text-red-700 font-bold px-2"
                    title="Delete saved player"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onOpenTierSelection}
          className={`${actionButton} bg-green-500 hover:bg-green-600`}
        >
          Add Player
        </button>

        <button
          onClick={onStartNextGame}
          className={`${actionButton} bg-blue-500 hover:bg-blue-600`}
        >
          Start Game
        </button>

        <button
          onClick={onShowCourtTypeModal}
          className={`${actionButton} bg-purple-500 hover:bg-purple-600`}
        >
          + Court
        </button>

        <button
          onClick={onRemoveCourt}
          className={`${actionButton} bg-red-500 hover:bg-red-600`}
        >
          - Court
        </button>

        <button
          onClick={onStartNewSession}
          className={`${actionButton} bg-indigo-600 hover:bg-indigo-700`}
        >
          ➡️ New Session
        </button>

        <button
          onClick={onResetSession}
          className={`${actionButton} bg-amber-500 hover:bg-amber-600`}
        >
          🔄 Restart Current Session
        </button>

        <button
          onClick={onFactoryReset}
          className={`${actionButton} bg-slate-700 hover:bg-slate-800`}
        >
          ☢️ Factory Reset
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded bg-red-100 text-red-700">{error}</div>
      )}

      {/* Stats */}
      <div className="mt-4 space-y-1 text-sm md:text-base">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="text-sm text-gray-500">Waiting</div>
            <div className="text-3xl font-bold text-blue-600">
              {players.length}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-xl">
            <div className="text-sm text-gray-500">Playing</div>
            <div className="text-3xl font-bold text-green-600">
              {activePlayers}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl">
            <div className="text-sm text-gray-500">Courts</div>
            <div className="text-3xl font-bold text-purple-600">
              {courts.length}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-xl">
            <div className="text-sm text-gray-500">Total Players</div>
            <div className="text-3xl font-bold text-orange-600">
              {totalPlayers}
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-xl">
            <div className="text-sm text-gray-500">Matches</div>
            <div className="text-3xl font-bold text-red-600">
              {totalGamesPlayed}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
