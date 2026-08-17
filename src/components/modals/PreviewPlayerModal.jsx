export default function PreviewPlayerModal({
  selectedPreviewCourt,
  selectedPreviewPlayer,
  courts,
  courtPreviews,
  getAvailablePreviewPlayers,
  addPreviewPlayer,
  replacePreviewPlayer,
  onCancel,
}) {
  const court = courts.find((c) => c.id === selectedPreviewCourt);
  const availablePlayers = getAvailablePreviewPlayers(court);

  return (
    <div
      className="
        fixed
        inset-0
        bg-black/50
        flex
        items-center
        justify-center
        z-50
      "
    >
      <div
        className="
          bg-white
          rounded-2xl
          p-6
          shadow-xl
          w-80
        "
      >
        <h2 className="text-xl font-bold mb-4">
          Replace {selectedPreviewPlayer?.playerName}
        </h2>

        {availablePlayers.map((player) => {
          const preview = courtPreviews[selectedPreviewCourt] || [];

          return (
            <button
              key={player.id}
              onClick={() => {
                if (preview.length < 4) {
                  addPreviewPlayer(selectedPreviewCourt, player);
                } else {
                  replacePreviewPlayer(
                    selectedPreviewCourt,
                    selectedPreviewPlayer.playerId,
                    player
                  );
                }
              }}
              className="
                w-full
                mb-2
                bg-blue-500
                hover:bg-blue-600
                text-white
                py-2
                rounded-xl
              "
            >
              {player.name}
            </button>
          );
        })}

        <button
          onClick={onCancel}
          className="
            w-full
            bg-gray-200
            py-2
            rounded-xl
          "
        >
          Close
        </button>
      </div>
    </div>
  );
}

