import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Music, User, Globe, Lock } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { createRoom } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  "🎧", "🎵", "🎸", "🎹", "🎷", "🎺", "🥁", "🎤", "👾", "✨"
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [username, setUsername] = useState(user?.username || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATAR_PRESETS[0] || "🎧");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with auth user changes
  React.useEffect(() => {
    if (user?.username && !username) {
      setUsername(user.username);
    }
    if (user?.avatar) {
      setSelectedAvatar(user.avatar);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError("Please enter a room name.");
      return;
    }
    if (!username.trim()) {
      setError("Please enter your display name.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await createRoom({
        roomName: roomName.trim(),
        username: username.trim(),
        avatar: selectedAvatar,
      });

      // Save credentials for host session recovery across tabs & reloads
      localStorage.setItem(`synctune:participantId:${response.room.id}`, response.participantId);
      sessionStorage.setItem(`synctune:participantId:${response.room.id}`, response.participantId);
      localStorage.setItem(`synctune:username:${response.room.id}`, username.trim());
      sessionStorage.setItem(`synctune:username:${response.room.id}`, username.trim());
      localStorage.setItem(`synctune:avatar:${response.room.id}`, selectedAvatar);
      sessionStorage.setItem(`synctune:avatar:${response.room.id}`, selectedAvatar);

      onClose();
      navigate(`/room/${response.room.id}`, {
        state: {
          roomName: response.room.name,
          username: username.trim(),
          avatar: selectedAvatar,
          isHost: true,
          participantId: response.participantId,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Listening Room"
      description="You will be the host with playback controls. Invite anyone with your room link."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Room Name"
          placeholder="e.g. Late Night Lo-Fi Beats"
          value={roomName}
          onChange={(e) => {
            setRoomName(e.target.value);
            setError(null);
          }}
          leftIcon={<Music className="w-4 h-4" />}
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

        {/* Avatar Preset Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300">
            Choose Your Avatar
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

        {/* Room Privacy Option */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-medium text-zinc-300">
            Room Privacy
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                !isPrivate
                  ? "bg-purple-500/10 border-purple-500/50 text-white"
                  : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <Globe className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-zinc-200">Public</div>
                <div className="text-[11px] text-zinc-400">Listed in demo rooms</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                isPrivate
                  ? "bg-purple-500/10 border-purple-500/50 text-white"
                  : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <Lock className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-zinc-200">Unlisted</div>
                <div className="text-[11px] text-zinc-400">Invite link only</div>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Create & Enter Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};
