import { useState } from "react";

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
  onRenameCourt,
  onSetCustomName,
  onCancel,
}) {
  const [newCourtNumber, setNewCourtNumber] = useState(editingCourt?.id?.toString() || "");
  const [customName, setCustomName] = useState(editingCourt?.customName || "");
  const [renameError, setRenameError] = useState("");
  const isDoubles = editingCourt?.format !== "singles";

  const handleRename = () => {
    const num = parseInt(newCourtNumber, 10);
    if (isNaN(num) || num < 1 || num > 99) {
      setRenameError("Enter a number between 1 and 99");
      return;
    }
    if (num === editingCourt?.id) {
      setRenameError("");
      return; // No change needed
    }
    setRenameError("");
    onRenameCourt(selectedCourtForEdit, num);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80 force-light" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">⚙️ Court #{editingCourt?.id} Settings</h2>

        <div className="space-y-2">
          {/* Rename Court */}
          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-600 mb-2">Court Number</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="99"
                value={newCourtNumber}
                onChange={(e) => { setNewCourtNumber(e.target.value); setRenameError(""); }}
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Court number"
              />
              <button
                onClick={handleRename}
                className="h-10 px-4 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
              >
                Rename
              </button>
            </div>
            {renameError && <p className="text-xs text-red-500 mt-1">{renameError}</p>}
          </div>

          {/* Custom Name */}
          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-600 mb-2">Custom Name <span className="text-slate-400 font-normal">(optional)</span></div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Center Court, Court A..."
                maxLength={20}
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Custom court name"
              />
              <button
                onClick={() => onSetCustomName(selectedCourtForEdit, customName.trim() || null)}
                className="h-10 px-4 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
              >
                Set
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Leave empty to use default label</p>
          </div>

          <hr className="my-3" />

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

          {/* Court Type — only for modes that use court types */}
          {(sessionMode === "open" || sessionMode === "ladder" || sessionMode === "extended_ladder") && (
            <>
              <div className="text-sm font-semibold text-slate-600 mb-2">Court Type</div>
              <CourtTypeButtons
                sessionMode={sessionMode}
                editingCourt={editingCourt}
                selectedCourtForEdit={selectedCourtForEdit}
                onUpdateType={onUpdateType}
              />

              <hr className="my-3" />
            </>
          )}

          <button
            onClick={() => onDeleteCourt(selectedCourtForEdit)}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl"
          >
            🗑️ Delete Court
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-gray-200 py-2 rounded-xl mt-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
