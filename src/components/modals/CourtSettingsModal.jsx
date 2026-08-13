export default function CourtSettingsModal({
  editingCourt,
  selectedCourtForEdit,
  onUpdateType,
  onDeleteCourt,
  onCancel,
}) {
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
        <h2 className="text-xl font-bold mb-4">⚙️ Court Settings</h2>

        <div className="space-y-2">
          <button
            onClick={() => onUpdateType(selectedCourtForEdit, "king")}
            className="
              w-full
              bg-yellow-500
              text-white
              py-3
              rounded-xl
            "
          >
            {editingCourt?.type === "king" ? "✅ 👑 King's Court" : "👑 King's Court"}
          </button>

          <button
            onClick={() => onUpdateType(selectedCourtForEdit, "knight")}
            className="
              w-full
              bg-indigo-500
              text-white
              py-3
              rounded-xl
            "
          >
            {editingCourt?.type === "knight" ? "✅ ⚔️ Knight Court" : "⚔️ Knight Court"}
          </button>

          <button
            onClick={() => onUpdateType(selectedCourtForEdit, "squire")}
            className="
              w-full
              bg-green-500
              text-white
              py-3
              rounded-xl
            "
          >
            {editingCourt?.type === "squire" ? "✅ 🛡️ Squire Court" : "🛡️ Squire Court"}
          </button>

          <hr className="my-3" />

          <button
            onClick={() => onDeleteCourt(selectedCourtForEdit)}
            className="
              w-full
              bg-red-500
              hover:bg-red-600
              text-white
              py-3
              rounded-xl
            "
          >
            🗑️ Delete Court
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
