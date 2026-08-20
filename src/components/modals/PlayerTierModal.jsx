export default function PlayerTierModal({ selectedPlayerForEdit, isExtendedMode, onUpdateTier, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="force-light bg-white rounded-2xl p-6 shadow-xl w-80">
        <h2 className="text-xl font-bold mb-4">Change Player Tier</h2>

        <div className="space-y-2">
          <button onClick={() => onUpdateTier(selectedPlayerForEdit, "king")}
            className="w-full bg-yellow-500 text-white py-3 rounded-xl">
            👑 King
          </button>

          {isExtendedMode && (
            <button onClick={() => onUpdateTier(selectedPlayerForEdit, "general")}
              className="w-full bg-purple-500 text-white py-3 rounded-xl">
              🎖️ General
            </button>
          )}

          <button onClick={() => onUpdateTier(selectedPlayerForEdit, "knight")}
            className="w-full bg-indigo-500 text-white py-3 rounded-xl">
            ⚔️ Knight
          </button>

          <button onClick={() => onUpdateTier(selectedPlayerForEdit, "squire")}
            className="w-full bg-green-500 text-white py-3 rounded-xl">
            🛡️ Squire
          </button>

          <button onClick={onCancel} className="w-full bg-gray-200 py-2 rounded-xl">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


