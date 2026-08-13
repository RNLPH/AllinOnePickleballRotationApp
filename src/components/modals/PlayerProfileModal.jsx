import { getRelativeTime } from "../../utils/playerUtils";

export default function PlayerProfileModal({
  player,
  getAttendanceCount,
  getPlayerNameById,
  onClose,
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
          w-96
        "
      >
        <h2 className="text-2xl font-bold mb-4">👤 {player.name}</h2>

        <div className="space-y-2">
          <div>Games: {player.gamesPlayed || 0}</div>
          <div>Wins: {player.wins || 0}</div>
          <div>Losses: {player.losses || 0}</div>

          <div>
            Win Rate:{" "}
            {player.gamesPlayed > 0
              ? Math.round((player.wins / player.gamesPlayed) * 100)
              : 0}
            %
          </div>

          <div>King Court Entries: {player.kingCourtEntries || 0}</div>

          <div>
            👥 Sessions Attended: {getAttendanceCount(player.id)}
          </div>

          <div>
            {player.tier === "king" && "👑 King's Court"}
            {player.tier === "knight" && "⚔️ Knight Court"}
            {player.tier === "squire" && "🛡️ Squire Court"}
          </div>

          <div>🔥 Current Streak: {player.currentStreak || 0}</div>
          <div>🏆 Best Streak: {player.bestStreak || 0}</div>
          <div>⏳ Waiting: {getRelativeTime(player.waitingSince)}</div>

          <div>
            Unique Partners:{" "}
            {Object.keys(player.partnerHistory || {}).length}
          </div>

          <div className="mt-4">
            <div className="font-semibold mb-2">🏆 Achievements</div>

            <div className="flex flex-wrap gap-2">
              {(player.wins || 0) >= 10 && (
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">
                  🏅 10 Wins Club
                </span>
              )}

              {(player.bestStreak || 0) >= 3 && (
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs">
                  🔥 Hot Streak
                </span>
              )}

              {(player.kingCourtEntries || 0) >= 3 && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                  👑 Court Veteran
                </span>
              )}

              {player.gamesPlayed > 0 &&
                player.wins / player.gamesPlayed >= 0.75 && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                    🎯 75% Win Rate
                  </span>
                )}

              {Object.keys(player.partnerHistory || {}).length >= 5 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                  🤝 Team Player
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="font-semibold mb-2">👥 Partner History</div>

            {Object.entries(player.partnerHistory || {}).length === 0 ? (
              <div className="text-gray-500 text-sm">No partner history yet</div>
            ) : (
              Object.entries(player.partnerHistory || {})
                .sort((a, b) => b[1] - a[1])
                .map(([partnerId, count]) => (
                  <div
                    key={partnerId}
                    className="flex justify-between text-sm py-1"
                  >
                    <span>{getPlayerNameById(partnerId)}</span>
                    <span>
                      {count} game{count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="
            mt-5
            w-full
            bg-gray-200
            hover:bg-gray-300
            py-2
            rounded-xl
          "
        >
          Close
        </button>
      </div>
    </div>
  );
}
