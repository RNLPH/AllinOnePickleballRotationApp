import { useState } from "react";

export default function EditPlayerNameModal({ player, onSave, onCancel }) {
  const [newName, setNewName] = useState(player.name);
  const [error, setError] = useState("");

  const handleSave = () => {
    const trimmed = newName.trim();

    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 20) {
      setError("Name cannot exceed 20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
      setError("Only letters, numbers and spaces are allowed.");
      return;
    }
    if (trimmed.toLowerCase() === player.name.toLowerCase()) {
      onCancel();
      return;
    }

    onSave(player, trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80">
        <h2 className="text-xl font-bold mb-1">✏️ Edit Player Name</h2>
        <p className="text-sm text-gray-500 mb-4">Current: <span className="font-semibold text-slate-700">{player.name}</span></p>

        <input
          type="text"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
          autoFocus
          className="
            w-full h-11 px-4 rounded-lg border border-slate-200 bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2
          "
          placeholder="New name"
          maxLength={20}
        />

        {error && (
          <p className="text-red-500 text-xs mb-3">{error}</p>
        )}

        <div className="space-y-2 mt-2">
          <button
            onClick={handleSave}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl font-semibold"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-gray-200 hover:bg-gray-300 py-2 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


