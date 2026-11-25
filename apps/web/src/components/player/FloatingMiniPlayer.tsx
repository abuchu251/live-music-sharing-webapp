import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Radio, ArrowRight, X, Music } from "lucide-react";
import { getSocket } from "../../services/socket";

interface ActiveRoomData {
  roomId: string;
  roomName: string;
  isHost: boolean;
  isCohost?: boolean;
  currentSongTitle: string;
  videoId: string;
}

export const FloatingMiniPlayer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeRoom, setActiveRoom] = useState<ActiveRoomData | null>(null);

  // Poll or check active room session whenever location changes
  useEffect(() => {
    const raw = sessionStorage.getItem("synctune:active_room");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setActiveRoom(parsed);
      } catch {
        setActiveRoom(null);
      }
    } else {
      setActiveRoom(null);
    }
  }, [location.pathname]);

  // Don't show mini player if user is already inside any listening room
  if (!activeRoom || location.pathname.startsWith("/room/")) {
    return null;
  }

  const handleReturnToRoom = () => {
    navigate(`/room/${activeRoom.roomId}`);
  };

  const handleLeaveRoom = () => {
    sessionStorage.removeItem("synctune:active_room");
    sessionStorage.removeItem(`synctune:participantId:${activeRoom.roomId}`);
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("room:leave");
    }
    setActiveRoom(null);
  };

  return (
    <aside
      aria-label="Active Room Mini Player"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] rounded-2xl bg-surface-container-lowest/95 border border-outline-variant p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3">
        {/* Vermilion Radio Icon with subtle pulsing ring */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>

        {/* Room & Song Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
            <h4 className="text-xs font-bold text-on-surface truncate">
              {activeRoom.roomName}
            </h4>
          </div>
          <p className="text-[11px] text-tertiary truncate flex items-center gap-1 mt-0.5 font-mono">
            <Music className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{activeRoom.currentSongTitle || "Live Stream"}</span>
          </p>
        </div>

        {/* Close / Leave */}
        <button
          onClick={handleLeaveRoom}
          className="p-1 rounded-lg text-tertiary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          title="Disconnect from Room"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Bar */}
      <div className="mt-3 pt-2.5 border-t border-outline-variant flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-tertiary">
          {activeRoom.isHost ? "👑 Studio Host" : activeRoom.isCohost ? "⭐ Co-Host" : "🎧 Synced Listener"}
        </span>
        <button
          onClick={handleReturnToRoom}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-container text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <span>Return to Session</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
