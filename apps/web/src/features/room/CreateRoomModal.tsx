import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Music, User, Globe, Lock, Check } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { createRoom } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DESK_AVATARS = [
  { id: "headphones", icon: "🎧", label: "Headphones" },
  { id: "note", icon: "🎵", label: "Music Note" },
  { id: "guitar", icon: "🎸", label: "Acoustic Guitar" },
  { id: "piano", icon: "🎹", label: "Piano Keys" },
  { id: "sax", icon: "🎷", label: "Saxophone" },
  { id: "vinyl", icon: "💿", label: "Vinyl Record" },
  { id: "radio", icon: "📻", label: "Analog Radio" },
  { id: "mic", icon: "🎤", label: "Microphone" },
  { id: "synth", icon: "🎛️", label: "Synthesizer" },
  { id: "coffee", icon: "☕", label: "Desk Coffee" },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState("Afternoon Office Beats");
  const [username, setUsername] = useState(user?.username || localStorage.getItem("synctune:pref:username") || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || localStorage.getItem("synctune:pref:avatar") || "🎧");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      badge="Host Studio Session"
      title="Create Listening Room"
      description="You'll control playback. Anyone with your link can tune in."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs bg-error/10 border border-error/30 text-error rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Room Name */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-on-surface">Room Name</label>
            <span className="font-mono text-[11px] text-tertiary">Editable anytime</span>
          </div>
          <Input
            value={roomName}
            onChange={(e) => {
              setRoomName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Afternoon Office Beats"
            leftIcon={<Music className="w-4 h-4 text-tertiary" />}
            autoFocus
            required
          />
        </div>

        {/* Display Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-on-surface">Your Display Name</label>
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            placeholder="Your name or handle"
            leftIcon={<User className="w-4 h-4 text-tertiary" />}
            required
          />
        </div>

        {/* 2x5 Desk Avatar Grid */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-on-surface">Pick a Desk Avatar</span>
            <span className="text-[11px] text-tertiary">(shows beside your queue tracks)</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup">
            {DESK_AVATARS.map((item) => {
              const isSelected = selectedAvatar === item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedAvatar(item.icon)}
                  className={`relative flex flex-col items-center justify-center h-13 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FFF7ED] border-primary text-primary shadow-[0_0_0_1.5px_#EA580C]"
                      : "bg-surface border-outline-variant text-tertiary hover:text-on-surface hover:bg-surface-container"
                  }`}
                  title={item.label}
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

        {/* Room Privacy */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-on-surface">Room Privacy</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                !isPrivate
                  ? "bg-[#FFF7ED] border-primary shadow-[0_0_0_1px_#EA580C]"
                  : "bg-surface border-outline-variant hover:border-tertiary/50"
              }`}
            >
              <Globe className={`w-4 h-4 mt-0.5 shrink-0 ${!isPrivate ? "text-primary" : "text-tertiary"}`} />
              <div>
                <div className="text-xs font-semibold text-on-surface">Public Room</div>
                <div className="text-[11px] text-tertiary">Listed in live rooms</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                isPrivate
                  ? "bg-[#FFF7ED] border-primary shadow-[0_0_0_1px_#EA580C]"
                  : "bg-surface border-outline-variant hover:border-tertiary/50"
              }`}
            >
              <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${isPrivate ? "text-primary" : "text-tertiary"}`} />
              <div>
                <div className="text-xs font-semibold text-on-surface">Unlisted Room</div>
                <div className="text-[11px] text-tertiary">Invite link only</div>
              </div>
            </button>
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
          >
            Create Listening Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};
