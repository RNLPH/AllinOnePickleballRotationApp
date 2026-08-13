function CourtTypeButtons({ sessionMode, editingCourt, selectedCourtForEdit, onUpdateType }) {
  const btn = (type, label, color) => (
    <button
      key={type}
      onClick={() => onUpdateType(selectedCourtForEdit, type)}
      className={`w-full ${color} text-white py-3 rounded-xl`}
    >
      {editingCourt?.type === type ? `✅ ${label}` : label}
    </button>
  );

  if (sessionMode === "open") {
    return (
      <>
        {btn("winner", "🏆 Winner Court", "bg-blue-500")}
        {btn("loser",  "🔄 Loser Court",  "bg-orange-500")}
        {btn("any",    "🏓 Open Court",   "bg-slate-500")}
      </>
    );
  }

  if (sessionMode === "extended_ladder") {
    return (
      <>
        {btn("king",    "👑 King's Court",   "bg-yellow-500")}
        {btn("general", "🎖️ General Court", "bg-purple-500")}
        {btn("knight",  "⚔️ Knight Court",  "bg-indigo-500")}
        {btn("squire",  "🛡️ Squire Court",  "bg-green-500")}
      </>
    );
  }

  // Ladder Mode (default)
  return (
    <>
      {btn("king",   "👑 King's Court",  "bg-yellow-500")}
      {btn("knight", "⚔️ Knight Court", "bg-indigo-500")}
      {btn("squire", "🛡️ Squire Court", "bg-green-500")}
    </>
  );
}

export default function CourtSettingsModal({
  editingCourt,
  selectedCourtForEdit,
  sessionMode,
  onUpdateType,
  onDeleteCourt,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80">
        <h2 className="text-xl font-bold mb-4">⚙️ Court Settings</h2>

        <div className="space-y-2">
          <CourtTypeButtons
            sessionMode={sessionMode}
            editingCourt={editingCourt}
            selectedCourtForEdit={selectedCourtForEdit}
            onUpdateType={onUpdateType}
          />

          <hr className="my-3" />

          <button
            onClick={() => onDeleteCourt(selectedCourtForEdit)}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl"
          >
            🗑️ Delete Court
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-gray-200 py-2 rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
