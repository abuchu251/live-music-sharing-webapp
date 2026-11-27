import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@synctune/shared-types";
import { roomService } from "../../modules/rooms/service.js";
import { chatService } from "../../modules/chat/service.js";
import type { TypedSocket } from "./roomHandler.js";

export function registerSocialHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: TypedSocket
): void {
  // Handle adding a song to the queue
  socket.on("queue:add", async (data, callback) => {
    const { roomId, participantId, username, avatar, role } = socket.data;
    if (!roomId || !participantId) {
      callback({ ok: false, error: "Must join a room first." });
      return;
    }

    try {
      const participant = {
        id: participantId,
        username,
        avatar,
        role,
        connectedAt: Date.now(),
        isConnected: true,
      };

      const { room, item, playbackStarted } = await roomService.addQueueItem({
        roomId,
        participant,
        videoId: data.videoId,
        title: data.title,
        duration: data.duration,
      });

      callback({ ok: true, queueItem: item });

      // Broadcast updated queue to everyone in the room
      io.to(roomId).emit("queue:updated", room.queue);

      // Broadcast playing state when first track auto-starts an idle room
      if (playbackStarted) {
        io.to(roomId).emit("playback:state-update", room.currentPlaybackState);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add song to queue.";
      callback({ ok: false, error: msg });
    }
  });

  // Handle live duration sync from YouTube player
  socket.on("queue:update-duration", async (data) => {
    const { roomId } = socket.data;
    if (!roomId || !data?.videoId || !data?.duration || data.duration <= 0) return;

    try {
      const updatedRoom = await roomService.updateQueueItemDuration(
        roomId,
        data.videoId,
        Math.round(data.duration)
      );
      if (updatedRoom) {
        io.to(roomId).emit("queue:updated", updatedRoom.queue);
      }
    } catch (err) {
      console.error("[Queue] Error updating duration:", err);
    }
  });

  // Handle removing a song from the queue
  socket.on("queue:remove", async (data, callback) => {
    const { roomId, participantId, role } = socket.data;
    if (!roomId || !participantId) {
      callback({ ok: false, error: "Must join a room first." });
      return;
    }

    try {
      const roomInstance = await roomService.getRoom(roomId);
      const participant = roomInstance?.participants.find((p) => p.id === participantId);
      const isPrivileged =
        role === "HOST" ||
        role === "COHOST" ||
        (roomInstance && (roomInstance.hostId === participantId || participant?.role === "COHOST"));

      const { room } = await roomService.removeQueueItem({
        roomId,
        participantId,
        isHost: Boolean(isPrivileged),
        queueItemId: data.queueItemId,
      });

      callback({ ok: true });
      io.to(roomId).emit("queue:updated", room.queue);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove song from queue.";
      callback({ ok: false, error: msg });
    }
  });

  // Handle reordering the queue (Host only)
  socket.on("queue:reorder", async (data, callback) => {
    const { roomId, participantId, role } = socket.data;
    if (!roomId) {
      callback({ ok: false, error: "Must join a room first." });
      return;
    }

    try {
      const roomInstance = await roomService.getRoom(roomId);
      const participant = roomInstance?.participants.find((p) => p.id === participantId);
      const isPrivileged =
        role === "HOST" ||
        role === "COHOST" ||
        (roomInstance && (roomInstance.hostId === participantId || participant?.role === "COHOST"));

      const { room } = await roomService.reorderQueue({
        roomId,
        isHost: Boolean(isPrivileged),
        queueItemIds: data.queueItemIds,
      });

      callback({ ok: true });
      io.to(roomId).emit("queue:updated", room.queue);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reorder queue.";
      callback({ ok: false, error: msg });
    }
  });

  // Handle sending a chat message
  socket.on("chat:send", (data, callback) => {
    const { roomId, participantId, username, avatar, role } = socket.data;
    if (!roomId || !participantId) {
      callback({ ok: false, error: "Must join a room first." });
      return;
    }

    try {
      const message = chatService.postMessage({
        roomId,
        senderId: participantId,
        senderUsername: username,
        senderAvatar: avatar,
        isHost: role === "HOST",
        content: data.content,
      });

      callback({ ok: true, message });

      // Broadcast chat message to everyone in the room
      io.to(roomId).emit("chat:message", message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send chat message.";
      callback({ ok: false, error: msg });
    }
  });
}

