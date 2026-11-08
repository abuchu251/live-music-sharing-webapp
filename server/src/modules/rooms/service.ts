import { nanoid } from "nanoid";
import type {
  Room,
  Participant,
  RoomStatus,
  QueueItem,
} from "@synctune/shared-types";
import { createInitialPlaybackState } from "@synctune/shared-types";
import { IRoomRepository, roomRepository } from "./repository.js";
import { AppError } from "../../middleware/errorHandler.js";
import { env } from "../../config/env.js";

const DEMO_ROOM_CONFIGS: Record<
  string,
  {
    name: string;
    hostName: string;
    avatar: string;
    videoId: string;
    tracks: Array<{ videoId: string; title: string; artist: string; duration: number }>;
  }
> = {
  "preview-demo": {
    name: "Late Night Lo-Fi Room",
    hostName: "Maya",
    avatar: "🎧",
    videoId: "jfKfPfyJRdk",
    tracks: [
      { videoId: "jfKfPfyJRdk", title: "lofi hip hop radio - beats to relax/study to", artist: "Lofi Girl", duration: 3600 },
      { videoId: "DWcJFNfaw9c", title: "Synthwave Radio - Chill Synth / Retro Beats", artist: "Lofi Records", duration: 3600 },
      { videoId: "5qap5aO4i9A", title: "Lofi Hip Hop Radio 24/7 Chill Beats", artist: "ChilledCow", duration: 3600 },
    ],
  },
  "demo-room": {
    name: "Late Night Lo-Fi Room",
    hostName: "Maya",
    avatar: "🎧",
    videoId: "jfKfPfyJRdk",
    tracks: [
      { videoId: "jfKfPfyJRdk", title: "lofi hip hop radio - beats to relax/study to", artist: "Lofi Girl", duration: 3600 },
      { videoId: "DWcJFNfaw9c", title: "Synthwave Radio - Chill Synth / Retro Beats", artist: "Lofi Records", duration: 3600 },
    ],
  },
  "lofi-cafe-101": {
    name: "Midnight Coffee & Chillhop",
    hostName: "Maya",
    avatar: "🎧",
    videoId: "jfKfPfyJRdk",
    tracks: [
      { videoId: "jfKfPfyJRdk", title: "lofi hip hop radio - beats to relax/study to", artist: "Lofi Girl", duration: 3600 },
      { videoId: "5qap5aO4i9A", title: "Lofi Hip Hop Radio 24/7 Chill Beats", artist: "ChilledCow", duration: 3600 },
    ],
  },
  "synth-drive-80s": {
    name: "Retro Synth & Neon Drive",
    hostName: "Marcus",
    avatar: "👾",
    videoId: "DWcJFNfaw9c",
    tracks: [
      { videoId: "DWcJFNfaw9c", title: "Synthwave Radio - Chill Synth / Retro Beats", artist: "Lofi Records", duration: 3600 },
      { videoId: "jfKfPfyJRdk", title: "Nightcall / Neon Beats", artist: "Kavinsky Style", duration: 250 },
    ],
  },
  "deep-focus-code": {
    name: "Deep Focus for Developers",
    hostName: "Elena",
    avatar: "✨",
    videoId: "5qap5aO4i9A",
    tracks: [
      { videoId: "5qap5aO4i9A", title: "Ambient Coding Session Vol. 4", artist: "Deep Coding", duration: 3600 },
      { videoId: "jfKfPfyJRdk", title: "Chill Programming Vibes", artist: "Lofi Girl", duration: 3600 },
    ],
  },
};

export class RoomService {
  constructor(private repo: IRoomRepository = roomRepository) {}

  private buildDemoRoom(roomId: string): Room {
    const config = DEMO_ROOM_CONFIGS[roomId] || DEMO_ROOM_CONFIGS["preview-demo"]!;
    const hostId = `user-${roomId}-host`;
    const host: Participant = {
      id: hostId,
      username: config.hostName,
      avatar: config.avatar,
      role: "HOST",
      connectedAt: Date.now(),
      isConnected: true,
    };
    const queue: QueueItem[] = config.tracks.map((t, idx) => ({
      id: `queue-${roomId}-${idx + 1}`,
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnailUrl: `https://img.youtube.com/vi/${t.videoId}/hqdefault.jpg`,
      addedBy: {
        participantId: hostId,
        username: config.hostName,
        avatar: config.avatar,
      },
      addedAt: Date.now() - (config.tracks.length - idx) * 60000,
    }));

    return {
      id: roomId,
      name: config.name,
      hostId,
      participants: [host],
      queue,
      currentPlaybackState: {
        videoId: config.videoId,
        status: "playing",
        position: 10,
        updatedAt: Date.now(),
        revision: 1,
      },
      settings: {
        allowListenerQueue: true,
        isPrivate: false,
      },
      createdAt: Date.now(),
      status: "active",
    };
  }

  /**
   * Create a new room with the requesting user as HOST.
   */
  async createRoom(params: {
    roomName: string;
    hostUsername?: string;
    username?: string;
    avatar?: string;
  }): Promise<{ room: Room; host: Participant; inviteUrl: string }> {
    const rawUsername = params.hostUsername || params.username || "Host";
    const { roomName, avatar = "🎧" } = params;
    const hostUsername = rawUsername.trim();

    const roomId = `room-${nanoid(8)}`;
    const hostId = `user-${nanoid(8)}`;

    const host: Participant = {
      id: hostId,
      username: hostUsername.trim(),
      avatar,
      role: "HOST",
      connectedAt: Date.now(),
      isConnected: true,
    };

    const room: Room = {
      id: roomId,
      name: roomName.trim(),
      hostId,
      participants: [host],
      queue: [],
      currentPlaybackState: createInitialPlaybackState(),
      settings: {
        allowListenerQueue: true,
        isPrivate: false,
      },
      createdAt: Date.now(),
      status: "active",
    };

    const createdRoom = await this.repo.create(room);
    const inviteUrl = `${env.corsOrigin}/room/${roomId}`;

    return { room: createdRoom, host, inviteUrl };
  }

  /**
   * Find a room by ID.
   */
  async getRoom(roomId: string): Promise<Room> {
    let room = await this.repo.findById(roomId);
    if (!room) {
      if (DEMO_ROOM_CONFIGS[roomId]) {
        const demo = this.buildDemoRoom(roomId);
        room = await this.repo.create(demo);
      } else {
        throw new AppError(404, `Room "${roomId}" not found.`, "ROOM_NOT_FOUND");
      }
    }
    return room;
  }

  /**
   * Join an existing room as a LISTENER, or reconnect as existing participant.
   */
  async joinRoom(params: {
    roomId: string;
    username: string;
    avatar?: string;
    participantId?: string;
  }): Promise<{ room: Room; participant: Participant }> {
    const { roomId, username, avatar = "🎵", participantId } = params;
    const room = await this.getRoom(roomId);

    if (room.status === "closed") {
      throw new AppError(400, "This room has been closed.", "ROOM_CLOSED");
    }

    // Check if participant is reconnecting with existing ID
    if (participantId) {
      const existing = room.participants.find((p) => p.id === participantId);
      if (existing) {
        existing.isConnected = true;
        existing.username = username.trim() || existing.username;
        if (avatar) existing.avatar = avatar;

        // If host reconnected, restore room to active
        if (existing.role === "HOST") {
          room.status = "active";
        }

        const updated = await this.repo.update(room);
        return { room: updated, participant: existing };
      }
    }

    // New participant joining
    const newParticipantId = `user-${nanoid(8)}`;
    const participant: Participant = {
      id: newParticipantId,
      username: username.trim(),
      avatar,
      role: "LISTENER",
      connectedAt: Date.now(),
      isConnected: true,
    };

    room.participants.push(participant);
    const updated = await this.repo.update(room);

    return { room: updated, participant };
  }

  /**
   * Update participant connection status (e.g. On socket disconnect/connect).
   */
  async setParticipantConnected(
    roomId: string,
    participantId: string,
    isConnected: boolean
  ): Promise<{ room: Room; participant: Participant; promotedHost?: Participant | null; statusChanged: boolean } | null> {
    const room = await this.repo.findById(roomId);
    if (!room) return null;

    const participant = room.participants.find((p) => p.id === participantId);
    if (!participant) return null;

    participant.isConnected = isConnected;
    let statusChanged = false;
    let promotedHost: Participant | null = null;

    // Automatic Host Promotion: When host disconnects, promote the next connected participant
    if (participant.role === "HOST" && !isConnected) {
      const nextActive = room.participants.find(
        (p) => p.id !== participantId && p.isConnected
      );
      if (nextActive) {
        participant.role = "LISTENER";
        nextActive.role = "HOST";
        room.hostId = nextActive.id;
        room.status = "active";
        promotedHost = nextActive;
        statusChanged = true;
      } else {
        const newStatus: RoomStatus = "host-disconnected";
        if (room.status !== newStatus) {
          room.status = newStatus;
          statusChanged = true;
        }
      }
    } else if (participant.role === "HOST" && isConnected) {
      if (room.status !== "active") {
        room.status = "active";
        statusChanged = true;
      }
    }

    const updated = await this.repo.update(room);
    return { room: updated, participant, promotedHost, statusChanged };
  }

  /**
   * Remove a participant from a room.
   */
  async leaveRoom(
    roomId: string,
    participantId: string
  ): Promise<{ room: Room; participant: Participant; promotedHost?: Participant | null } | null> {
    const room = await this.repo.findById(roomId);
    if (!room) return null;

    const index = room.participants.findIndex((p) => p.id === participantId);
    if (index === -1) return null;

    const [removed] = room.participants.splice(index, 1);
    if (!removed) return null;

    let promotedHost: Participant | null = null;

    // If host left, promote the next connected listener
    if (removed.role === "HOST") {
      const nextActive = room.participants.find((p) => p.isConnected);
      if (nextActive) {
        nextActive.role = "HOST";
        room.hostId = nextActive.id;
        room.status = "active";
        promotedHost = nextActive;
      } else {
        room.status = room.participants.length === 0 ? "closed" : "host-disconnected";
      }
    }

    const updated = await this.repo.update(room);
    return { room: updated, participant: removed, promotedHost };
  }

  /**
   * Add a YouTube video track to the room queue.
   */
  async addQueueItem(params: {
    roomId: string;
    participant: Participant;
    videoId: string;
    title?: string;
  }): Promise<{ room: Room; item: QueueItem }> {
    const { roomId, participant, videoId, title } = params;
    const room = await this.getRoom(roomId);

    // Permission check for queue addition
    if (participant.role !== "HOST" && !room.settings.allowListenerQueue) {
      throw new AppError(
        403,
        "Queueing is currently restricted to the host in this room.",
        "QUEUE_RESTRICTED"
      );
    }

    const item: QueueItem = {
      id: `queue-${nanoid(8)}`,
      videoId,
      title: title || `YouTube Track (${videoId})`,
      artist: "YouTube Stream",
      duration: 215,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      addedBy: {
        participantId: participant.id,
        username: participant.username,
        avatar: participant.avatar,
      },
      addedAt: Date.now(),
    };

    room.queue.push(item);
    const updated = await this.repo.update(room);
    return { room: updated, item };
  }

  /**
   * Remove a track from the room queue. Host can remove any track; listeners can remove their own.
   */
  async removeQueueItem(params: {
    roomId: string;
    participantId: string;
    isHost: boolean;
    queueItemId: string;
  }): Promise<{ room: Room }> {
    const { roomId, participantId, isHost, queueItemId } = params;
    const room = await this.getRoom(roomId);

    const index = room.queue.findIndex((q) => q.id === queueItemId);
    if (index === -1) {
      throw new AppError(404, "Queue item not found.", "NOT_FOUND");
    }

    const item = room.queue[index];
    if (!item) {
      throw new AppError(404, "Queue item not found.", "NOT_FOUND");
    }

    if (!isHost && item.addedBy.participantId !== participantId) {
      throw new AppError(403, "You can only remove tracks that you added.", "FORBIDDEN");
    }

    room.queue.splice(index, 1);
    const updated = await this.repo.update(room);
    return { room: updated };
  }

  /**
   * Reorder room queue (Host only).
   */
  async reorderQueue(params: {
    roomId: string;
    isHost: boolean;
    queueItemIds: string[];
  }): Promise<{ room: Room }> {
    const { roomId, isHost, queueItemIds } = params;
    const room = await this.getRoom(roomId);

    if (!isHost) {
      throw new AppError(403, "Only the host can reorder upcoming tracks.", "FORBIDDEN");
    }

    const itemMap = new Map(room.queue.map((item) => [item.id, item]));
    const reordered: QueueItem[] = [];

    for (const id of queueItemIds) {
      const item = itemMap.get(id);
      if (item) {
        reordered.push(item);
        itemMap.delete(id);
      }
    }

    // Append any tracks that were omitted
    for (const remaining of itemMap.values()) {
      reordered.push(remaining);
    }

    room.queue = reordered;
    const updated = await this.repo.update(room);
    return { room: updated };
  }

  /**
   * List active rooms.
   */
  async listActiveRooms(): Promise<Room[]> {
    const rooms = await this.repo.list();
    const active = rooms.filter((r) => r.status !== "closed");
    if (active.length === 0) {
      for (const id of ["lofi-cafe-101", "synth-drive-80s", "deep-focus-code"]) {
        const demo = this.buildDemoRoom(id);
        await this.repo.create(demo);
        active.push(demo);
      }
    }
    return active;
  }
}

export const roomService = new RoomService();

