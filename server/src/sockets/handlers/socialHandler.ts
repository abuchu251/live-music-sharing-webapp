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

      const { room, item } = await roomService.addQueueItem({
        roomId,
        participant,
        videoId: data.videoId,
        title: data.title,
      });

      callback({ ok: true, queueItem: item });

      // Broadcast updated queue to everyone in the room
      io.to(roomId).emit("queue:updated", room.queue);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add song to queue.";
      callback({ ok: false, error: msg });
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
      const { room } = await roomService.removeQueueItem({
        roomId,
        participantId,
        isHost: role === "HOST",
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
    const { roomId, role } = socket.data;
    if (!roomId) {
      callback({ ok: false, error: "Must join a room first." });
      return;
    }

    try {
      const { room } = await roomService.reorderQueue({
        roomId,
        isHost: role === "HOST",
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

