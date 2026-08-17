import { SESSION_MODES } from "../../constants";

export default function SessionModeModal({ sessionId, onSelect, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto relative">

        {/* Close button — only show if onCancel is provided (mode already selected) */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        )}

        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          🏓 Session {sessionId}
        </h2>

        <p className="text-center text-gray-500 text-sm mb-6">
          Choose a game mode for this session
        </p>

        {/* Open Mode */}
        <button
          onClick={() => onSelect(SESSION_MODES.OPEN)}
          className="
            w-full mb-3 p-5 rounded-2xl border-2 border-blue-400
            bg-gradient-to-br from-blue-50 to-purple-50
            hover:from-blue-100 hover:to-purple-100
            transition-all hover:shadow-md text-left
          "
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏓</span>
            <span className="text-xl font-bold text-blue-700">Open Mode</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Everyone plays together. Winners play winners, losers play losers.
            No tiers, no promotions — classic round-robin rotation.
          </p>
          <div className="flex gap-2 mt-3">
            <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold">🏆 Winners</span>
            <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full text-xs font-semibold">🔄 Losers</span>
            <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full text-xs font-semibold">🆕 New</span>
          </div>
        </button>

        {/* Ladder Mode */}
        <button
          onClick={() => onSelect(SESSION_MODES.LADDER)}
          className="
            w-full mb-3 p-5 rounded-2xl border-2 border-yellow-400
            bg-gradient-to-br from-yellow-50 to-orange-50
            hover:from-yellow-100 hover:to-orange-100
            transition-all hover:shadow-md text-left
          "
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">👑</span>
            <span className="text-xl font-bold text-yellow-700">Ladder Mode</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            3-tier ranking: <strong>King</strong>, <strong>Knight</strong>, and{" "}
            <strong>Squire</strong>. Win to climb, lose to drop.
          </p>
          <div className="flex gap-2 mt-3">
            <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-semibold">👑 King (8)</span>
            <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-semibold">⚔️ Knight (10)</span>
            <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-semibold">🛡️ Squire (10)</span>
          </div>
        </button>

        {/* Extended Ladder Mode */}
        <button
          onClick={() => onSelect(SESSION_MODES.EXTENDED_LADDER)}
          className="
            w-full p-5 rounded-2xl border-2 border-purple-400
            bg-gradient-to-br from-purple-50 to-indigo-50
            hover:from-purple-100 hover:to-indigo-100
            transition-all hover:shadow-md text-left
          "
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏅</span>
            <span className="text-xl font-bold text-purple-700">Extended Ladder</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            4-tier ranking: <strong>King</strong>, <strong>General</strong>,{" "}
            <strong>Knight</strong>, and <strong>Squire</strong>. More granular progression.
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-semibold">👑 King (8)</span>
            <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs font-semibold">🎖️ General (10)</span>
            <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-semibold">⚔️ Knight (10)</span>
            <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-semibold">🛡️ Squire (8)</span>
          </div>
        </button>

      </div>
    </div>
  );
}
