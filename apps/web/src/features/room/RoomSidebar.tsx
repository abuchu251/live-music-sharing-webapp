import React, { useState } from "react";
import {
  ListMusic,
  Users,
  MessageSquare,
  Copy,
  Check,
  Plus,
  Send,
  Trash2,
  Crown,
  Share2,
  Play,
  GripVertical,
} from "lucide-react";
import { extractYouTubeVideoId } from "../../utils/youtube";
import { copyToClipboard } from "../../utils/clipboard";
import { Badge } from "../../components/ui/Badge";
import type { QueueItem, ChatMessage } from "@synctune/shared-types";
import type { MockParticipant } from "./mockData";

export interface RoomSidebarProps {
  roomId: string;
  roomName: string;
  isHost: boolean;
  currentUser: { username: string; avatar: string };
  queue: QueueItem[];
  participants: MockParticipant[];
  chatMessages: ChatMessage[];
  onAddSong: (title: string, videoId: string) => void;
  onRemoveSong: (songId: string) => void;
  onSendMessage: (content: string) => void;
  onPlaySong?: (song: QueueItem, index: number) => void;
  onReorderQueue?: (newQueue: QueueItem[]) => void;
  activeTab?: "queue" | "participants" | "chat";
  onTabChange?: (tab: "queue" | "participants" | "chat") => void;
  replyPrefill?: string;
  onClearReplyPrefill?: () => void;
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({
  roomId,
  roomName,
  isHost,
  currentUser,
  queue,
  participants,
  chatMessages,
  onAddSong,
  onRemoveSong,
  onSendMessage,
  onPlaySong,
  onReorderQueue,
  activeTab: activeTabProp,
  onTabChange,
  replyPrefill,
  onClearReplyPrefill,
}) => {
  const [internalTab, setInternalTab] = useState<"queue" | "participants" | "chat">("queue");
  const activeTab = activeTabProp || internalTab;
  const setActiveTab = (tab: "queue" | "participants" | "chat") => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...queue];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    if (movedItem) {
      reordered.splice(targetIndex, 0, movedItem);
      if (onReorderQueue) {
        onReorderQueue(reordered);
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const [newSongInput, setNewSongInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (replyPrefill) {
      setChatInput(replyPrefill);
      if (onClearReplyPrefill) onClearReplyPrefill();
    }
  }, [replyPrefill, onClearReplyPrefill]);

  React.useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  const handleCopyRoomCode = () => {
    copyToClipboard(roomId).then((ok) => {
      if (ok) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    });
  };

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/room/${roomId}` : roomId;
    copyToClipboard(url).then((ok) => {
      if (ok) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    });
  };

  const handleAddSongSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = newSongInput.trim();
    if (!rawInput) return;

    const extractedId = extractYouTubeVideoId(rawInput);
    const videoId = extractedId || "jfKfPfyJRdk";
    const title = extractedId ? `YouTube Track (${extractedId})` : rawInput;

    onAddSong(title, videoId);
    setNewSongInput("");
    setShowAddForm(false);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput("");
  };

  return (
    <div className="w-full h-full flex flex-col rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Room Header Info */}
      <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-950/40">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
              Listening Room
            </span>
            <h3 className="text-base font-bold text-white truncate">
              {roomName}
            </h3>
          </div>

          <button
            onClick={handleCopyRoomCode}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono border flex items-center gap-1.5 transition-all cursor-pointer ${
              copiedCode
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold"
                : "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700/80 text-zinc-300 hover:text-white"
            }`}
            title="Click to copy Room Code"
          >
            {copiedCode ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied! 🎉</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-zinc-400" />
                <span className="max-w-[120px] truncate">Click to copy</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab("queue")}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "queue"
                ? "bg-purple-600 text-white shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Queue ({queue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("participants")}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "participants"
                ? "bg-purple-600 text-white shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People ({participants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "chat"
                ? "bg-purple-600 text-white shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Queue Content */}
      {activeTab === "queue" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Upcoming Tracks
            </span>
            <button
              onClick={() => setShowAddForm((prev) => !prev)}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? "Cancel" : "Add Song"}</span>
            </button>
          </div>

          {/* Add Song Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddSongSubmit}
              className="p-3 rounded-2xl bg-zinc-950 border border-purple-500/30 space-y-2.5 animate-in fade-in"
            >
              <input
                type="text"
                placeholder="Paste YouTube URL or song name..."
                value={newSongInput}
                onChange={(e) => setNewSongInput(e.target.value)}
                className="w-full text-xs rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Queue Song
                </button>
              </div>
            </form>
          )}

          {/* Queue Items */}
          <div className="space-y-2">
            {queue.map((song, index) => (
              <div
                key={song.id}
                draggable={isHost}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all ${
                  draggedIndex === index
                    ? "opacity-40 scale-[0.98] border-purple-500 bg-purple-500/10"
                    : dragOverIndex === index
                    ? "border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/20"
                    : "bg-zinc-950/60 hover:bg-zinc-800/60 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                {/* Drag handle to the left of the numbering */}
                <div
                  className={`p-1 -ml-1 text-zinc-600 group-hover:text-zinc-300 transition-colors ${
                    isHost ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-40"
                  }`}
                  title={isHost ? "Drag to reorder track in queue" : "Only host can reorder queue"}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                <span className="w-5 text-center text-xs font-mono text-zinc-400 font-semibold select-none">
                  {index + 1}
                </span>

                <img
                  src={song.thumbnailUrl}
                  alt={song.title}
                  className="w-11 h-11 rounded-xl object-cover shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-purple-300 transition-colors">
                    {song.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="truncate">{song.artist}</span>
                    <span>•</span>
                    <span>{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}</span>
                  </div>
                </div>

                {(isHost || song.addedBy?.username === currentUser.username) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isHost && onPlaySong && (
                      <button
                        onClick={() => onPlaySong(song, index)}
                        className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer"
                        title="Play this track now"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveSong(song.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {queue.length === 0 && (
              <div className="py-8 text-center text-zinc-500 text-xs">
                Queue is empty. Click "+ Add Song" to queue the next track!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Participants Content */}
      {activeTab === "participants" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Connected Listeners ({participants.length})
            </span>
            <Badge variant="emerald" size="sm" dot>
              Live Sync
            </Badge>
          </div>

          <div className="space-y-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80"
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">{p.avatar}</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-zinc-100">
                        {p.username}
                      </span>
                      {p.username === currentUser.username && (
                        <span className="text-[10px] text-purple-400 font-mono">(you)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          p.status === "online"
                            ? "bg-emerald-400"
                            : p.status === "buffering"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-zinc-500"
                        }`}
                      />
                      <span>{p.status}</span>
                      <span>•</span>
                      <span className="font-mono text-zinc-500">{p.ping}ms</span>
                    </div>
                  </div>
                </div>

                {p.role === "HOST" ? (
                  <Badge variant="amber" size="sm">
                    <Crown className="w-3 h-3 mr-1 inline text-amber-400" />
                    Host
                  </Badge>
                ) : (
                  <Badge variant="zinc" size="sm">
                    Listener
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Quick Invite Box */}
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center space-y-2">
            <Share2 className="w-5 h-5 text-purple-400 mx-auto" />
            <h5 className="text-xs font-semibold text-purple-200">
              Invite friends to this room
            </h5>
            <p className="text-[11px] text-purple-300/80">
              Anyone with this link can watch and listen in exact synchronization.
            </p>
            <button
              onClick={handleCopyLink}
              title="Click to copy room link"
              className="w-full py-1.5 text-xs font-medium rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied! 🎉</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Click to copy link</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Chat Content */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => {
              const formattedTime =
                typeof msg.timestamp === "number"
                  ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : msg.timestamp;

              return (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{msg.senderAvatar}</span>
                    <span className="text-xs font-semibold text-zinc-200">
                      {msg.senderUsername}
                    </span>
                    {msg.isHost && (
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-medium">
                        Host
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {formattedTime}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChatInput(`@${msg.senderUsername} `)}
                      className="text-[10px] text-zinc-500 hover:text-purple-400 cursor-pointer ml-auto transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                  <p
                    className="text-xs text-zinc-300 pl-6 leading-relaxed bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/50 break-words"
                    dangerouslySetInnerHTML={{ __html: msg.content }}
                  />
                </div>
              );
            })}

            {chatMessages.length === 0 && (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No chat messages yet. Say hello to everyone! 👋
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Reactions Bar */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-zinc-800/80 bg-zinc-950/70 overflow-x-auto">
            <span className="text-[10px] text-zinc-500 font-medium">React:</span>
            {["🔥", "❤️", "🎵", "👏", "⚡", "🚀", "🎉"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSendMessage(emoji)}
                className="text-xs px-1.5 py-0.5 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer active:scale-125"
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendChat}
            className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Send a message to the room..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              maxLength={200}
              className="flex-1 text-xs rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white transition-all cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
