// ─── @synctune/shared-types ───────────────────────────────
// Single source of truth for all shared TypeScript contracts.

export type { Participant, ParticipantRole } from "./participant.js";
export type {
  PlaybackState,
  PlaybackStatus,
  PlaybackCommand,
} from "./playback.js";
export { createInitialPlaybackState } from "./playback.js";
export type {
  Room,
  RoomStatus,
  RoomSettings,
  QueueItem,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
} from "./room.js";
export type { ChatMessage } from "./chat.js";
export type {
  User,
  AuthSessionUser,
  AuthResponse,
  GuestAuthResponse,
  LoginRequest,
  RegisterRequest,
  GuestAuthRequest,
} from "./auth.js";
export type {
  Playlist,
  PlaylistTrack,
  CreatePlaylistRequest,
  AddTrackToPlaylistRequest,
} from "./playlist.js";
export type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./events.js";
