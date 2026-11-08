import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  PlaybackCommand,
} from "@synctune/shared-types";
import { playbackService } from "../../modules/playback/service.js";
import { roomRepository } from "../../modules/rooms/repository.js";
import type { TypedSocket } from "./roomHandler.js";

export function registerPlaybackHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: TypedSocket
): void {
  // Handle host playback command
  socket.on("playback:command", async (command: PlaybackCommand, callback) => {
    const { roomId, participantId } = socket.data;

    if (!roomId || !participantId) {
      callback({ ok: false, error: "You must join a room first." });
      return;
    }

    try {
      const room = await roomRepository.findById(roomId);
      if (!room) {
        callback({ ok: false, error: "Room not found." });
        return;
      }

      // Authoritative host check against room state
      if (room.hostId !== participantId && socket.data.role !== "HOST") {
        callback({
          ok: false,
          error: "Unauthorized: Only the room host can control playback.",
        });
        return;
      }

      // Upgrade socket role if needed
      socket.data.role = "HOST";

      const updatedState = await playbackService.processCommand(
        roomId,
        participantId,
        command
      );

      // Acknowledge command to the host
      callback({ ok: true });

      // Broadcast authoritative state update to EVERYONE in the room (including host)
      io.to(roomId).emit("playback:state-update", updatedState);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to execute playback command.";
      console.error(`[Playback] Command execution error:`, message);
      callback({ ok: false, error: message });
    }
  });

  // Handle client clock synchronization (NTP style ping/pong)
  socket.on("sync:time", (_clientSendTime, callback) => {
    callback({ serverTime: Date.now() });
  });
}

