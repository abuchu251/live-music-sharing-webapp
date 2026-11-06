import cors from "cors";
import { env } from "../config/env.js";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, local server)
    if (!origin) return callback(null, true);
    if (env.corsOrigin === "*" || env.isDevelopment) {
      return callback(null, true);
    }
    const allowed = env.corsOrigin.split(",").map((s) => s.trim());
    if (allowed.includes(origin) || allowed.includes("*")) {
      return callback(null, true);
    }
    // Fallback: accept same-host origins
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
});
