import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  Crown,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Trash2,
  LogOut,
  Link as LinkIcon,
} from "lucide-react";
import { copyToClipboard } from "../utils/clipboard";
import { formatChatContent } from "../utils/text";
import { RoomPlayer } from "../components/player/RoomPlayer";
import { RoomSidebar } from "../features/room/RoomSidebar";
import { Button } from "../components/ui/Button";
import { getRoom } from "../services/api";
import { connectSocket, getSocket } from "../services/socket";
import type { Room, Participant, RoomStatus, QueueItem, ChatMessage, PlaybackState } from "@synctune/shared-types";
import type { MockParticipant } from "../features/room/mockData";

const DESK_AVATARS = ["🎧", "🎵", "🎸", "🎹", "🎷", "💿", "📻", "🎤", "🎛️", "☕"];

export interface ListeningRoomPageProps {
  roomIdOverride?: string;
}

export const ListeningRoomPage: React.FC<ListeningRoomPageProps> = ({ roomIdOverride }) => {
  const { roomId: routeRoomId = "" } = useParams<{ roomId: string }>();
  const roomId = roomIdOverride || routeRoomId;
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = (location.state || {}) as {
    roomName?: string;
    username?: string;
    avatar?: string;
    isHost?: boolean;
    participantId?: string;
  };

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
    DESK_AVATARS[0] || "🎧";

  const [username, setUsername] = useState(initialUsername);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [participantId, setParticipantId] = useState<string | null>(
    locationState.participantId || storedParticipantId || null
  );

  const [needsNamePrompt, setNeedsNamePrompt] = useState(!initialUsername);
  const [promptName, setPromptName] = useState(
    localStorage.getItem("synctune:pref:username") || ""
  );
  const [promptAvatar, setPromptAvatar] = useState(initialAvatar);

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [, setRoomStatus] = useState<RoomStatus>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setIsConnected] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatToast, setChatToast] = useState<ChatMessage | null>(null);
  const [hostPromotedToast, setHostPromotedToast] = useState(false);
  const [isPlaylistFinished, setIsPlaylistFinished] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"queue" | "participants" | "chat">("queue");
  const [replyPrefill, setReplyPrefill] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [cohostRequest, setCohostRequest] = useState<{
    requesterId: string;
    requesterUsername: string;
    requesterAvatar: string;
  } | null>(null);
  const [cohostRequestSent, setCohostRequestSent] = useState(false);
  const [toastReplyActive, setToastReplyActive] = useState(false);
  const [toastReplyText, setToastReplyText] = useState("");
  const [cohostReplyActive, setCohostReplyActive] = useState(false);
  const [cohostReplyText, setCohostReplyText] = useState("");

  // Listen for background quick replies from desktop/Chrome notifications via Service Worker
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_REPLY" && event.data?.content) {
        const socket = getSocket();
        socket.emit("chat:send", { content: event.data.content }, () => {});
      }
    };
    navigator.serviceWorker.addEventListener("message", handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleSwMessage);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>(queue);
  queueRef.current = queue;
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined" || !roomId) return [];
    try {
      const cached = sessionStorage.getItem(`synctune:chat:${roomId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const playbackRevisionRef = useRef(0);
  const hasLeftRef = useRef(false);

  // Cache up to 100 recent messages in sessionStorage so navigating away and returning preserves chat
  useEffect(() => {
    if (roomId && chatMessages.length > 0) {
      try {
        sessionStorage.setItem(`synctune:chat:${roomId}`, JSON.stringify(chatMessages.slice(-100)));
      } catch {}
    }
  }, [roomId, chatMessages]);

  const isHost = Boolean(room && participantId && room.hostId === participantId);
  const currentParticipant = participants.find(
    (p) => p.id === (participantId || sessionStorage.getItem(`synctune:participantId:${roomId}`)) || p.username === username
  );
  const isCohost = Boolean(currentParticipant?.role === "COHOST");
  const canControlPlayback = isHost || isCohost;
  const activeVideoId = room?.currentPlaybackState?.videoId || queue[currentSongIndex]?.videoId || "";
  const currentSong = (activeVideoId ? queue.find((item) => item.videoId === activeVideoId) : null) || queue[currentSongIndex] || null;

  useEffect(() => {
    if (!roomId) return;
    getRoom(roomId)
      .then(({ room: fetchedRoom, chatHistory }) => {
        setRoom(fetchedRoom);
        if (chatHistory && chatHistory.length > 0) {
          setChatMessages((prev) => {
            const map = new Map<string, ChatMessage>();
            for (const m of chatHistory) map.set(m.id, m);
            for (const m of prev) map.set(m.id, m);
            return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
          });
        }
        if (needsNamePrompt) setIsLoading(false);
      })
      .catch((err) => {
        if (needsNamePrompt) {
          setError(err instanceof Error ? err.message : "Failed to load room.");
          setIsLoading(false);
        }
      });
  }, [roomId, needsNamePrompt]);

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

  useEffect(() => {
    if (needsNamePrompt || !username) return;

    let isMounted = true;

    async function initRoom() {
      if (!roomId) {
        setError("Invalid Room ID.");
        setIsLoading(false);
        return;
      }

      try {
        const { room: fetchedRoom, chatHistory } = await getRoom(roomId);
        if (!isMounted) return;

        setRoom(fetchedRoom);
        if (fetchedRoom.participants) {
          setParticipants(fetchedRoom.participants);
        }
        const initialQueue = fetchedRoom.queue || [];
        setQueue(initialQueue);
        queueRef.current = initialQueue;
        playbackRevisionRef.current = fetchedRoom.currentPlaybackState.revision || 0;
        if (fetchedRoom.currentPlaybackState?.videoId && initialQueue.length > 0) {
          const matchIdx = initialQueue.findIndex((item) => item.videoId === fetchedRoom.currentPlaybackState.videoId);
          if (matchIdx !== -1) {
            setCurrentSongIndex(matchIdx);
          }
        }

        if (chatHistory && chatHistory.length > 0) {
          setChatMessages((prev) => {
            const map = new Map<string, ChatMessage>();
            for (const m of chatHistory) map.set(m.id, m);
            for (const m of prev) map.set(m.id, m);
            return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
          });
        }

        const socket = connectSocket();

        socket.on("connect", () => {
          if (!isMounted) return;
          setIsConnected(true);
          console.log("[RoomPage] Connected to socket server:", socket.id);
        });

        socket.on("disconnect", () => {
          if (!isMounted) return;
          setIsConnected(false);
        });

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
            if (res.ok && res.participantId) {
              setParticipantId(res.participantId);
              sessionStorage.setItem(`synctune:participantId:${roomId}`, res.participantId);
              if (res.room) {
                const joinedRoom = res.room;
                setRoom(joinedRoom);
                if (joinedRoom.participants) {
                  setParticipants(joinedRoom.participants);
                }
                const activeId = joinedRoom.currentPlaybackState?.videoId;
                if (joinedRoom.queue) {
                  setQueue(joinedRoom.queue);
                  queueRef.current = joinedRoom.queue;
                  if (activeId) {
                    const matchIdx = joinedRoom.queue.findIndex((item) => item.videoId === activeId);
                    if (matchIdx !== -1) {
                      setCurrentSongIndex(matchIdx);
                    }
                  }
                }
                if (joinedRoom.currentPlaybackState?.revision) {
                  playbackRevisionRef.current = Math.max(playbackRevisionRef.current, joinedRoom.currentPlaybackState.revision);
                }
              }
              if (res.messages && res.messages.length > 0) {
                setChatMessages((prev) => {
                  const map = new Map<string, ChatMessage>();
                  for (const m of res.messages!) map.set(m.id, m);
                  for (const m of prev) map.set(m.id, m);
                  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
                });
              }
              setIsLoading(false);
            } else {
              setError(res.error || "Failed to join room via socket.");
              setIsLoading(false);
            }
          }
        );

        socket.on("playback:state-update", (updatedState: PlaybackState) => {
          if (!isMounted) return;
          playbackRevisionRef.current = Math.max(playbackRevisionRef.current, updatedState.revision || 0);
          setRoom((prev) => (prev ? { ...prev, currentPlaybackState: updatedState } : null));

          if (updatedState.videoId) {
            const matchIdx = queueRef.current.findIndex((item) => item.videoId === updatedState.videoId);
            if (matchIdx !== -1) {
              setCurrentSongIndex(matchIdx);
              setIsPlaylistFinished(false);
            }
          }
        });

        socket.on("playback:queue-ended", (data: { ended: boolean }) => {
          if (!isMounted) return;
          setIsPlaylistFinished(data.ended);
        });

        socket.on("queue:updated", (updatedQueue) => {
          if (!isMounted) return;
          setQueue(updatedQueue);
          queueRef.current = updatedQueue;
          setRoom((prev) => {
            if (prev?.currentPlaybackState?.videoId) {
              const matchIdx = updatedQueue.findIndex((item) => item.videoId === prev.currentPlaybackState.videoId);
              if (matchIdx !== -1) {
                setCurrentSongIndex(matchIdx);
              }
            }
            return prev;
          });
        });

        socket.on("chat:message", (newMsg) => {
          if (!isMounted) return;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.senderUsername !== username) {
            setChatToast(newMsg);
            setToastReplyActive(false);
            setToastReplyText("");

            if (typeof document !== "undefined" && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
              const body = formatChatContent(newMsg.content).slice(0, 100);
              if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then((reg) => {
                  try {
                    const opts: any = {
                      body,
                      icon: "/favicon.svg",
                      data: { roomId, senderUsername: newMsg.senderUsername },
                      actions: [
                        { action: "reply", title: "Reply", type: "text", placeholder: "Type a reply..." },
                      ],
                    };
                    reg.showNotification(`New message from ${newMsg.senderUsername}`, opts);
                  } catch {
                    new Notification(`New message from ${newMsg.senderUsername}`, { body, icon: "/favicon.svg" });
                  }
                });
              } else {
                try {
                  new Notification(`New message from ${newMsg.senderUsername}`, {
                    body,
                    icon: "/favicon.svg",
                  });
                } catch {}
              }
            }
          }
        });

        socket.on("room:cohost-requested", (req) => {
          if (!isMounted) return;
          setRoom((prev) => {
            const currentUserId = participantId || sessionStorage.getItem(`synctune:participantId:${roomId}`);
            if (prev && prev.hostId === currentUserId) {
              setCohostRequest(req);
              setCohostReplyActive(false);
              setCohostReplyText("");
            }
            return prev;
          });
        });

        socket.on("room:participant-joined", (p: Participant) => {
          if (!isMounted) return;
          setParticipants((prev) => {
            if (prev.some((existing) => existing.id === p.id)) {
              return prev.map((item) => (item.id === p.id ? p : item));
            }
            return [...prev, p];
          });
        });

        socket.on("room:participant-left", ({ participantId: leftId }: { participantId: string }) => {
          if (!isMounted) return;
          setParticipants((prev) => prev.filter((p) => p.id !== leftId));
        });

        socket.on("room:participant-updated", (p: Participant) => {
          if (!isMounted) return;
          setParticipants((prev) => prev.map((item) => (item.id === p.id ? p : item)));
          if (p.role === "HOST") {
            setRoom((prev) => (prev ? { ...prev, hostId: p.id } : null));
            const currentId = participantId || sessionStorage.getItem(`synctune:participantId:${roomId}`);
            if (p.id === currentId) {
              setHostPromotedToast(true);
            }
          }
        });

        socket.on("room:status-changed", ({ status }: { status: Room["status"] }) => {
          if (!isMounted) return;
          setRoomStatus(status);
        });

        socket.on("room:closed", ({ reason }: { reason: string }) => {
          if (!isMounted) return;
          hasLeftRef.current = true;
          sessionStorage.removeItem("synctune:active_room");
          sessionStorage.removeItem(`synctune:participantId:${roomId}`);
          sessionStorage.removeItem(`synctune:chat:${roomId}`);
          window.dispatchEvent(new Event("synctune:room_left"));
          alert(reason || "This room has been closed by the host.");
          navigate("/");
        });
      } catch (err: unknown) {
        if (!isMounted) return;
        sessionStorage.removeItem("synctune:active_room");
        window.dispatchEvent(new Event("synctune:room_left"));
        setError(err instanceof Error ? err.message : "Failed to load room.");
        setIsLoading(false);
      }
    }

    initRoom();

    return () => {
      isMounted = false;
      const socket = getSocket();
      socket.off("connect");
      socket.off("disconnect");
      socket.off("playback:state-update");
      socket.off("playback:queue-ended");
      socket.off("queue:updated");
      socket.off("chat:message");
      socket.off("room:participant-joined");
      socket.off("room:participant-left");
      socket.off("room:participant-updated");
      socket.off("room:cohost-requested");
      socket.off("room:status-changed");
      socket.off("room:closed");
    };
  }, [roomId, username, avatar, needsNamePrompt, navigate]);

  const handleChangeVideo = useCallback((videoId: string, _title?: string) => {
    setIsPlaylistFinished(false);
    const matchIdx = queueRef.current.findIndex((item) => item.videoId === videoId);
    if (matchIdx !== -1) {
      setCurrentSongIndex(matchIdx);
    }
    const socket = getSocket();
    socket.emit("playback:queue-ended", { ended: false });
    playbackRevisionRef.current = Math.max(playbackRevisionRef.current, room?.currentPlaybackState?.revision || 0) + 1;
    socket.emit("playback:command", {
      type: "change-video",
      payload: {
        videoId,
        position: 0,
      },
      revision: playbackRevisionRef.current,
    }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) console.error("Failed to change video on server:", res.error);
    });
  }, [room?.currentPlaybackState?.revision]);

  const handleNextTrack = useCallback(() => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;

    // Anchor to the currently playing song in the queue
    const activeVid = room?.currentPlaybackState?.videoId || currentSong?.videoId;
    let baseIdx = currentSongIndex;
    if (activeVid) {
      const matchIdx = currentQueue.findIndex((item) => item.videoId === activeVid);
      if (matchIdx !== -1) {
        baseIdx = matchIdx;
      }
    }

    if (baseIdx < currentQueue.length - 1) {
      const nextIdx = baseIdx + 1;
      setCurrentSongIndex(nextIdx);
      setIsPlaylistFinished(false);
      const nextSong = currentQueue[nextIdx];
      if (nextSong && canControlPlayback) {
        handleChangeVideo(nextSong.videoId, nextSong.title);
      }
    } else {
      setIsPlaylistFinished(true);
      const socket = getSocket();
      socket.emit("playback:queue-ended", { ended: true });
    }
  }, [room?.currentPlaybackState?.videoId, currentSong?.videoId, currentSongIndex, canControlPlayback, handleChangeVideo]);

  const handlePreviousTrack = useCallback(() => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;

    const activeVid = room?.currentPlaybackState?.videoId || currentSong?.videoId;
    let baseIdx = currentSongIndex;
    if (activeVid) {
      const matchIdx = currentQueue.findIndex((item) => item.videoId === activeVid);
      if (matchIdx !== -1) {
        baseIdx = matchIdx;
      }
    }

    if (baseIdx > 0) {
      const prevIdx = baseIdx - 1;
      setCurrentSongIndex(prevIdx);
      setIsPlaylistFinished(false);
      const prevSong = currentQueue[prevIdx];
      if (prevSong && canControlPlayback) {
        handleChangeVideo(prevSong.videoId, prevSong.title);
      }
    }
  }, [room?.currentPlaybackState?.videoId, currentSong?.videoId, currentSongIndex, canControlPlayback, handleChangeVideo]);

  const handleReplayPlaylist = () => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;
    setCurrentSongIndex(0);
    setIsPlaylistFinished(false);
    const socket = getSocket();
    socket.emit("playback:queue-ended", { ended: false });
    const firstSong = currentQueue[0];
    if (firstSong && canControlPlayback) {
      handleChangeVideo(firstSong.videoId, firstSong.title);
    }
  };

  const handlePlayQueuedSong = (song: QueueItem, index: number) => {
    if (!canControlPlayback) return;
    setCurrentSongIndex(index);
    setIsPlaylistFinished(false);
    handleChangeVideo(song.videoId, song.title);
  };

  const handleRequestCohost = () => {
    const socket = getSocket();
    setCohostRequestSent(true);
    socket.emit("room:request-cohost", (res) => {
      if (!res?.ok) {
        setCohostRequestSent(false);
        alert(res?.error || "Failed to request co-host.");
      }
    });
  };

  const handleAddSong = (title: string, videoId: string, duration?: number) => {
    const socket = getSocket();
    socket.emit("queue:add", { videoId, title, duration }, (res) => {
      if (!res.ok) {
        alert(res.error || "Failed to add song to queue.");
      }
    });
  };

  const handleAddSongsBatch = (items: Array<{ videoId: string; title?: string; duration?: number }>) => {
    if (items.length === 0) return;
    const socket = getSocket();
    socket.emit("queue:add-batch", { items }, (res) => {
      if (!res.ok) {
        alert(res.error || "Failed to import playlist.");
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

  const handleReorderQueue = (newQueue: QueueItem[]) => {
    setQueue(newQueue);
    const socket = getSocket();
    socket.emit(
      "queue:reorder",
      { queueItemIds: newQueue.map((item) => item.id) },
      (res) => {
        if (!res.ok) {
          console.error("Failed to reorder queue on server:", res.error);
        }
      }
    );
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
    copyToClipboard(roomId).then((ok) => {
      if (ok) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    });
  };

  const handleConfirmDeleteRoom = () => {
    const socket = getSocket();
    socket.emit("room:close", (res) => {
      if (res.ok) {
        hasLeftRef.current = true;
        sessionStorage.removeItem("synctune:active_room");
        sessionStorage.removeItem(`synctune:participantId:${roomId}`);
        sessionStorage.removeItem(`synctune:chat:${roomId}`);
        window.dispatchEvent(new Event("synctune:room_left"));
        setShowDeleteModal(false);
        navigate("/");
      } else {
        alert(res.error || "Failed to delete room.");
      }
    });
  };

  const handleExplicitLeave = () => {
    const pid = participantId || storedParticipantId || sessionStorage.getItem(`synctune:participantId:${roomId}`) || undefined;
    hasLeftRef.current = true;
    sessionStorage.removeItem("synctune:active_room");
    sessionStorage.removeItem(`synctune:participantId:${roomId}`);
    sessionStorage.removeItem(`synctune:chat:${roomId}`);
    const socket = getSocket();
    socket.emit("room:leave", { roomId, participantId: pid });
    window.dispatchEvent(new Event("synctune:room_left"));
    navigate("/");
  };

  const handleBackToHome = () => {
    if (room && roomId) {
      sessionStorage.setItem(
        "synctune:active_room",
        JSON.stringify({
          roomId,
          roomName: room.name,
          isHost,
          isCohost,
          currentSongTitle: currentSong?.title || "No Track Selected",
          videoId: currentSong?.videoId || room.currentPlaybackState?.videoId || "",
          participantId: participantId || storedParticipantId,
        })
      );
    }
    navigate("/");
  };

  const handleSetRole = (targetParticipantId: string, role: "COHOST" | "LISTENER") => {
    const socket = getSocket();
    socket.emit("room:set-role", { targetParticipantId, role }, (res) => {
      if (!res.ok) {
        alert(res.error || "Failed to update participant role.");
      }
    });
  };

  // Keep active room in sync in sessionStorage so FloatingMiniPlayer seamlessly resumes session
  useEffect(() => {
    if (hasLeftRef.current) return;
    if (room && roomId && (participantId || storedParticipantId)) {
      sessionStorage.setItem(
        "synctune:active_room",
        JSON.stringify({
          roomId,
          roomName: room.name,
          isHost,
          isCohost,
          currentSongTitle: currentSong?.title || "No Track Selected",
          videoId: currentSong?.videoId || room.currentPlaybackState?.videoId || "",
          participantId: participantId || storedParticipantId,
        })
      );
    }
  }, [room, roomId, participantId, storedParticipantId, isHost, isCohost, currentSong]);

  const sidebarParticipants: MockParticipant[] = participants.map((p) => ({
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    role: p.role,
    status: p.isConnected !== false ? "online" : "offline",
    ping: 24,
  }));

  // Direct Link Join Prompt Modal
  if (needsNamePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-surface text-on-surface">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 md:p-8 shadow-[0_20px_48px_-12px_rgba(24,24,27,0.18)] space-y-4 sm:space-y-5 animate-in fade-in my-auto max-h-[calc(100vh-1.5rem)] overflow-y-auto">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant font-semibold">
              Live Listening Room
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {room?.name || "SyncTune Studio"}
            </h2>
            <p className="text-xs text-tertiary leading-relaxed">
              You are tuning in to live synchronized YouTube audio. Enter your display name and choose a desk avatar to join.
            </p>
          </div>

          <form onSubmit={handleJoinPromptSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">Your Display Name</label>
              <input
                type="text"
                required
                maxLength={24}
                autoFocus
                placeholder="Enter your name or handle..."
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                className="w-full text-xs rounded-lg bg-surface border border-outline-variant px-3.5 py-2.5 text-on-surface placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface">Pick a Desk Avatar</label>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {DESK_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setPromptAvatar(av)}
                    className={`text-xl p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      promptAvatar === av
                        ? "bg-[#FFF7ED] border-primary shadow-[0_0_0_1.5px_#EA580C]"
                        : "bg-surface border-outline-variant hover:bg-surface-container"
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
              className="w-full py-2.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-container disabled:opacity-50 text-white shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Join Room & Listen Live</span>
            </button>
          </form>

          <div className="text-center pt-1">
            <Link to="/" className="text-xs text-tertiary hover:text-on-surface transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface text-on-surface space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-tertiary font-mono">Entering studio session...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface text-on-surface text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center text-error">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-on-surface">Room Unavailable</h2>
          <p className="text-xs text-tertiary max-w-sm">{error || "This room does not exist or has been closed."}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="secondary" size="md">
              Go Home
            </Button>
          </Link>
          <Link to="/">
            <Button variant="primary" size="md">
              Browse Rooms
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface antialiased">
      {/* Top Editorial Sub-Bar */}
      <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-[0_1px_8px_rgba(27,27,30,0.04)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Meta Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={handleBackToHome}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-xs hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Return to Home (Keeps audio playing in background)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Back</span>
            </button>

            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-primary flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0">
              J
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-bold text-on-surface truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[220px] md:max-w-none">
                {room.name}
              </h1>

              <button
                onClick={handleCopyRoomCode}
                className="flex items-center gap-1 font-mono text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant shadow-xs hover:bg-surface-container transition-all cursor-pointer shrink-0"
                title="Click to copy room code"
              >
                <span>#{roomId.slice(0, 6).toUpperCase()}</span>
                {copiedCode ? (
                  <Check className="w-3 h-3 text-secondary" />
                ) : (
                  <Copy className="w-3 h-3 text-tertiary" />
                )}
              </button>

              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container-lowest border border-outline-variant shadow-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-mono text-[11px] text-secondary font-medium tracking-tight">
                  ● Live Socket • &lt;38ms drift
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={copiedLink ? <Check className="w-3.5 h-3.5 text-secondary" /> : <LinkIcon className="w-3.5 h-3.5" />}
              onClick={handleCopyInvite}
              className="px-2 sm:px-3 text-xs"
            >
              <span className="hidden sm:inline">{copiedLink ? "Copied! 🎉" : "Copy Invite Link"}</span>
              <span className="sm:hidden">{copiedLink ? "Copied!" : "Share"}</span>
            </Button>

            {isHost ? (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-2 sm:px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-error/10 hover:text-error text-tertiary border border-outline-variant text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Delete this room permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Delete Room</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLeaveModal(true)}
                className="px-2 sm:px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-error/10 hover:text-error text-tertiary border border-outline-variant text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Leave room"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Leave</span>
              </button>
            )}

            {/* Host or Co-Host Badge */}
            <div className="flex items-center gap-1 sm:gap-1.5 pl-1.5 sm:pl-2 py-1 pr-1.5 sm:pr-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-xs text-xs">
              <span className="text-xs sm:text-sm">{avatar}</span>
              <span className="font-semibold text-on-surface hidden sm:inline max-w-[80px] truncate">{username}</span>
              {isHost ? (
                <span className="px-1 sm:px-1.5 py-0.5 rounded bg-primary text-white font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
                  Host
                </span>
              ) : isCohost ? (
                <span className="px-1 sm:px-1.5 py-0.5 rounded bg-amber-600 text-white font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
                  Co-Host
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Workspace Grid (8 cols / 4 cols) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        {/* Host Promotion Banner */}
        {hostPromotedToast && (
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#FFF7ED] border border-primary/40 text-xs text-on-surface animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <Crown className="w-4 h-4 text-primary shrink-0" />
              <span>
                <strong>Host Succession:</strong> The previous host disconnected. You have been promoted to <strong>Room Host</strong> and have control of the queue!
              </span>
            </div>
            <button
              onClick={() => setHostPromotedToast(false)}
              className="px-2.5 py-1 bg-primary text-white rounded text-xs font-medium cursor-pointer"
            >
              Got it
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* LEFT COLUMN: Stage, Scrubber & Telemetry (8 cols) */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            <RoomPlayer
              currentSong={currentSong}
              isHost={canControlPlayback}
              initialPlaybackState={room.currentPlaybackState}
              isPlaylistFinished={isPlaylistFinished}
              onNextTrack={handleNextTrack}
              onPreviousTrack={handlePreviousTrack}
              onChangeVideo={handleChangeVideo}
              onReplayPlaylist={handleReplayPlaylist}
              onOpenAddSong={() => setSidebarTab("queue")}
            />

            {/* Bottom Room Telemetry Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs p-3.5 flex flex-col justify-between">
                <span className="font-mono text-[10px] uppercase text-tertiary font-bold tracking-wider">
                  Room Status
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-xs font-semibold text-secondary">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span>Active (Lockstep v2.1)</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs p-3.5 flex flex-col justify-between">
                <span className="font-mono text-[10px] uppercase text-tertiary font-bold tracking-wider">
                  Host Authority
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-on-surface truncate">
                  <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{isHost ? `${username} (You) • Controls Active` : "Active Room Host"}</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs p-3.5 flex flex-col justify-between">
                <span className="font-mono text-[10px] uppercase text-tertiary font-bold tracking-wider">
                  Network Metrics
                </span>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-secondary font-semibold">
                  <span>{participants.filter((p) => p.isConnected).length} Connected • &lt;38ms drift</span>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Sidebar (4 cols) */}
          <aside className="lg:col-span-4 h-auto lg:h-[680px]">
            <RoomSidebar
              roomId={room.id}
              roomName={room.name}
              isHost={isHost}
              isCohost={isCohost}
              currentUser={{ username, avatar }}
              queue={queue}
              participants={sidebarParticipants}
              chatMessages={chatMessages}
              onAddSong={handleAddSong}
              onAddSongsBatch={handleAddSongsBatch}
              onRemoveSong={handleRemoveSong}
              onReorderQueue={handleReorderQueue}
              onSendMessage={handleSendMessage}
              onPlaySong={handlePlayQueuedSong}
              onSetRole={handleSetRole}
              onRequestCohost={handleRequestCohost}
              cohostRequestSent={cohostRequestSent}
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              replyPrefill={replyPrefill}
              onClearReplyPrefill={() => setReplyPrefill("")}
              currentSongIndex={currentSongIndex}
              currentSong={currentSong}
            />
          </aside>
        </div>
      </main>

      {/* Floating Chat Notification Toast with Inline Quick Reply */}
      {chatToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-80 rounded-xl bg-surface-container-lowest border border-outline-variant p-3.5 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="text-2xl shrink-0">{chatToast.senderAvatar || "💬"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-on-surface truncate">
                {chatToast.senderUsername}
              </span>
              <button
                onClick={() => setChatToast(null)}
                className="text-tertiary hover:text-on-surface text-xs cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-tertiary truncate mt-0.5">
              {formatChatContent(chatToast.content)}
            </p>

            {toastReplyActive ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = toastReplyText.trim();
                  if (!clean) return;
                  const socket = getSocket();
                  socket.emit("chat:send", { content: `@${chatToast.senderUsername} ${clean}` }, () => {});
                  setChatToast(null);
                  setToastReplyActive(false);
                  setToastReplyText("");
                }}
                className="mt-2.5 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  autoFocus
                  placeholder={`Reply to @${chatToast.senderUsername}...`}
                  value={toastReplyText}
                  onChange={(e) => setToastReplyText(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-surface-container rounded border border-outline-variant focus:outline-none focus:border-primary text-on-surface"
                />
                <button
                  type="submit"
                  disabled={!toastReplyText.trim()}
                  className="px-2.5 py-1 text-xs font-semibold bg-primary hover:bg-primary-container disabled:opacity-40 text-white rounded transition-colors cursor-pointer"
                >
                  Send
                </button>
              </form>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => setToastReplyActive(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-primary hover:bg-primary-container text-white rounded shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3 h-3" />
                  Reply
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Co-Host Request Notification Toast (Host only) */}
      {cohostRequest && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm w-80 rounded-xl bg-surface-container-lowest border border-outline-variant p-3.5 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="text-2xl shrink-0">{cohostRequest.requesterAvatar || "🎧"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-on-surface truncate">
                Co-Host Request
              </span>
              <button
                onClick={() => setCohostRequest(null)}
                className="text-tertiary hover:text-on-surface text-xs cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-on-surface mt-0.5">
              <strong className="text-primary font-semibold">@{cohostRequest.requesterUsername}</strong> requested to become a Co-Host.
            </p>

            {cohostReplyActive ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = cohostReplyText.trim();
                  if (!clean) return;
                  const socket = getSocket();
                  socket.emit("chat:send", { content: `@${cohostRequest.requesterUsername} ${clean}` }, () => {});
                  setCohostReplyActive(false);
                  setCohostReplyText("");
                  setCohostRequest(null);
                }}
                className="mt-2.5 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  autoFocus
                  placeholder={`Reply to @${cohostRequest.requesterUsername}...`}
                  value={cohostReplyText}
                  onChange={(e) => setCohostReplyText(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-surface-container rounded border border-outline-variant focus:outline-none focus:border-primary text-on-surface"
                />
                <button
                  type="submit"
                  disabled={!cohostReplyText.trim()}
                  className="px-2.5 py-1 text-xs font-semibold bg-primary hover:bg-primary-container disabled:opacity-40 text-white rounded transition-colors cursor-pointer"
                >
                  Send
                </button>
              </form>
            ) : (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSetRole(cohostRequest.requesterId, "COHOST");
                    setCohostRequest(null);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-primary hover:bg-primary-container text-white rounded shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Crown className="w-3 h-3" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setCohostReplyActive(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setCohostRequest(null)}
                  className="px-2 py-1 text-[11px] font-semibold text-tertiary hover:text-error transition-colors cursor-pointer"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Host Delete Room Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-outline-variant p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center text-error">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-on-surface">Delete this Room?</h3>
              <p className="text-xs text-tertiary leading-relaxed">
                This will permanently close &quot;{room.name}&quot; for all connected participants.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-surface border border-outline-variant text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoom}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-error hover:bg-error/90 text-white shadow-xs transition-colors cursor-pointer"
              >
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Listener Leave Room Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181b]/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-outline-variant p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center text-error">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-on-surface">Leave this Room?</h3>
              <p className="text-xs text-tertiary leading-relaxed">
                Are you sure you want to leave &quot;{room.name}&quot;? You will disconnect from the live listening session.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-surface border border-outline-variant text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  handleExplicitLeave();
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-error hover:bg-error/90 text-white shadow-xs transition-colors cursor-pointer"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
