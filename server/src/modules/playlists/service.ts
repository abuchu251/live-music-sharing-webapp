import { getPlaylistRepository, IPlaylistRepository } from "./repository.js";
import type {
  Playlist,
  PlaylistTrack,
  CreatePlaylistRequest,
  AddTrackToPlaylistRequest,
} from "@synctune/shared-types";

export class PlaylistService {
  private repo: IPlaylistRepository;

  constructor(repo?: IPlaylistRepository) {
    this.repo = repo ?? getPlaylistRepository();
  }

  async createPlaylist(userId: string, req: CreatePlaylistRequest): Promise<Playlist> {
    const name = req.name.trim();
    if (!name || name.length > 50) {
      throw new Error("Playlist name must be between 1 and 50 characters");
    }

    return this.repo.create({
      name,
      description: req.description?.trim(),
      userId,
    });
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    return this.repo.findByUserId(userId);
  }

  async getPlaylist(playlistId: string, userId: string): Promise<Playlist> {
    const playlist = await this.repo.findById(playlistId);
    if (!playlist) {
      throw new Error("Playlist not found");
    }
    if (playlist.userId !== userId) {
      throw new Error("Unauthorized to access this playlist");
    }
    return playlist;
  }

  async addTrack(
    playlistId: string,
    userId: string,
    track: AddTrackToPlaylistRequest
  ): Promise<PlaylistTrack> {
    const playlist = await this.getPlaylist(playlistId, userId);
    return this.repo.addTrack({
      playlistId: playlist.id,
      videoId: track.videoId,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      thumbnailUrl: track.thumbnailUrl,
    });
  }

  async removeTrack(playlistId: string, trackId: string, userId: string): Promise<void> {
    await this.getPlaylist(playlistId, userId);
    const success = await this.repo.removeTrack(playlistId, trackId);
    if (!success) {
      throw new Error("Track not found in playlist");
    }
  }

  async deletePlaylist(playlistId: string, userId: string): Promise<void> {
    await this.getPlaylist(playlistId, userId);
    await this.repo.delete(playlistId);
  }
}

export const playlistService = new PlaylistService();

