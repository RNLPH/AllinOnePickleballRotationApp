import { useRef } from "react";
import { getRelativeTime } from "../../utils/playerUtils";
import { resizeImageToBase64 } from "../../utils/avatarUtils";
import PlayerAvatar from "../ui/PlayerAvatar";

export default function PlayerProfileModal({
  player,
  getAttendanceCount,
  getPlayerNameById,
  onSaveAvatar,
  onClose,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await resizeImageToBase64(file, 64);
    onSaveAvatar(player, base64);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-96 max-h-[90vh] overflow-y-auto">

        {/* Avatar + name header */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            <PlayerAvatar player={player} size="w-20 h-20" textSize="text-2xl" />

            {/* Upload button overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="
                absolute -bottom-1 -right-1
                w-7 h-7 rounded-full
                bg-blue-500 hover:bg-blue-600
                text-white text-xs
                flex items-center justify-center
                shadow
              "
              title="Upload photo"
            >
              📷
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <h2 className="text-xl font-bold mt-3">{player.name}</h2>

          {player.photoUrl && (
            <button
              onClick={() => onSaveAvatar(player, null)}
              className="text-xs text-red-400 hover:text-red-600 mt-1"
            >
              Remove photo
            </button>
          )}
        </div>

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

          {/* ELO Rating */}
          <div className="flex items-center gap-2">
            <span>Rating:</span>
            <span className="font-bold text-blue-600">{(player.eloRating || 2.0).toFixed(2)}</span>
          </div>
          <div>👥 Sessions Attended: {getAttendanceCount(player.id)}</div>
          <div>
            {player.tier === "king"    && "👑 King's Court"}
            {player.tier === "general" && "🎖️ General Court"}
            {player.tier === "knight"  && "⚔️ Knight Court"}
            {player.tier === "squire"  && "🛡️ Squire Court"}
          </div>
          <div>🔥 Current Streak: {player.currentStreak || 0}</div>
          <div>🏆 Best Streak: {player.bestStreak || 0}</div>
          <div>⏳ Waiting: {getRelativeTime(player.waitingSince)}</div>
          <div>Unique Partners: {Object.keys(player.partnerHistory || {}).length}</div>

          {/* Achievements */}
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
              {player.gamesPlayed > 0 && player.wins / player.gamesPlayed >= 0.75 && (
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

          {/* Partner History */}
          <div className="mt-4">
            <div className="font-semibold mb-2">👥 Partner History</div>
            {Object.entries(player.partnerHistory || {}).length === 0 ? (
              <div className="text-gray-500 text-sm">No partner history yet</div>
            ) : (
              Object.entries(player.partnerHistory || {})
                .sort((a, b) => b[1] - a[1])
                .map(([partnerId, count]) => (
                  <div key={partnerId} className="flex justify-between text-sm py-1">
                    <span>{getPlayerNameById(partnerId)}</span>
                    <span>{count} game{count > 1 ? "s" : ""}</span>
                  </div>
                ))
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-gray-200 hover:bg-gray-300 py-2 rounded-xl"
        >
          Close
        </button>
      </div>
    </div>
  );
}


