import type { Participant } from "./participant.js";
import type { PlaybackState } from "./playback.js";

// ─── Queue ────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  thumbnailUrl: string;
  addedBy: {
    participantId: string;
    username: string;
    avatar: string;
  };
  addedAt: number;
}

// ─── Room ─────────────────────────────────────────────────

export type RoomStatus = "active" | "closed" | "host-disconnected";

export interface RoomSettings {
  allowListenerQueue: boolean;
  isPrivate: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  participants: Participant[];
  queue: QueueItem[];
  currentPlaybackState: PlaybackState;
  settings: RoomSettings;
  createdAt: number;
  status: RoomStatus;
}

export interface CreateRoomRequest {
  roomName: string;
  username: string;
  avatar?: string;
  isPrivate?: boolean;
  allowListenerQueue?: boolean;
}

export interface CreateRoomResponse {
  room: Room;
  participantId: string;
  inviteUrl: string;
}

export interface JoinRoomRequest {
  username: string;
  avatar?: string;
  participantId?: string;
}

export interface JoinRoomResponse {
  room: Room;
  participantId: string;
}
