import { prisma, isDatabaseReady } from "../../db/prisma.js";
import { nanoid } from "nanoid";
import type { Playlist, PlaylistTrack } from "@synctune/shared-types";

export interface CreatePlaylistData {
  name: string;
  description?: string;
  userId: string;
}

export interface AddTrackData {
  playlistId: string;
  videoId: string;
  title: string;
  artist?: string;
  duration?: number;
  thumbnailUrl?: string;
}

export interface IPlaylistRepository {
  findById(id: string): Promise<Playlist | null>;
  findByUserId(userId: string): Promise<Playlist[]>;
  create(data: CreatePlaylistData): Promise<Playlist>;
  delete(id: string): Promise<boolean>;
  addTrack(data: AddTrackData): Promise<PlaylistTrack>;
  removeTrack(playlistId: string, trackId: string): Promise<boolean>;
}

export class InMemoryPlaylistRepository implements IPlaylistRepository {
  private playlists = new Map<string, Playlist>();

  async findById(id: string): Promise<Playlist | null> {
    return this.playlists.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<Playlist[]> {
    return Array.from(this.playlists.values()).filter((p) => p.userId === userId);
  }

  async create(data: CreatePlaylistData): Promise<Playlist> {
    const now = new Date().toISOString();
    const playlist: Playlist = {
      id: nanoid(12),
      name: data.name,
      description: data.description ?? null,
      userId: data.userId,
      tracks: [],
      createdAt: now,
      updatedAt: now,
    };
    this.playlists.set(playlist.id, playlist);
    return playlist;
  }

  async delete(id: string): Promise<boolean> {
    return this.playlists.delete(id);
  }

  async addTrack(data: AddTrackData): Promise<PlaylistTrack> {
    const playlist = this.playlists.get(data.playlistId);
    if (!playlist) throw new Error("Playlist not found");

    const track: PlaylistTrack = {
      id: nanoid(10),
      playlistId: data.playlistId,
      videoId: data.videoId,
      title: data.title,
      artist: data.artist || "YouTube Stream",
      duration: data.duration || 0,
      thumbnailUrl: data.thumbnailUrl || "",
      order: playlist.tracks.length,
      addedAt: new Date().toISOString(),
    };

    playlist.tracks.push(track);
    playlist.updatedAt = new Date().toISOString();
    return track;
  }

  async removeTrack(playlistId: string, trackId: string): Promise<boolean> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;
    const initialLen = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter((t) => t.id !== trackId);
    playlist.updatedAt = new Date().toISOString();
    return playlist.tracks.length < initialLen;
  }
}

export class PrismaPlaylistRepository implements IPlaylistRepository {
  private formatTrack(t: {
    id: string;
    playlistId: string;
    videoId: string;
    title: string;
    artist: string;
    duration: number;
    thumbnailUrl: string;
    order: number;
    addedAt: Date;
  }): PlaylistTrack {
    return {
      id: t.id,
      playlistId: t.playlistId,
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      thumbnailUrl: t.thumbnailUrl,
      order: t.order,
      addedAt: t.addedAt.toISOString(),
    };
  }

  async findById(id: string): Promise<Playlist | null> {
    const p = await prisma.playlist.findUnique({
      where: { id },
      include: {
        tracks: {
          orderBy: { order: "asc" },
        },
      },
    });
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      userId: p.userId,
      tracks: p.tracks.map(this.formatTrack),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async findByUserId(userId: string): Promise<Playlist[]> {
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        tracks: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      userId: p.userId,
      tracks: p.tracks.map(this.formatTrack),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async create(data: CreatePlaylistData): Promise<Playlist> {
    const p = await prisma.playlist.create({
      data: {
        name: data.name,
        description: data.description,
        userId: data.userId,
      },
      include: { tracks: true },
    });
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      userId: p.userId,
      tracks: [],
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.playlist.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async addTrack(data: AddTrackData): Promise<PlaylistTrack> {
    const count = await prisma.playlistTrack.count({
      where: { playlistId: data.playlistId },
    });

    const track = await prisma.playlistTrack.create({
      data: {
        playlistId: data.playlistId,
        videoId: data.videoId,
        title: data.title,
        artist: data.artist || "YouTube Stream",
        duration: data.duration || 0,
        thumbnailUrl: data.thumbnailUrl || "",
        order: count,
      },
    });

    return this.formatTrack(track);
  }

  async removeTrack(playlistId: string, trackId: string): Promise<boolean> {
    try {
      await prisma.playlistTrack.deleteMany({
        where: { id: trackId, playlistId },
      });
      return true;
    } catch {
      return false;
    }
  }
}

let playlistRepoInstance: IPlaylistRepository | null = null;

export function getPlaylistRepository(): IPlaylistRepository {
  if (!playlistRepoInstance) {
    if (isDatabaseReady()) {
      playlistRepoInstance = new PrismaPlaylistRepository();
    } else {
      playlistRepoInstance = new InMemoryPlaylistRepository();
    }
  }
  return playlistRepoInstance;
}

