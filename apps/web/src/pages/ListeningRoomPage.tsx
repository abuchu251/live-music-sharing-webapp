import React, { useState, useEffect, useCallback, useRef } from "react";
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
  MessageSquare,
  Trash2,
  LogOut,
} from "lucide-react";
import { copyToClipboard } from "../utils/clipboard";
import { RoomPlayer } from "../components/player/RoomPlayer";
import { RoomSidebar } from "../features/room/RoomSidebar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { getRoom } from "../services/api";
import { connectSocket, getSocket } from "../services/socket";
import type { Room, Participant, RoomStatus, QueueItem, ChatMessage } from "@synctune/shared-types";
import type { MockParticipant } from "../features/room/mockData";

const AVATAR_PRESETS = ["🎧", "🎵", "🎸", "🎹", "🎷", "🎺", "🥁", "🎤", "👾", "✨", "🦊", "🚀"];

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

  // Strictly isolate participant IDs to sessionStorage so different tabs don't impersonate each other
  if (typeof window !== "undefined") {
    localStorage.removeItem(`synctune:participantId:${roomId}`);
  }

  const storedParticipantId = sessionStorage.getItem(`synctune:participantId:${roomId}`);
  const storedUsername = sessionStorage.getItem(`synctune:username:${roomId}`);
  const storedAvatar = sessionStorage.getItem(`synctune:avatar:${roomId}`);

  const initialUsername = locationState.username || storedUsername || "";
  const initialAvatar =
    locationState.avatar ||
    storedAvatar ||
    localStorage.getItem("synctune:pref:avatar") ||
    AVATAR_PRESETS[0] || "🎧";

  const [username, setUsername] = useState(initialUsername);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [participantId, setParticipantId] = useState<string | null>(
    locationState.participantId || storedParticipantId || null
  );

  // If user opens link directly without a chosen username, prompt them first!
  const [needsNamePrompt, setNeedsNamePrompt] = useState(!initialUsername);
  const [promptName, setPromptName] = useState(
    localStorage.getItem("synctune:pref:username") || ""
  );
  const [promptAvatar, setPromptAvatar] = useState(initialAvatar);

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatToast, setChatToast] = useState<ChatMessage | null>(null);
  const [hostPromotedToast, setHostPromotedToast] = useState(false);
  const [isPlaylistFinished, setIsPlaylistFinished] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"queue" | "participants" | "chat">("queue");
  const [replyPrefill, setReplyPrefill] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Request browser notification permission for out-of-chrome chat alerts
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Playback & Queue state (integrated with UI)
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const playbackRevisionRef = useRef(0);

  const isHost = Boolean(room && participantId && room.hostId === participantId);
  const currentSong = queue[currentSongIndex] || null;

  // Pre-fetch room info when prompt is visible so user sees the room name
  useEffect(() => {
    if (!roomId) return;
    getRoom(roomId)
      .then(({ room: fetchedRoom }) => {
        setRoom(fetchedRoom);
        if (needsNamePrompt) setIsLoading(false);
      })
      .catch((err) => {
        if (needsNamePrompt) {
          setError(err instanceof Error ? err.message : "Failed to load room.");
          setIsLoading(false);
        }
      });
  }, [roomId, needsNamePrompt]);

  // Handle joining after listener provides their name
  const handleJoinPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = promptName.trim();
    if (!cleanName) return;

    localStorage.setItem("synctune:pref:username", cleanName);
    localStorage.setItem("synctune:pref:avatar", promptAvatar);
    sessionStorage.setItem(`synctune:username:${roomId}`, cleanName);
    sessionStorage.setItem(`synctune:avatar:${roomId}`, promptAvatar);

    setUsername(cleanName);
    setAvatar(promptAvatar);
    setNeedsNamePrompt(false);
    setIsLoading(true);
  };

  // Initialize Room & Socket.IO Connection
  useEffect(() => {
    if (needsNamePrompt || !username) {
      return;
    }

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
        if (fetchedRoom.currentPlaybackState?.revision) {
          playbackRevisionRef.current = fetchedRoom.currentPlaybackState.revision;
        }

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
              if (res.room.currentPlaybackState?.revision) {
                playbackRevisionRef.current = res.room.currentPlaybackState.revision;
              }
              // SessionStorage isolates this specific tab's participant
              sessionStorage.setItem(`synctune:participantId:${roomId}`, res.participantId);
              sessionStorage.setItem(`synctune:username:${roomId}`, username);
              sessionStorage.setItem(`synctune:avatar:${roomId}`, avatar);
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

        // Listen for new chat messages & trigger notification toast and native desktop alert
        socket.on("chat:message", (newMsg) => {
          if (!isMounted) return;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.senderUsername !== username) {
            setChatToast(newMsg);

            // Native out-of-browser notification when minimized or in another tab/app
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted" &&
              document.hidden
            ) {
              try {
                const plainContent = newMsg.content.replace(/<[^>]*>?/gm, "");
                const notif = new Notification(`${newMsg.senderUsername} • SyncTune`, {
                  body: plainContent,
                  tag: `synctune-msg-${newMsg.id}`,
                });
                notif.onclick = () => {
                  window.focus();
                  notif.close();
                };
              } catch {
                // Ignore notification constructor errors
              }
            }
          }
        });

        // Listen for room being closed/deleted by the host
        socket.on("room:closed", (data) => {
          if (!isMounted) return;
          sessionStorage.removeItem("synctune:active_room");
          alert(data?.reason || "This room has been closed by the host.");
          navigate("/");
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

        // Listen for participant connection updates (disconnect/reconnect, automatic host promotion)
        socket.on("room:participant-updated", (updatedParticipant) => {
          if (!isMounted) return;
          setParticipants((prev) =>
            prev.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))
          );
          if (updatedParticipant.role === "HOST") {
            setRoom((prev) => (prev ? { ...prev, hostId: updatedParticipant.id } : prev));
            // Real-time host promotion without reload
            if (updatedParticipant.id === participantId) {
              setHostPromotedToast(true);
            }
          }
        });

        // Listen for room status changes (e.g. Host disconnected)
        socket.on("room:status-changed", ({ status }) => {
          if (!isMounted) return;
          setRoomStatus(status);
        });

        // Listen for playback state updates to keep revision and current track in sync
        socket.on("playback:state-update", (state) => {
          if (!isMounted) return;
          if (state?.revision) {
            playbackRevisionRef.current = state.revision;
          }
          if (state?.videoId) {
            setQueue((currQueue) => {
              const foundIdx = currQueue.findIndex((q) => q.videoId === state.videoId);
              if (foundIdx !== -1) {
                setCurrentSongIndex(foundIdx);
                setIsPlaylistFinished(false);
              }
              return currQueue;
            });
          }
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
      socket.off("room:participant-joined");
      socket.off("room:participant-left");
      socket.off("room:participant-updated");
      socket.off("room:status-changed");
      socket.off("room:closed");
      socket.off("queue:updated");
      socket.off("chat:message");
      socket.off("playback:state-update");
    };
  }, [roomId, username, avatar, needsNamePrompt, participantId]);

  const handleChangeVideo = useCallback((videoId: string, _title?: string) => {
    const socket = getSocket();
    if (isHost) {
      socket.emit("playback:command", {
        type: "change-video",
        payload: { videoId, position: 0 },
        revision: playbackRevisionRef.current,
      }, (res) => {
        if (!res.ok) console.error("Failed to change video:", res.error);
      });
    }
    const foundIdx = queue.findIndex((q: QueueItem) => q.videoId === videoId);
    if (foundIdx !== -1) {
      setCurrentSongIndex(foundIdx);
    }
  }, [isHost, queue]);

  const handleNextTrack = useCallback(() => {
    if (!isHost || queue.length === 0) return;
    if (currentSongIndex < queue.length - 1) {
      const nextIndex = currentSongIndex + 1;
      setCurrentSongIndex(nextIndex);
      setIsPlaylistFinished(false);
      const nextSong = queue[nextIndex];
      if (nextSong) {
        handleChangeVideo(nextSong.videoId, nextSong.title);
      }
    } else {
      // Reached the end of the playlist!
      console.log("[Queue] Playlist finished.");
      setIsPlaylistFinished(true);
      const socket = getSocket();
      socket.emit("playback:command", {
        type: "pause",
        payload: { position: 0 },
        revision: playbackRevisionRef.current,
      }, (res) => {
        if (!res.ok) console.error("Failed to pause at end of queue:", res.error);
      });
    }
  }, [currentSongIndex, queue, isHost, handleChangeVideo]);

  const handlePreviousTrack = useCallback(() => {
    if (!isHost || queue.length === 0) return;
    const prevIndex = currentSongIndex > 0 ? currentSongIndex - 1 : queue.length - 1;
    setCurrentSongIndex(prevIndex);
    setIsPlaylistFinished(false);
    const prevSong = queue[prevIndex];
    if (prevSong) {
      handleChangeVideo(prevSong.videoId, prevSong.title);
    }
  }, [currentSongIndex, queue, isHost, handleChangeVideo]);

  const handleReplayPlaylist = useCallback(() => {
    if (!isHost || queue.length === 0) return;
    setCurrentSongIndex(0);
    setIsPlaylistFinished(false);
    const firstSong = queue[0];
    if (firstSong) {
      handleChangeVideo(firstSong.videoId, firstSong.title);
    }
  }, [isHost, queue, handleChangeVideo]);

  const handlePlayQueuedSong = useCallback((song: QueueItem, index: number) => {
    if (!isHost) return;
    setCurrentSongIndex(index);
    setIsPlaylistFinished(false);
    handleChangeVideo(song.videoId, song.title);
  }, [isHost, handleChangeVideo]);

  const handleBackToHome = () => {
    // Keep user in the room session - do NOT emit room:leave
    if (room && roomId) {
      sessionStorage.setItem(
        "synctune:active_room",
        JSON.stringify({
          roomId,
          roomName: room.name,
          isHost,
          currentSongTitle: currentSong?.title || "Live Stream",
          videoId: currentSong?.videoId || room.currentPlaybackState?.videoId || "jfKfPfyJRdk",
          participantId,
        })
      );
    }
    navigate("/");
  };

  const handleExplicitLeave = () => {
    sessionStorage.removeItem("synctune:active_room");
    const socket = getSocket();
    socket.emit("room:leave");
    navigate("/");
  };

  const handleConfirmDeleteRoom = () => {
    const socket = getSocket();
    socket.emit("room:close", (res) => {
      if (res.ok) {
        sessionStorage.removeItem("synctune:active_room");
        setShowDeleteModal(false);
        navigate("/");
      } else {
        alert(res.error || "Failed to delete room.");
      }
    });
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
    copyToClipboard(window.location.href).then((ok) => {
      if (ok) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    });
  };

  const handleCopyRoomCode = () => {
    copyToClipboard(room?.id || roomId).then((ok) => {
      if (ok) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    });
  };

  // Auto-dismiss chat toast notification
  useEffect(() => {
    if (!chatToast) return;
    const timer = setTimeout(() => setChatToast(null), 5000);
    return () => clearTimeout(timer);
  }, [chatToast]);

  // Convert Participant[] to format expected by RoomSidebar
  const sidebarParticipants: MockParticipant[] = participants.map((p) => ({
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    role: p.role,
    status: p.isConnected ? "online" : "offline",
    ping: 28,
  }));

  // Listener Join Prompt: If user visited via invite link without setting a name, prompt them first
  if (needsNamePrompt) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-purple-600/30">
              <Radio className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Join Listening Room</h2>
            <p className="text-xs text-zinc-400">
              {room?.name ? (
                <>You're invited to join <strong className="text-zinc-200">"{room.name}"</strong></>
              ) : (
                "Enter your nickname to join the live synchronized music session."
              )}
            </p>
          </div>

          <form onSubmit={handleJoinPromptSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Your Display Name</label>
              <input
                type="text"
                required
                maxLength={24}
                autoFocus
                placeholder="Enter your name or nickname..."
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                className="w-full text-sm rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Choose Your Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_PRESETS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setPromptAvatar(av)}
                    className={`text-xl p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      promptAvatar === av
                        ? "bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/40"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!promptName.trim()}
              className="w-full py-3 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Join Room & Listen Live</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-1">
            <Link to="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              onClick={handleBackToHome}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              title="Browse Home (Keep Listening)"
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
                  <button
                    onClick={handleCopyRoomCode}
                    className="font-mono hover:text-white flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800 cursor-pointer transition-colors text-xs"
                    title="Click to copy Room Code"
                  >
                    {copiedCode ? (
                      <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                        <Check className="w-3 h-3" /> Copied! 🎉
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-300">
                        <Copy className="w-3 h-3 text-zinc-400" />
                        <span>Click to copy code</span>
                      </span>
                    )}
                  </button>
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
            {/* Quick Share Link Button */}
            <Button
              variant="outline"
              size="sm"
              title="Click to copy invite link"
              leftIcon={
                copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
              onClick={handleCopyInvite}
            >
              {copiedLink ? "Copied! 🎉" : "Click to copy link"}
            </Button>

            {/* Host Delete Room or Listener Leave Button */}
            {isHost ? (
              <button
                onClick={() => setShowDeleteModal(true)}
                title="Delete and close room for everyone"
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Room</span>
              </button>
            ) : (
              <button
                onClick={handleExplicitLeave}
                title="Leave room"
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            )}

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
        {/* Host Promotion Notification Banner */}
        {hostPromotedToast && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-xs text-amber-200 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <Crown className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Host Succession:</strong> The previous host disconnected. You have been promoted to <strong>Room Host</strong> and now have full control of playback and the queue!
              </span>
            </div>
            <button
              onClick={() => setHostPromotedToast(false)}
              className="px-2.5 py-1 bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 rounded-lg text-xs font-medium cursor-pointer ml-3 transition-colors shrink-0"
            >
              Got it
            </button>
          </div>
        )}

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
              isPlaylistFinished={isPlaylistFinished}
              onNextTrack={handleNextTrack}
              onPreviousTrack={handlePreviousTrack}
              onChangeVideo={handleChangeVideo}
              onReplayPlaylist={handleReplayPlaylist}
              onOpenAddSong={() => setSidebarTab("queue")}
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
              onPlaySong={handlePlayQueuedSong}
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              replyPrefill={replyPrefill}
              onClearReplyPrefill={() => setReplyPrefill("")}
            />
          </aside>
        </div>
      </main>

      {/* Floating Chat Notification Toast with Reply */}
      {chatToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl bg-zinc-900/95 border border-purple-500/40 p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3">
          <div className="text-2xl shrink-0">{chatToast.senderAvatar || "💬"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white truncate">
                {chatToast.senderUsername}
              </span>
              <button
                onClick={() => setChatToast(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-300 truncate mt-0.5">
              {chatToast.content.replace(/<[^>]*>?/gm, "")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setReplyPrefill(`@${chatToast.senderUsername} `);
                  setSidebarTab("chat");
                  setChatToast(null);
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
              >
                <MessageSquare className="w-3 h-3" />
                Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Delete Room Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-red-500/30 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Delete this Room?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This will permanently delete and close &quot;{room.name}&quot; for all connected listeners.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoom}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
