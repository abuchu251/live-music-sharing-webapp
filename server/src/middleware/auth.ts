import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../modules/auth/jwt.js";
import type { AuthSessionUser } from "@synctune/shared-types";

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthSessionUser;
    }
  }
}

export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Bearer token.",
    });
    return;
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired token.",
    });
    return;
  }

  req.user = user;
  next();
}

export function optionalAuthenticateUser(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

