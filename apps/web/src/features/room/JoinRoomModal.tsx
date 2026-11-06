import React, { useState } from "react";
import { useNavigate } from "react-router";
import { LogIn, KeyRound, User } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { joinRoom } from "../../services/api";

export interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomId?: string;
}

const AVATAR_PRESETS = [
  "🎧", "🎵", "🎸", "🎹", "🎷", "🎺", "🥁", "🎤", "👾", "✨"
];

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  initialRoomId = "",
}) => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(initialRoomId);
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[1] || "🎵");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = roomId.trim();
    if (!cleanId) {
      setError("Please enter a valid room ID or paste an invite link.");
      return;
    }
    if (!username.trim()) {
      setError("Please enter your display name.");
      return;
    }

    setIsLoading(true);
    setError(null);

    let parsedRoomId = cleanId;
    if (cleanId.includes("/room/")) {
      const parts = cleanId.split("/room/");
      parsedRoomId = parts[1]?.split("?")[0]?.split("/")[0] || cleanId;
    }

    try {
      const response = await joinRoom(parsedRoomId, {
        username: username.trim(),
        avatar: selectedAvatar,
      });

      // Save credentials for session recovery
      sessionStorage.setItem(`synctune:participantId:${response.room.id}`, response.participantId);
      sessionStorage.setItem(`synctune:username:${response.room.id}`, username.trim());
      sessionStorage.setItem(`synctune:avatar:${response.room.id}`, selectedAvatar);

      onClose();
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Listening Room"
      description="Enter the Room ID or invite link and your display name to start listening."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Room ID or Invitation Link"
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
          placeholder="e.g. Jordan"
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

        <div className="pt-3 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Join Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};
