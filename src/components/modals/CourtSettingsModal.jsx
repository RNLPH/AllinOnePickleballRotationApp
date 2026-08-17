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
  onUpdateFormat,
  onDeleteCourt,
  onCancel,
}) {
  const isDoubles = editingCourt?.format !== "singles";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80">
        <h2 className="text-xl font-bold mb-4">⚙️ Court Settings</h2>

        <div className="space-y-2">
          {/* Court Format Toggle */}
          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-600 mb-2">Format</div>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => onUpdateFormat(selectedCourtForEdit, "doubles")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isDoubles ? "bg-white shadow text-blue-600" : "text-gray-500"
                }`}
              >
                👥 Doubles (2v2)
              </button>
              <button
                onClick={() => onUpdateFormat(selectedCourtForEdit, "singles")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  !isDoubles ? "bg-white shadow text-blue-600" : "text-gray-500"
                }`}
              >
                🧑 Singles (1v1)
              </button>
            </div>
          </div>

          <hr className="my-3" />

          {/* Court Type */}
          <div className="text-sm font-semibold text-slate-600 mb-2">Court Type</div>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

