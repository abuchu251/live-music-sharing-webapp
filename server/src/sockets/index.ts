import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@synctune/shared-types";
import { env } from "../config/env.js";
import { registerRoomHandlers } from "./handlers/roomHandler.js";
import { registerPlaybackHandlers } from "./handlers/playbackHandler.js";
import { registerSocialHandlers } from "./handlers/socialHandler.js";

export type SocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io: SocketServer = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Register domain event handlers
    registerRoomHandlers(socket);
    registerPlaybackHandlers(io, socket);
    registerSocialHandlers(io, socket);
  });

  return io;
}
