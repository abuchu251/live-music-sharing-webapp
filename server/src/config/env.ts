import dotenv from "dotenv";
import { resolve } from "path";

// Load .env from project root
dotenv.config({ path: resolve(import.meta.dirname, "../../.env") });

export const env = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
  jwtSecret: process.env["JWT_SECRET"] ?? "synctune-super-secret-jwt-key-2026",
  jwtExpiresIn: process.env["JWT_EXPIRES_IN"] ?? "7d",
  databaseUrl: process.env["DATABASE_URL"] ?? "",
  isDevelopment: (process.env["NODE_ENV"] ?? "development") === "development",
  isProduction: process.env["NODE_ENV"] === "production",
} as const;
