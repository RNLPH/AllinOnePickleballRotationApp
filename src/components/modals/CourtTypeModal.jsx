export default function CourtTypeModal({ onSelect, onCancel }) {
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
        <h2 className="text-xl font-bold mb-4">Select Court Type</h2>

        <div className="space-y-2">
          <button
            onClick={() => onSelect("king")}
            className="
              w-full
              bg-yellow-500
              hover:bg-yellow-600
              text-white
              py-3
              rounded-xl
            "
          >
            👑 King's Court
          </button>

          <button
            onClick={() => onSelect("knight")}
            className="
              w-full
              bg-indigo-500
              hover:bg-indigo-600
              text-white
              py-3
              rounded-xl
            "
          >
            ⚔️ Knight Court
          </button>

          <button
            onClick={() => onSelect("squire")}
            className="
              w-full
              bg-green-500
              hover:bg-green-600
              text-white
              py-3
              rounded-xl
            "
          >
            🛡️ Squire Court
          </button>

          <button
            onClick={onCancel}
            className="
              w-full
              bg-gray-200
              py-2
              rounded-xl
            "
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
