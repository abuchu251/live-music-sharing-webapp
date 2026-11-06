import { Router } from "express";
import { playlistService } from "./service.js";
import { authenticateUser } from "../../middleware/auth.js";
import { z } from "zod";

export const playlistRouter: Router = Router();

// All playlist routes require authentication
playlistRouter.use(authenticateUser);

const createPlaylistSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});

const addTrackSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().min(1).max(150),
  artist: z.string().max(100).optional(),
  duration: z.number().int().nonnegative().optional(),
  thumbnailUrl: z.string().optional(),
});

// GET /api/playlists
playlistRouter.get("/", async (req, res, next) => {
  try {
    const playlists = await playlistService.getUserPlaylists(req.user!.id);
    res.status(200).json({ success: true, data: playlists });
  } catch (error) {
    next(error);
  }
});

// POST /api/playlists
playlistRouter.post("/", async (req, res, next) => {
  try {
    const validated = createPlaylistSchema.parse(req.body);
    const playlist = await playlistService.createPlaylist(req.user!.id, validated);
    res.status(201).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
});

// GET /api/playlists/:id
playlistRouter.get("/:id", async (req, res, next) => {
  try {
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ success: false, error: "Playlist ID required" });
      return;
    }
    const playlist = await playlistService.getPlaylist(id, req.user!.id);
    res.status(200).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
});

// POST /api/playlists/:id/tracks
playlistRouter.post("/:id/tracks", async (req, res, next) => {
  try {
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ success: false, error: "Playlist ID required" });
      return;
    }
    const validated = addTrackSchema.parse(req.body);
    const track = await playlistService.addTrack(id, req.user!.id, validated);
    res.status(201).json({ success: true, data: track });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/playlists/:id/tracks/:trackId
playlistRouter.delete("/:id/tracks/:trackId", async (req, res, next) => {
  try {
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const rawTrackId = req.params["trackId"];
    const trackId = Array.isArray(rawTrackId) ? rawTrackId[0] : rawTrackId;
    if (!id || !trackId) {
      res.status(400).json({ success: false, error: "IDs required" });
      return;
    }
    await playlistService.removeTrack(id, trackId, req.user!.id);
    res.status(200).json({ success: true, message: "Track removed" });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/playlists/:id
playlistRouter.delete("/:id", async (req, res, next) => {
  try {
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ success: false, error: "Playlist ID required" });
      return;
    }
    await playlistService.deletePlaylist(id, req.user!.id);
    res.status(200).json({ success: true, message: "Playlist deleted" });
  } catch (error) {
    next(error);
  }
});

