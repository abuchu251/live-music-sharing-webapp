import { createServer } from "http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { createSocketServer } from "./sockets/index.js";
import { checkDatabaseConnection } from "./db/prisma.js";

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);

async function start() {
  const dbConnected = await checkDatabaseConnection();

  httpServer.listen(env.port, () => {
    const dbStatus = dbConnected ? "PostgreSQL (Prisma)" : "In-Memory Fallback";
    console.log(`
  ╔══════════════════════════════════════════╗
  ║         SyncTune Server v0.1.0           ║
  ╠══════════════════════════════════════════╣
  ║  HTTP:     http://localhost:${env.port}          ║
  ║  Mode:     ${env.nodeEnv.padEnd(27)}║
  ║  Database: ${dbStatus.padEnd(27)}║
  ║  CORS:     ${env.corsOrigin.padEnd(27)}║
  ╚══════════════════════════════════════════╝
  `);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n[Server] ${signal} received. Shutting down...`);
  io.close();
  httpServer.close(() => {
    console.log("[Server] Closed.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
