import { Router } from "express";
import { authService } from "./service.js";
import { authenticateUser } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { z } from "zod";

export const authRouter: Router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(6).max(100),
  avatar: z.string().optional(),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

const guestSchema = z.object({
  username: z.string().min(1).max(30).optional(),
  avatar: z.string().optional(),
});

// POST /api/auth/register
authRouter.post("/register", authLimiter, async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await authService.register(validated);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
authRouter.post("/login", authLimiter, async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await authService.login(validated);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/guest
authRouter.post("/guest", async (req, res, next) => {
  try {
    const validated = guestSchema.parse(req.body);
    const result = await authService.createGuestSession({
      username: validated.username ?? "",
      avatar: validated.avatar,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
authRouter.get("/me", authenticateUser, async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }

    if (req.user.isGuest) {
      res.status(200).json({
        success: true,
        data: {
          id: req.user.id,
          username: req.user.username,
          avatar: req.user.avatar,
          isGuest: true,
          role: "GUEST",
        },
      });
      return;
    }

    const user = await authService.getCurrentUser(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

