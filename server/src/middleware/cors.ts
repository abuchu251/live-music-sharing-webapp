import cors from "cors";
import { env } from "../config/env.js";

export const corsMiddleware = cors({
  origin: env.corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
});
