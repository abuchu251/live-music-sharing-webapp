import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router";
import {
  Radio,
  ArrowLeft,
  Crown,
  Users,
  Wifi,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { RoomPlayer } from "../components/player/RoomPlayer";
import { RoomSidebar } from "../features/room/RoomSidebar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { getRoom } from "../services/api";
import { connectSocket, getSocket } from "../services/socket";
import type { Room, Participant, RoomStatus, QueueItem, ChatMessage } from "@synctune/shared-types";
import type { MockParticipant } from "../features/room/mockData";

export const ListeningRoomPage: React.FC = () => {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Location state or stored session credentials
  const locationState = (location.state || {}) as {
    roomName?: string;
    username?: string;
    avatar?: string;
    isHost?: boolean;
    participantId?: string;
  };

  const storedParticipantId = sessionStorage.getItem(`synctune:participantId:${roomId}`);
  const storedUsername = sessionStorage.getItem(`synctune:username:${roomId}`);
  const storedAvatar = sessionStorage.getItem(`synctune:avatar:${roomId}`);

  const [username] = useState(
    locationState.username || storedUsername || `User-${Math.floor(Math.random() * 900 + 100)}`
  );
  const [avatar] = useState(locationState.avatar || storedAvatar || "🎧");
  const [participantId, setParticipantId] = useState<string | null>(
    locationState.participantId || storedParticipantId || null
  );

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Playback & Queue state (integrated with UI)
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const isHost = Boolean(room && participantId && room.hostId === participantId);
  const currentSong = queue[currentSongIndex] || null;

  // Initialize Room & Socket.IO Connection
  useEffect(() => {
    let isMounted = true;

    async function initRoom() {
      if (!roomId) {
        setError("Invalid Room ID.");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch current room state via REST
        const { room: fetchedRoom } = await getRoom(roomId);
        if (!isMounted) return;

        setRoom(fetchedRoom);
        setParticipants(fetchedRoom.participants);
        setQueue(fetchedRoom.queue || []);
        setRoomStatus(fetchedRoom.status);

        // Connect Socket.IO
        const socket = connectSocket();

        // Join room via socket
        socket.emit(
          "room:join",
          {
            roomId,
            username,
            avatar,
            participantId: participantId || undefined,
          },
          (res) => {
            if (!isMounted) return;
            if (res.ok && res.room && res.participantId) {
              setRoom(res.room);
              setParticipants(res.room.participants);
              setQueue(res.room.queue || []);
              setRoomStatus(res.room.status);
              setParticipantId(res.participantId);
              sessionStorage.setItem(`synctune:participantId:${roomId}`, res.participantId);
              setIsConnected(true);
              setIsLoading(false);
            } else {
              setError(res.error || "Failed to join room via socket.");
              setIsLoading(false);
            }
          }
        );

        // Listen for queue updates
        socket.on("queue:updated", (updatedQueue) => {
          if (!isMounted) return;
          setQueue(updatedQueue);
        });

        // Listen for new chat messages
        socket.on("chat:message", (newMsg) => {
          if (!isMounted) return;
          setChatMessages((prev) => [...prev, newMsg]);
        });

        // Listen for new participants
        socket.on("room:participant-joined", (newParticipant) => {
          if (!isMounted) return;
          setParticipants((prev) => {
            const exists = prev.find((p) => p.id === newParticipant.id);
            if (exists) {
              return prev.map((p) => (p.id === newParticipant.id ? newParticipant : p));
            }
            return [...prev, newParticipant];
          });
        });

        // Listen for participant leaving
        socket.on("room:participant-left", ({ participantId: leftId }) => {
          if (!isMounted) return;
          setParticipants((prev) => prev.filter((p) => p.id !== leftId));
        });

        // Listen for participant connection updates (disconnect/reconnect)
        socket.on("room:participant-updated", (updatedParticipant) => {
          if (!isMounted) return;
          setParticipants((prev) =>
            prev.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))
          );
        });

        // Listen for room status changes (e.g. Host disconnected)
        socket.on("room:status-changed", ({ status }) => {
          if (!isMounted) return;
          setRoomStatus(status);
        });

        // Connection state handlers
        socket.on("connect", () => {
          if (!isMounted) return;
          setIsConnected(true);
        });

        socket.on("disconnect", () => {
          if (!isMounted) return;
          setIsConnected(false);
        });
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load room.");
        setIsLoading(false);
      }
    }

    initRoom();

    return () => {
      isMounted = false;
      const socket = getSocket();
      socket.emit("room:leave");
      socket.off("room:participant-joined");
      socket.off("room:participant-left");
      socket.off("room:participant-updated");
      socket.off("room:status-changed");
      socket.off("queue:updated");
      socket.off("chat:message");
    };
  }, [roomId, username, avatar]);

  const handleNextTrack = useCallback(() => {
    if (currentSongIndex < queue.length - 1) {
      setCurrentSongIndex((prev) => prev + 1);
    } else {
      setCurrentSongIndex(0);
    }
  }, [currentSongIndex, queue.length]);

  const handlePreviousTrack = useCallback(() => {
    if (currentSongIndex > 0) {
      setCurrentSongIndex((prev) => prev - 1);
    }
  }, [currentSongIndex]);

  const handleChangeVideo = (videoId: string, _title?: string) => {
    const socket = getSocket();
    if (isHost) {
      socket.emit("playback:command", {
        type: "change-video",
        payload: { videoId, position: 0 },
        revision: room?.currentPlaybackState.revision || 0,
      }, (res) => {
        if (!res.ok) console.error("Failed to change video:", res.error);
      });
    }
  };

  const handleAddSong = (title: string, videoId: string) => {
    const socket = getSocket();
    socket.emit("queue:add", { videoId, title }, (res) => {
      if (!res.ok) {
        alert(res.error || "Failed to add song to queue.");
      }
    });
  };

  const handleRemoveSong = (songId: string) => {
    const socket = getSocket();
    socket.emit("queue:remove", { queueItemId: songId }, (res) => {
      if (!res.ok) {
        alert(res.error || "Failed to remove song from queue.");
      }
    });
  };

  const handleSendMessage = (content: string) => {
    const socket = getSocket();
    socket.emit("chat:send", { content }, (res) => {
      if (!res.ok) {
        alert(res.error || "Failed to send chat message.");
      }
    });
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Convert Participant[] to format expected by RoomSidebar
  const sidebarParticipants: MockParticipant[] = participants.map((p) => ({
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    role: p.role,
    status: p.isConnected ? "online" : "offline",
    ping: 28,
  }));

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 space-y-4">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-sm text-zinc-400">Entering listening room...</p>
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 text-zinc-100 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Room Unavailable</h2>
          <p className="text-sm text-zinc-400 max-w-sm">{error || "This room does not exist or has been closed."}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="secondary" size="md">
              Go Home
            </Button>
          </Link>
          <Link to="/join">
            <Button variant="primary" size="md">
              Try Another Room
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-purple-600 selection:text-white">
      {/* Top Room Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand & Room Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              title="Leave Room"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white flex items-center gap-2 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                  <span>{room.name}</span>
                </h1>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span className="font-mono">ID: {room.id}</span>
                  <span>•</span>
                  <span
                    className={`flex items-center gap-1 ${
                      isConnected ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    <Wifi className="w-3 h-3" /> {isConnected ? "Live Socket" : "Reconnecting..."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions & User Info */}
          <div className="flex items-center gap-2.5">
            {/* Quick Share Button */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
              onClick={handleCopyInvite}
            >
              {copiedLink ? "Copied" : "Invite"}
            </Button>

            {/* Current User Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-800 text-xs">
              <span className="text-base">{avatar}</span>
              <span className="font-medium text-zinc-200">{username}</span>
              {isHost && (
                <Badge variant="amber" size="sm">
                  <Crown className="w-3 h-3 mr-1 inline" />
                  Host
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Room Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Host Disconnected Warning Banner */}
        {roomStatus === "host-disconnected" && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Host Disconnected:</strong> The room host has temporarily left or lost connection.
                Playback state is paused until the host rejoins.
              </span>
            </div>
          </div>
        )}

        {/* Regular Sync Banner */}
        {roomStatus === "active" && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900/40 to-indigo-950/40 border border-purple-500/20 text-xs text-purple-200">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Synchronized listening room is active. All {participants.length} participants receive real-time updates.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Area: Player & Playback Controls (Cols 1-8) */}
          <section className="lg:col-span-8 space-y-4">
            <RoomPlayer
              currentSong={currentSong}
              isHost={isHost}
              initialPlaybackState={room.currentPlaybackState}
              onNextTrack={handleNextTrack}
              onPreviousTrack={handlePreviousTrack}
              onChangeVideo={handleChangeVideo}
            />

            {/* Room Info & Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-400">Room Status</span>
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5 capitalize">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      roomStatus === "active" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  {roomStatus}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-400">Host</span>
                <p className="font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  {isHost ? `${username} (You)` : "Room Host"}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-400">Listeners</span>
                <p className="font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  {participants.filter((p) => p.isConnected).length} Connected
                </p>
              </div>
            </div>
          </section>

          {/* Right Sidebar: Queue, Participants, Chat (Cols 9-12) */}
          <aside className="lg:col-span-4 h-[680px]">
            <RoomSidebar
              roomId={room.id}
              roomName={room.name}
              isHost={isHost}
              currentUser={{ username, avatar }}
              queue={queue}
              participants={sidebarParticipants}
              chatMessages={chatMessages}
              onAddSong={handleAddSong}
              onRemoveSong={handleRemoveSong}
              onSendMessage={handleSendMessage}
            />
          </aside>
        </div>
      </main>
    </div>
  );
};
