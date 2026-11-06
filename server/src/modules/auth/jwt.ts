import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { AuthSessionUser } from "@synctune/shared-types";

export function signToken(payload: AuthSessionUser): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload as any, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): AuthSessionUser | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    return decoded as AuthSessionUser;
  } catch {
    return null;
  }
}

