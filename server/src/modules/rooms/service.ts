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

export class RoomService {
  constructor(private repo: IRoomRepository = roomRepository) {}

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
    const room = await this.repo.findById(roomId);
    if (!room) {
      throw new AppError(404, `Room "${roomId}" not found.`, "ROOM_NOT_FOUND");
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
  ): Promise<{ room: Room; participant: Participant; statusChanged: boolean } | null> {
    const room = await this.repo.findById(roomId);
    if (!room) return null;

    const participant = room.participants.find((p) => p.id === participantId);
    if (!participant) return null;

    participant.isConnected = isConnected;
    let statusChanged = false;

    // Host disconnect handling: Mark room as host-disconnected without silently transferring host
    if (participant.role === "HOST") {
      const newStatus: RoomStatus = isConnected ? "active" : "host-disconnected";
      if (room.status !== newStatus) {
        room.status = newStatus;
        statusChanged = true;
      }
    }

    const updated = await this.repo.update(room);
    return { room: updated, participant, statusChanged };
  }

  /**
   * Remove a participant from a room.
   */
  async leaveRoom(
    roomId: string,
    participantId: string
  ): Promise<{ room: Room; participant: Participant } | null> {
    const room = await this.repo.findById(roomId);
    if (!room) return null;

    const index = room.participants.findIndex((p) => p.id === participantId);
    if (index === -1) return null;

    const [removed] = room.participants.splice(index, 1);
    if (!removed) return null;

    // If host left and no participants remain, close room
    if (removed.role === "HOST") {
      if (room.participants.length === 0) {
        room.status = "closed";
      } else {
        room.status = "host-disconnected";
      }
    }

    const updated = await this.repo.update(room);
    return { room: updated, participant: removed };
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
    return rooms.filter((r) => r.status !== "closed");
  }
}

export const roomService = new RoomService();

