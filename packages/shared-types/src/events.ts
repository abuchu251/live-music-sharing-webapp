import type { Participant } from "./participant.js";
import type { PlaybackState, PlaybackCommand } from "./playback.js";
import type { Room, QueueItem } from "./room.js";
import type { ChatMessage } from "./chat.js";

// ─── Socket.IO Event Type Maps ────────────────────────────

/**
 * Events sent from the client to the server.
 */
export interface ClientToServerEvents {
  // Room events
  "room:join": (
    data: { roomId: string; username: string; avatar?: string; participantId?: string },
    callback: (response: { ok: boolean; room?: Room; participantId?: string; error?: string }) => void
  ) => void;
  "room:leave": () => void;

  // Playback events (host only)
  "playback:command": (
    command: PlaybackCommand,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  // Queue events
  "queue:add": (
    data: { videoId: string; title?: string },
    callback: (response: { ok: boolean; queueItem?: QueueItem; error?: string }) => void
  ) => void;
  "queue:remove": (
    data: { queueItemId: string },
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;
  "queue:reorder": (
    data: { queueItemIds: string[] },
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  // Chat events
  "chat:send": (
    data: { content: string },
    callback: (response: { ok: boolean; message?: ChatMessage; error?: string }) => void
  ) => void;

  // Clock synchronization
  "sync:time": (
    clientSendTime: number,
    callback: (response: { serverTime: number }) => void
  ) => void;
}

/**
 * Events sent from the server to the client.
 */
export interface ServerToClientEvents {
  // Room events
  "room:participant-joined": (participant: Participant) => void;
  "room:participant-left": (data: { participantId: string }) => void;
  "room:participant-updated": (participant: Participant) => void;
  "room:status-changed": (data: { status: Room["status"] }) => void;
  "room:closed": (data: { reason: string }) => void;

  // Playback events
  "playback:state-update": (state: PlaybackState) => void;

  // Queue events
  "queue:updated": (queue: QueueItem[]) => void;

  // Chat events
  "chat:message": (message: ChatMessage) => void;

  // Error events
  "error": (data: { message: string; code?: string }) => void;
}

/**
 * Inter-server events (for horizontal scaling with Redis adapter).
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Data attached to each socket.
 */
export interface SocketData {
  participantId: string;
  username: string;
  avatar: string;
  roomId: string;
  role: Participant["role"];
}
