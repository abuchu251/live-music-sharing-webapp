import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { KeyRound, User, ArrowLeft, LogIn, Radio, Users, Check } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { joinRoom, listActiveRooms } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Room } from "@synctune/shared-types";

const DESK_AVATARS = [
  { emoji: "⚡", label: "Bolt" },
  { emoji: "🎧", label: "Studio" },
  { emoji: "☕", label: "Coffee" },
  { emoji: "🪴", label: "Plant" },
  { emoji: "💡", label: "Idea" },
  { emoji: "🎹", label: "Keys" },
  { emoji: "📻", label: "Radio" },
  { emoji: "🎙️", label: "Mic" },
  { emoji: "✨", label: "Sparkle" },
  { emoji: "🐈", label: "Desk Cat" },
];

export const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState(user?.username || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || DESK_AVATARS[1]?.emoji || "🎧");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (user?.username && !username) {
      setUsername(user.username);
    }
    if (user?.avatar) {
      setSelectedAvatar(user.avatar);
    }
  }, [user]);

  useEffect(() => {
    listActiveRooms()
      .then((res) => setActiveRooms(res.rooms))
      .catch((err) => console.error("Failed to load active rooms:", err));
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = roomId.trim();
    if (!cleanId) {
      setError("Please enter a valid room ID or invitation link.");
      return;
    }
    if (!username.trim()) {
      setError("Please enter your display name.");
      return;
    }

    setIsLoading(true);
    setError(null);

    let targetRoomId = cleanId;
    if (cleanId.includes("/room/")) {
      const parts = cleanId.split("/room/");
      targetRoomId = parts[1]?.split("?")[0]?.split("/")[0] || cleanId;
    }

    try {
      const response = await joinRoom(targetRoomId, {
        username: username.trim(),
        avatar: selectedAvatar,
      });

      sessionStorage.setItem(`synctune:participantId:${response.room.id}`, response.participantId);
      sessionStorage.setItem(`synctune:username:${response.room.id}`, username.trim());
      sessionStorage.setItem(`synctune:avatar:${response.room.id}`, selectedAvatar);
      localStorage.setItem("synctune:pref:username", username.trim());
      localStorage.setItem("synctune:pref:avatar", selectedAvatar);

      navigate(`/room/${response.room.id}`, {
        state: {
          roomName: response.room.name,
          username: username.trim(),
          avatar: selectedAvatar,
          isHost: false,
          participantId: response.participantId,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinPublic = async (pubRoomId: string) => {
    const finalUsername = username.trim() || `Listener-${Math.floor(Math.random() * 900 + 100)}`;
    try {
      const response = await joinRoom(pubRoomId, {
        username: finalUsername,
        avatar: selectedAvatar,
      });

      sessionStorage.setItem(`synctune:participantId:${response.room.id}`, response.participantId);
      sessionStorage.setItem(`synctune:username:${response.room.id}`, finalUsername);
      sessionStorage.setItem(`synctune:avatar:${response.room.id}`, selectedAvatar);
      localStorage.setItem("synctune:pref:username", finalUsername);
      localStorage.setItem("synctune:pref:avatar", selectedAvatar);

      navigate(`/room/${response.room.id}`, {
        state: {
          roomName: response.room.name,
          username: finalUsername,
          avatar: selectedAvatar,
          isHost: false,
          participantId: response.participantId,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-xs">
            <Radio className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-sans">
            Join a Listening Room
          </h1>
          <p className="text-xs sm:text-sm text-tertiary max-w-md mx-auto">
            Paste a room code or invite URL to synchronize playback with the host down to the millisecond.
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-5 sm:p-8 max-w-lg mx-auto bg-surface-container-lowest border-outline-variant shadow-sm space-y-6 rounded-2xl">
          <form onSubmit={handleJoin} className="space-y-5">
            {error && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            <Input
              label="Room Code or Full URL"
              placeholder="e.g. tokyo-lofi-204 or https://jemaw.live/room/..."
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setError(null);
              }}
              leftIcon={<KeyRound className="w-4 h-4" />}
              autoFocus
              required
            />

            <Input
              label="Your Display Name"
              placeholder="e.g. Alex (Design Lead)"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            {/* Avatar Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Select Your Desk Avatar
              </label>
              <div className="grid grid-cols-5 gap-2">
                {DESK_AVATARS.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.emoji;
                  return (
                    <button
                      key={avatar.label}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.emoji)}
                      title={avatar.label}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl border text-xl transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-xs"
                          : "border-outline bg-white hover:border-outline-strong text-on-surface"
                      }`}
                    >
                      <span>{avatar.emoji}</span>
                      <span className="text-[9px] mt-0.5 text-on-surface-variant truncate max-w-full px-1">
                        {avatar.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-primary text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Enter Room & Sync Audio
            </Button>
          </form>
        </Card>

        {/* Active Public Rooms */}
        {activeRooms.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-outline">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider font-mono">
                Active Studio Sessions ({activeRooms.length})
              </h3>
              <Badge variant="emerald" size="sm" dot>
                Live Now
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {activeRooms.map((room) => (
                <Card
                  key={room.id}
                  variant="interactive"
                  className="p-4 bg-white border-outline hover:border-primary/40 space-y-2.5 rounded-xl shadow-xs transition-all"
                  onClick={() => handleJoinPublic(room.id)}
                >
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <span className="text-primary font-medium font-mono text-[11px]">Active Session</span>
                    <span className="flex items-center gap-1 text-secondary font-mono text-[11px]">
                      <Users className="w-3 h-3" /> {room.participants.length}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-on-surface truncate font-sans">
                    {room.name}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant font-mono">
                    ID: {room.id}
                  </p>
                  <div className="pt-2 text-xs text-primary font-semibold flex items-center gap-1">
                    Connect & Listen &rarr;
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
