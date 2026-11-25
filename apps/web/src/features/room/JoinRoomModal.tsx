import React, { useState } from "react";
import { useNavigate } from "react-router";
import { LogIn, KeyRound, User, Check } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { joinRoom } from "../../services/api";

export interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoomId?: string;
}

const DESK_AVATARS = [
  { id: "headphones", icon: "🎧" },
  { id: "note", icon: "🎵" },
  { id: "guitar", icon: "🎸" },
  { id: "piano", icon: "🎹" },
  { id: "sax", icon: "🎷" },
  { id: "vinyl", icon: "💿" },
  { id: "radio", icon: "📻" },
  { id: "mic", icon: "🎤" },
  { id: "synth", icon: "🎛️" },
  { id: "coffee", icon: "☕" },
];

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  initialRoomId = "",
}) => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(initialRoomId);
  const [username, setUsername] = useState(localStorage.getItem("synctune:pref:username") || "");
  const [selectedAvatar, setSelectedAvatar] = useState(localStorage.getItem("synctune:pref:avatar") || "🎵");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = roomId.trim();
    if (!cleanId) {
      setError("Please enter a valid room code or paste an invite link.");
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

      sessionStorage.setItem(`synctune:participantId:${response.room.id}`, response.participantId);
      sessionStorage.setItem(`synctune:username:${response.room.id}`, username.trim());
      sessionStorage.setItem(`synctune:avatar:${response.room.id}`, selectedAvatar);
      localStorage.setItem("synctune:pref:username", username.trim());
      localStorage.setItem("synctune:pref:avatar", selectedAvatar);

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
      badge="Tune In"
      title="Join Listening Room"
      description="Enter the Room Code or invite link and choose your desk avatar."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs bg-error/10 border border-error/30 text-error rounded-lg font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-on-surface">Room Code or Invitation URL</label>
          <Input
            placeholder="e.g. SRN5WM or https://jemaw.live/room/..."
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setError(null);
            }}
            leftIcon={<KeyRound className="w-4 h-4 text-tertiary" />}
            autoFocus
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-on-surface">Your Display Name</label>
          <Input
            placeholder="Your name or handle"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            leftIcon={<User className="w-4 h-4 text-tertiary" />}
            required
          />
        </div>

        {/* Avatar Preset Selector */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-on-surface">Pick an Avatar</span>
            <span className="text-[11px] text-tertiary">(shows in room listeners)</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DESK_AVATARS.map((item) => {
              const isSelected = selectedAvatar === item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedAvatar(item.icon)}
                  className={`relative flex items-center justify-center h-12 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FFF7ED] border-primary text-primary shadow-[0_0_0_1.5px_#EA580C]"
                      : "bg-surface border-outline-variant text-tertiary hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Enter Studio
          </Button>
        </div>
      </form>
    </Modal>
  );
};
