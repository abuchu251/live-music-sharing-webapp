import React, { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  Plus,
  Send,
  Trash2,
  Crown,
  Play,
  GripVertical,
  Search,
  Loader2,
  X,
} from "lucide-react";
import { extractYouTubeVideoId } from "../../utils/youtube";
import { copyToClipboard } from "../../utils/clipboard";
import { searchYouTube, type YouTubeSearchResult } from "../../services/api";
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

const EMOJI_REACTIONS = ["🔥", "☕", "🎧", "🙌", "💃"];

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [newSongInput, setNewSongInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (replyPrefill) {
      setChatInput(replyPrefill);
      if (onClearReplyPrefill) onClearReplyPrefill();
    }
  }, [replyPrefill, onClearReplyPrefill]);

  useEffect(() => {
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

  const handleAddSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = newSongInput.trim();
    if (!rawInput) return;

    const extracted = extractYouTubeVideoId(rawInput);
    if (extracted) {
      onAddSong(`YouTube Track (${extracted})`, extracted);
      setNewSongInput("");
      setShowAddForm(false);
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    // Execute live YouTube Search
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchYouTube(rawInput);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError("No YouTube videos found matching your search.");
      }
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Failed to search YouTube.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput("");
  };

  const handleEmojiClick = (emoji: string) => {
    onSendMessage(emoji);
  };

  const formatSeconds = (secs: number) => {
    if (!secs) return "03:30";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full h-full bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs p-4 flex flex-col gap-3">
      {/* Sidebar Header */}
      <div className="flex flex-col gap-0.5 pb-2 bg-surface-container-low p-3 rounded-lg border border-outline-variant/60">
        <span className="font-mono text-[10px] uppercase tracking-wider text-tertiary font-bold">
          LISTENING ROOM
        </span>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-on-surface truncate pr-2">
            {roomName}
          </h3>
          <button
            onClick={handleCopyRoomCode}
            className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold transition-all cursor-pointer border border-outline-variant/60"
            title="Click to copy room code"
            type="button"
          >
            <span>#{roomId.slice(0, 6).toUpperCase()}</span>
            {copiedCode ? (
              <Check className="w-3 h-3 text-secondary" />
            ) : (
              <Copy className="w-3 h-3 text-tertiary" />
            )}
          </button>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="grid grid-cols-3 p-1 rounded-lg bg-surface-container gap-1 text-xs text-center font-medium">
        <button
          onClick={() => setActiveTab("queue")}
          className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "queue"
              ? "bg-surface-container-lowest font-semibold text-on-surface shadow-xs"
              : "text-tertiary hover:text-on-surface hover:bg-surface-container-high"
          }`}
          type="button"
        >
          <span>Queue</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="font-mono text-[11px] text-tertiary">{queue.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("participants")}
          className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === "participants"
              ? "bg-surface-container-lowest font-semibold text-on-surface shadow-xs"
              : "text-tertiary hover:text-on-surface hover:bg-surface-container-high"
          }`}
          type="button"
        >
          <span>People</span>
          <span className="font-mono text-[11px]">{participants.filter((p) => p.status !== "offline").length}</span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === "chat"
              ? "bg-surface-container-lowest font-semibold text-on-surface shadow-xs"
              : "text-tertiary hover:text-on-surface hover:bg-surface-container-high"
          }`}
          type="button"
        >
          <span>Chat</span>
          <span className="font-mono text-[11px]">{chatMessages.length}</span>
        </button>
      </div>

      {/* TAB CONTENT: QUEUE */}
      {activeTab === "queue" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/60">
            <span className="font-mono text-[11px] uppercase tracking-wider text-tertiary font-bold">
              Upcoming Tracks ({queue.length})
            </span>
            <button
              onClick={() => setShowAddForm((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer"
              type="button"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>Add Song</span>
            </button>
          </div>

          {/* Add Song Form Drawer */}
          {showAddForm && (
            <div className="mb-2 p-3 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-2.5 animate-in fade-in">
              <form onSubmit={handleAddSongSubmit} className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search YouTube songs or paste a link..."
                    value={newSongInput}
                    onChange={(e) => {
                      setNewSongInput(e.target.value);
                      if (searchError) setSearchError(null);
                    }}
                    className="w-full text-xs pl-8 pr-2.5 py-2 rounded bg-surface-container-lowest border border-outline-variant text-on-surface placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                    autoFocus
                  />
                  <Search className="w-3.5 h-3.5 text-tertiary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {newSongInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewSongInput("");
                        setSearchResults([]);
                        setSearchError(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-on-surface p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !newSongInput.trim()}
                  className="px-3 py-2 text-xs font-semibold bg-primary hover:bg-primary-container disabled:opacity-50 text-white rounded cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  {isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : extractYouTubeVideoId(newSongInput.trim()) ? (
                    "Import"
                  ) : (
                    "Search"
                  )}
                </button>
              </form>

              {/* Direct Link Hint */}
              {extractYouTubeVideoId(newSongInput.trim()) && (
                <div className="flex items-center gap-1.5 text-[11px] text-secondary font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span>Direct YouTube link detected — ready to import immediately!</span>
                </div>
              )}

              {/* Error Message */}
              {searchError && (
                <div className="p-2 rounded bg-error/10 border border-error/20 text-error text-[11px]">
                  {searchError}
                </div>
              )}

              {/* Live Search Results List */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5 pt-1 border-t border-outline-variant">
                  <span className="font-mono text-[10px] uppercase text-tertiary font-bold tracking-wider block">
                    YouTube Results ({searchResults.length})
                  </span>
                  {searchResults.map((item) => (
                    <div
                      key={item.videoId}
                      className="p-1.5 rounded-md bg-surface-container-lowest border border-outline-variant hover:border-primary/40 flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-12 h-9 object-cover rounded shrink-0 bg-surface-container"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface truncate">
                            {item.title}
                          </p>
                          <p className="font-mono text-[10px] text-tertiary truncate">
                            {item.channelTitle}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onAddSong(item.title, item.videoId);
                          setSearchResults((prev) => prev.filter((r) => r.videoId !== item.videoId));
                        }}
                        className="px-2 py-1 text-[11px] font-semibold bg-primary hover:bg-primary-container text-white rounded shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[10px] text-tertiary font-mono">
                <span>Free YouTube Data API v3</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSearchResults([]);
                    setSearchError(null);
                  }}
                  className="hover:text-on-surface cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Queue Items Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {queue.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-lg bg-surface-container-low border border-dashed border-outline-variant text-tertiary">
                <p className="text-xs font-medium text-on-surface mb-1">Queue is empty</p>
                <p className="text-[11px] text-tertiary max-w-[200px]">
                  Add music videos from YouTube so the room has upcoming tracks.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 text-xs font-semibold text-primary hover:underline"
                  type="button"
                >
                  + Add First Song
                </button>
              </div>
            ) : (
              queue.map((song, index) => {
                const isFirstPlaying = index === 0;
                return (
                  <div
                    key={song.id}
                    draggable={isHost}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2.5 group ${
                      isFirstPlaying
                        ? "bg-[#FFF7ED] border-primary/50 shadow-xs"
                        : draggedIndex === index
                        ? "opacity-40 scale-[0.98] border-primary bg-primary/10"
                        : dragOverIndex === index
                        ? "border-primary bg-primary/20 shadow-md"
                        : "bg-surface-container-low hover:bg-surface-container border-outline-variant/60"
                    }`}
                  >
                    {isFirstPlaying && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l" />
                    )}

                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Drag Handle to the left of numbering */}
                      <div
                        className={`p-0.5 text-tertiary group-hover:text-on-surface transition-colors ${
                          isHost ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-40"
                        }`}
                        title={isHost ? "Drag to reorder track" : "Only host can reorder"}
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      <span className="w-4 text-center text-xs font-mono font-semibold text-tertiary shrink-0">
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isFirstPlaying ? "text-primary" : "text-on-surface"}`}>
                          {song.title}
                        </p>
                        <p className="font-mono text-[10px] text-tertiary truncate">
                          Added by @{song.addedBy?.username || "Listener"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs text-tertiary">
                        {formatSeconds(song.duration || 210)}
                      </span>

                      {isHost && onPlaySong && (
                        <button
                          onClick={() => onPlaySong(song, index)}
                          className="p-1 text-tertiary hover:text-primary transition-colors cursor-pointer"
                          title="Play this song now"
                          type="button"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}

                      <button
                        onClick={() => onRemoveSong(song.id)}
                        className="p-1 text-tertiary hover:text-error transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Remove song"
                        type="button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PARTICIPANTS */}
      {activeTab === "participants" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/60">
            <span className="font-mono text-[11px] uppercase tracking-wider text-tertiary font-bold">
              Connected Coworkers ({participants.filter((p) => p.status !== "offline").length})
            </span>
            <span className="font-mono text-[11px] text-secondary font-semibold">
              All Synced
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {participants.map((person) => (
              <div
                key={person.id}
                className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-sm shrink-0">
                    {person.avatar || "🎧"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate flex items-center gap-1.5">
                      <span>{person.username}</span>
                      {person.role === "HOST" && (
                        <Crown className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </p>
                    <p className="font-mono text-[10px] text-tertiary">
                      {person.role === "HOST" ? "Studio Host" : "Listener"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span className="font-mono text-[11px] text-secondary font-semibold">
                    {person.ping ? `${person.ping}ms` : "24ms"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CHAT */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Quick Reaction Strip */}
          <div className="flex items-center justify-between gap-1 pb-2 mb-2 border-b border-outline-variant/60">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="flex-1 py-1 rounded bg-surface-container hover:bg-surface-container-high hover:scale-105 active:scale-95 text-sm transition-all cursor-pointer"
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {chatMessages.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-tertiary text-xs">
                <p>No messages yet.</p>
                <p className="text-[11px]">Send a note or react with an emoji!</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderUsername === currentUser.username;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col text-xs ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 text-tertiary text-[11px]">
                      <span>{msg.senderAvatar || "💬"}</span>
                      <span className="font-semibold text-on-surface">{msg.senderUsername}</span>
                      <span className="font-mono text-[10px]">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-lg max-w-[85%] break-words ${
                        isMe
                          ? "bg-primary text-white"
                          : "bg-surface-container border border-outline-variant/60 text-on-surface"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleChatSubmit} className="pt-2 flex items-center gap-1.5 border-t border-outline-variant/60">
            <input
              type="text"
              placeholder="Send message or drop YouTube link..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-surface border border-outline-variant text-on-surface placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
