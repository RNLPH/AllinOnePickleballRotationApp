import { SESSION_MODES } from "../../constants";

const MODES = [
  {
    category: "Rotation",
    modes: [
      {
        id: SESSION_MODES.OPEN,
        name: "Open Mode",
        emoji: "🏓",
        border: "border-blue-400",
        bg: "from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100",
        desc: "Everyone plays together. Winners play winners, losers play losers. No tiers.",
        tags: [
          { label: "Winners", color: "bg-blue-200 text-blue-800" },
          { label: "Losers", color: "bg-orange-200 text-orange-800" },
          { label: "New", color: "bg-gray-200 text-gray-800" },
        ],
      },
      {
        id: SESSION_MODES.RANDOM_DRAW,
        name: "Random Draw",
        emoji: "🎲",
        border: "border-pink-400",
        bg: "from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100",
        desc: "Completely random teams every round. No skill matching — pure fun.",
        tags: [
          { label: "Random", color: "bg-pink-200 text-pink-800" },
          { label: "Fun", color: "bg-rose-200 text-rose-800" },
        ],
      },
      {
        id: SESSION_MODES.KING_OF_COURT,
        name: "King of the Court",
        emoji: "👑",
        border: "border-amber-400",
        bg: "from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100",
        desc: "Winners stay on court. Losers go to back of queue. Challengers rotate in.",
        tags: [
          { label: "Stay & Play", color: "bg-amber-200 text-amber-800" },
          { label: "Competitive", color: "bg-yellow-200 text-yellow-800" },
        ],
      },
    ],
  },
  {
    category: "Ladder",
    modes: [
      {
        id: SESSION_MODES.LADDER,
        name: "Ladder Mode",
        emoji: "🏆",
        border: "border-yellow-400",
        bg: "from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100",
        desc: "3-tier ranking: King, Knight, Squire. Win to climb, lose to drop.",
        tags: [
          { label: "King (8)", color: "bg-yellow-200 text-yellow-800" },
          { label: "Knight (10)", color: "bg-indigo-200 text-indigo-800" },
          { label: "Squire (10)", color: "bg-green-200 text-green-800" },
        ],
      },
      {
        id: SESSION_MODES.EXTENDED_LADDER,
        name: "Extended Ladder",
        emoji: "🏅",
        border: "border-purple-400",
        bg: "from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100",
        desc: "4-tier: King, General, Knight, Squire. More granular progression.",
        tags: [
          { label: "King (8)", color: "bg-yellow-200 text-yellow-800" },
          { label: "General (10)", color: "bg-purple-200 text-purple-800" },
          { label: "Knight (10)", color: "bg-indigo-200 text-indigo-800" },
          { label: "Squire (10)", color: "bg-green-200 text-green-800" },
        ],
      },
      {
        id: SESSION_MODES.CHALLENGE,
        name: "Challenge Mode",
        emoji: "⚔️",
        border: "border-red-400",
        bg: "from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100",
        desc: "Anyone can challenge anyone on court. Win to take their spot. Loser goes to queue.",
        tags: [
          { label: "1v1 Challenges", color: "bg-red-200 text-red-800" },
          { label: "Open Challenge", color: "bg-orange-200 text-orange-800" },
        ],
      },
    ],
  },
  {
    category: "Structured",
    modes: [
      {
        id: SESSION_MODES.ROUND_ROBIN,
        name: "Round Robin",
        emoji: "🔄",
        border: "border-teal-400",
        bg: "from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100",
        desc: "Everyone plays everyone. Fixed schedule, equal play time. Operator generates rounds.",
        tags: [
          { label: "Fair Play", color: "bg-teal-200 text-teal-800" },
          { label: "Schedule", color: "bg-emerald-200 text-emerald-800" },
        ],
      },
      {
        id: SESSION_MODES.SWISS,
        name: "Swiss System",
        emoji: "🧩",
        border: "border-sky-400",
        bg: "from-sky-50 to-cyan-50 hover:from-sky-100 hover:to-cyan-100",
        desc: "Pair players with similar records each round. No elimination, fair matchups.",
        tags: [
          { label: "Balanced", color: "bg-sky-200 text-sky-800" },
          { label: "By Record", color: "bg-cyan-200 text-cyan-800" },
        ],
      },
      {
        id: SESSION_MODES.FIXED_TEAMS,
        name: "Fixed Teams",
        emoji: "🤝",
        border: "border-lime-400",
        bg: "from-lime-50 to-green-50 hover:from-lime-100 hover:to-green-100",
        desc: "Teams are set manually at the start. Same partners all session. Track team standings.",
        tags: [
          { label: "Team-based", color: "bg-lime-200 text-lime-800" },
          { label: "Doubles", color: "bg-green-200 text-green-800" },
        ],
      },
    ],
  },
];

export default function SessionModeModal({ sessionId, onSelect, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="force-light bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">

        {/* Close button — sticky so it stays visible while scrolling */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="sticky top-3 float-right mr-3 mt-3 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold z-10"
          >
            ✕
          </button>
        )}

        <div className="p-5 sm:p-6">
          <h2 className="text-xl font-bold text-center text-slate-800 mb-1">
            Session {sessionId}
          </h2>
          <p className="text-center text-gray-500 text-xs mb-5">
            Choose a game mode
          </p>

          <div className="space-y-5">
            {MODES.map((group) => (
              <div key={group.category}>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.category}
                </h3>
                <div className="space-y-2">
                  {group.modes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => onSelect(mode.id)}
                      className={`
                        w-full p-3.5 rounded-xl border-2 ${mode.border}
                        bg-gradient-to-br ${mode.bg}
                        transition-all hover:shadow-md text-left
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{mode.emoji}</span>
                        <span className="text-sm font-bold text-slate-800">{mode.name}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed mb-2">
                        {mode.desc}
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {mode.tags.map((tag) => (
                          <span key={tag.label} className={`${tag.color} px-2 py-0.5 rounded-full text-[9px] font-semibold`}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
