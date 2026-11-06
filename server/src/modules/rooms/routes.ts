import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { roomService } from "./service.js";

const router = Router();

const createRoomSchema = z.object({
  roomName: z.string().min(1, "Room name is required").max(100, "Room name is too long"),
  username: z.string().min(1, "Username is required").max(50, "Username is too long"),
  avatar: z.string().optional(),
});

const joinRoomSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username is too long"),
  avatar: z.string().optional(),
  participantId: z.string().optional(),
});

// POST /api/rooms - Create a new room
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createRoomSchema.parse(req.body);
    const result = await roomService.createRoom({
      roomName: validated.roomName,
      hostUsername: validated.username,
      avatar: validated.avatar,
    });

    res.status(201).json({
      room: result.room,
      participantId: result.host.id,
      inviteUrl: result.inviteUrl,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: {
          message: err.issues.map((e) => e.message).join(", "),
          code: "VALIDATION_ERROR",
        },
      });
      return;
    }
    next(err);
  }
});

// GET /api/rooms - List active rooms
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rooms = await roomService.listActiveRooms();
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id - Get a specific room
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params["id"];
    const roomId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!roomId) {
      res.status(400).json({ error: { message: "Room ID is required", code: "BAD_REQUEST" } });
      return;
    }
    const room = await roomService.getRoom(roomId);
    res.json({ room });
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms/:id/join - Join a room
router.post("/:id/join", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params["id"];
    const roomId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!roomId) {
      res.status(400).json({ error: { message: "Room ID is required", code: "BAD_REQUEST" } });
      return;
    }
    const validated = joinRoomSchema.parse(req.body);
    const result = await roomService.joinRoom({
      roomId,
      username: validated.username,
      avatar: validated.avatar,
      participantId: validated.participantId,
    });

    res.json({
      room: result.room,
      participantId: result.participant.id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: {
          message: err.issues.map((e) => e.message).join(", "),
          code: "VALIDATION_ERROR",
        },
      });
      return;
    }
    next(err);
  }
});

export const roomRouter: Router = router;
