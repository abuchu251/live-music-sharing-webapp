import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { KeyRound, User, ArrowLeft, LogIn, Radio, Users } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { joinRoom, listActiveRooms } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { Room } from "@synctune/shared-types";

const AVATAR_PRESETS = ["🎧", "🎵", "🎸", "🎹", "🎷", "🎺", "🥁", "🎤", "👾", "✨"];

export const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState(user?.username || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATAR_PRESETS[1] || "🎵");
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
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 space-y-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-purple-600/30">
            <Radio className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Join a Listening Room
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Paste a room code or invite URL to sync playback with the host in real time.
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6 sm:p-8 max-w-lg mx-auto bg-zinc-900/80 border-zinc-800 shadow-2xl space-y-6">
          <form onSubmit={handleJoin} className="space-y-5">
            {error && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
                {error}
              </div>
            )}

            <Input
              label="Room Code or Full URL"
              placeholder="e.g. room-alpha-9 or https://..."
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
              placeholder="e.g. Alex"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            {/* Avatar Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Choose Your Listener Avatar
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_PRESETS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedAvatar(icon)}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                      selectedAvatar === icon
                        ? "bg-purple-600/30 border-purple-500 text-white shadow-md shadow-purple-600/20 scale-105"
                        : "bg-zinc-800/60 border-zinc-700/60 hover:border-zinc-500 text-zinc-300"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
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
              Enter Room & Sync
            </Button>
          </form>
        </Card>

        {/* Active Public Rooms */}
        {activeRooms.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Active Listening Rooms ({activeRooms.length})
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
                  className="p-4 bg-zinc-900/40 border-zinc-800/80 space-y-2.5"
                  onClick={() => handleJoinPublic(room.id)}
                >
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="text-purple-400 font-medium">Room</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Users className="w-3 h-3" /> {room.participants.length}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">
                    {room.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    ID: {room.id}
                  </p>
                  <div className="pt-2 text-xs text-purple-400 font-medium">
                    Join Room &rarr;
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
