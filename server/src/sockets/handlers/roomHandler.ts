import type { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@synctune/shared-types";
import { roomService } from "../../modules/rooms/service.js";

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function registerRoomHandlers(socket: TypedSocket): void {
  // Client joins a room
  socket.on("room:join", async (data, callback) => {
    try {
      const { roomId, username, avatar, participantId } = data;

      const result = await roomService.joinRoom({
        roomId,
        username,
        avatar,
        participantId,
      });

      const participant = result.participant;

      // Associate metadata with socket
      socket.data.roomId = roomId;
      socket.data.participantId = participant.id;
      socket.data.username = participant.username;
      socket.data.avatar = participant.avatar;
      socket.data.role = participant.role;

      // Join the Socket.IO room channel
      await socket.join(roomId);

      console.log(
        `[Socket] User "${participant.username}" (${participant.id}, ${participant.role}) joined room "${roomId}"`
      );

      // Notify caller with full room snapshot
      callback({
        ok: true,
        room: result.room,
        participantId: participant.id,
      });

      // Broadcast to other participants in this room
      socket.to(roomId).emit("room:participant-joined", participant);

      // If room was previously host-disconnected and host just rejoined, notify room
      if (participant.role === "HOST" && result.room.status === "active") {
        socket.to(roomId).emit("room:status-changed", { status: "active" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join room";
      console.error(`[Socket] room:join error:`, message);
      callback({ ok: false, error: message });
    }
  });

  // Client explicitly leaves a room
  socket.on("room:leave", async () => {
    const { roomId, participantId } = socket.data;
    if (!roomId || !participantId) return;

    try {
      const result = await roomService.leaveRoom(roomId, participantId);
      await socket.leave(roomId);

      if (result) {
        socket.to(roomId).emit("room:participant-left", { participantId });
        if (result.promotedHost) {
          socket.to(roomId).emit("room:participant-updated", result.promotedHost);
          socket.to(roomId).emit("room:status-changed", { status: "active" });
        } else if (result.room.status === "host-disconnected") {
          socket.to(roomId).emit("room:status-changed", { status: "host-disconnected" });
        }
      }

      socket.data.roomId = undefined as unknown as string;
      socket.data.participantId = undefined as unknown as string;

      console.log(`[Socket] Participant ${participantId} left room ${roomId}`);
    } catch (err) {
      console.error(`[Socket] room:leave error:`, err);
    }
  });

  // Socket disconnected (tab closed, network dropped)
  socket.on("disconnect", async (reason) => {
    const { roomId, participantId, username } = socket.data;
    if (!roomId || !participantId) return;

    try {
      console.log(
        `[Socket] Participant "${username}" (${participantId}) disconnected from room "${roomId}": ${reason}`
      );

      const result = await roomService.setParticipantConnected(
        roomId,
        participantId,
        false
      );

      if (result) {
        // Broadcast participant connection update
        socket.to(roomId).emit("room:participant-updated", result.participant);

        // If a new participant was promoted to HOST, notify everyone
        if (result.promotedHost) {
          socket.to(roomId).emit("room:participant-updated", result.promotedHost);
          socket.to(roomId).emit("room:status-changed", { status: "active" });
        } else if (result.statusChanged && result.room.status === "host-disconnected") {
          socket.to(roomId).emit("room:status-changed", { status: "host-disconnected" });
        }
      }
    } catch (err) {
      console.error(`[Socket] disconnect handler error:`, err);
    }
  });
}

