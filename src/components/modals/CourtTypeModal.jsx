export default function CourtTypeModal({ sessionMode, onSelect, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80">
        <h2 className="text-xl font-bold mb-4">Select Court Type</h2>

        <div className="space-y-2">
          {sessionMode === "open" ? (
            <>
              <button onClick={() => onSelect("winner")} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl">
                🏆 Winner Court
              </button>
              <button onClick={() => onSelect("loser")} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl">
                🔄 Loser Court
              </button>
              <button onClick={() => onSelect("any")} className="w-full bg-slate-500 hover:bg-slate-600 text-white py-3 rounded-xl">
                🏓 Open Court
              </button>
            </>
          ) : sessionMode === "extended_ladder" ? (
            <>
              <button onClick={() => onSelect("king")} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl">
                👑 King's Court
              </button>
              <button onClick={() => onSelect("general")} className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl">
                🎖️ General Court
              </button>
              <button onClick={() => onSelect("knight")} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl">
                ⚔️ Knight Court
              </button>
              <button onClick={() => onSelect("squire")} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl">
                🛡️ Squire Court
              </button>
            </>
          ) : (
            // Ladder Mode (default)
            <>
              <button onClick={() => onSelect("king")} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl">
                👑 King's Court
              </button>
              <button onClick={() => onSelect("knight")} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl">
                ⚔️ Knight Court
              </button>
              <button onClick={() => onSelect("squire")} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl">
                🛡️ Squire Court
              </button>
            </>
          )}

          <button onClick={onCancel} className="w-full bg-gray-200 py-2 rounded-xl">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
