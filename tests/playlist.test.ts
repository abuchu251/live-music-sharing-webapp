import { describe, it, expect, beforeEach } from "vitest";
import { PlaylistService } from "../server/src/modules/playlists/service.js";
import { InMemoryPlaylistRepository } from "../server/src/modules/playlists/repository.js";

describe("Playlist Management Service", () => {
  let service: PlaylistService;
  const userA = "user-alice-123";
  const userB = "user-bob-456";

  beforeEach(() => {
    const repo = new InMemoryPlaylistRepository();
    service = new PlaylistService(repo);
  });

  it("creates playlist and adds tracks", async () => {
    const playlist = await service.createPlaylist(userA, {
      name: "Synthwave Vibes",
      description: "Neon retro beats",
    });

    expect(playlist.name).toBe("Synthwave Vibes");
    expect(playlist.userId).toBe(userA);

    const track = await service.addTrack(playlist.id, userA, {
      videoId: "jfKfPfyJRdk",
      title: "Lofi Beats",
      artist: "Lofi Girl",
      duration: 300,
    });

    expect(track.playlistId).toBe(playlist.id);
    expect(track.videoId).toBe("jfKfPfyJRdk");

    const fetched = await service.getPlaylist(playlist.id, userA);
    expect(fetched.tracks.length).toBe(1);
  });

  it("prevents unauthorized users from accessing or modifying another user's playlist", async () => {
    const playlist = await service.createPlaylist(userA, {
      name: "Private Jams",
    });

    await expect(service.getPlaylist(playlist.id, userB)).rejects.toThrow(
      "Unauthorized to access this playlist"
    );

    await expect(
      service.addTrack(playlist.id, userB, {
        videoId: "xyz",
        title: "Unauthorized Track",
      })
    ).rejects.toThrow("Unauthorized to access this playlist");
  });

  it("removes tracks and deletes playlists", async () => {
    const playlist = await service.createPlaylist(userA, { name: "To Delete" });
    const track = await service.addTrack(playlist.id, userA, {
      videoId: "abc",
      title: "Track 1",
    });

    await service.removeTrack(playlist.id, track.id, userA);
    const updated = await service.getPlaylist(playlist.id, userA);
    expect(updated.tracks.length).toBe(0);

    await service.deletePlaylist(playlist.id, userA);
    await expect(service.getPlaylist(playlist.id, userA)).rejects.toThrow("Playlist not found");
  });
});

