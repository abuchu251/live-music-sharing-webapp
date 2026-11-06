import express, { type Express } from "express";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { isDatabaseReady } from "./db/prisma.js";
import { roomRouter } from "./modules/rooms/routes.js";
import { authRouter } from "./modules/auth/routes.js";
import { playlistRouter } from "./modules/playlists/routes.js";

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(corsMiddleware);
  app.use(express.json());

  // General rate limiter for all /api endpoints
  app.use("/api", apiLimiter);

  // Health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: isDatabaseReady() ? "connected" : "in-memory-fallback",
    });
  });

  // REST Domain Routes
  app.use("/api/auth", authRouter);
  app.use("/api/rooms", roomRouter);
  app.use("/api/playlists", playlistRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
