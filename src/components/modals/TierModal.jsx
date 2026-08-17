import { useState } from "react";

export default function TierModal({ pendingPlayerName, isExtendedMode, onSelect, onCancel }) {
  const [saving, setSaving] = useState(false);

  const handleSelect = async (tier) => {
    if (saving) return;
    setSaving(true);
    await onSelect(tier);
    // setSaving back to false is not needed since the modal closes on success
    // but if validation fails and the modal stays open, reset it
    setSaving(false);
  };

  const btnBase = "w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80">
        <h2 className="text-xl font-bold mb-4">Select Tier</h2>

        <div className="mb-4">
          Player: <span className="font-bold ml-2">{pendingPlayerName}</span>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => handleSelect("king")}
            disabled={saving}
            className={`${btnBase} bg-yellow-500 hover:bg-yellow-600`}
          >
            {saving ? "Adding..." : "👑 King"}
          </button>

          {isExtendedMode && (
            <button
              onClick={() => handleSelect("general")}
              disabled={saving}
              className={`${btnBase} bg-purple-500 hover:bg-purple-600`}
            >
              {saving ? "Adding..." : "🎖️ General"}
            </button>
          )}

          <button
            onClick={() => handleSelect("knight")}
            disabled={saving}
            className={`${btnBase} bg-indigo-500 hover:bg-indigo-600`}
          >
            {saving ? "Adding..." : "⚔️ Knight"}
          </button>

          <button
            onClick={() => handleSelect("squire")}
            disabled={saving}
            className={`${btnBase} bg-green-500 hover:bg-green-600`}
          >
            {saving ? "Adding..." : "🛡️ Squire"}
          </button>

          <button
            onClick={onCancel}
            disabled={saving}
            className="w-full bg-gray-200 py-2 rounded-xl disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
