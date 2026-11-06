import { describe, it, expect, beforeEach } from "vitest";
import { PlaybackService } from "../server/src/modules/playback/service.js";
import { InMemoryRoomRepository } from "../server/src/modules/rooms/repository.js";
import type { Room } from "@synctune/shared-types";

describe("Authoritative Playback Service", () => {
  let repo: InMemoryRoomRepository;
  let service: PlaybackService;
  const mockRoomId = "room-test-123";
  const mockHostId = "user-host-123";

  beforeEach(async () => {
    repo = new InMemoryRoomRepository();
    service = new PlaybackService(repo);

    const testRoom: Room = {
      id: mockRoomId,
      name: "Playback Test Lounge",
      hostId: mockHostId,
      participants: [
        {
          id: mockHostId,
          username: "HostUser",
          avatar: "🎧",
          role: "HOST",
          connectedAt: Date.now(),
          isConnected: true,
        },
        {
          id: "listener-456",
          username: "ListenerBob",
          avatar: "🎵",
          role: "LISTENER",
          connectedAt: Date.now(),
          isConnected: true,
        },
      ],
      currentPlaybackState: {
        videoId: "jfKfPfyJRdk",
        status: "paused",
        position: 10,
        updatedAt: Date.now(),
        revision: 1,
      },
      queue: [],
      createdAt: Date.now(),
      status: "active",
      settings: { isPrivate: false, allowListenerQueue: true },
    };

    await repo.create(testRoom);
  });

  it("calculates expected playback position with elapsed time formula when playing", () => {
    const updatedAt = 100000;
    const state = {
      videoId: "jfKfPfyJRdk",
      status: "playing" as const,
      position: 15,
      updatedAt,
      revision: 1,
    };

    // 5 seconds later
    const pos = service.calculateCurrentPosition(state, updatedAt + 5000);
    expect(pos).toBe(20);

    // Negative / clock skew clamp to 0 elapsed
    const skewPos = service.calculateCurrentPosition(state, updatedAt - 1000);
    expect(skewPos).toBe(15);
  });

  it("maintains fixed position when state is paused", () => {
    const state = {
      videoId: "jfKfPfyJRdk",
      status: "paused" as const,
      position: 42.5,
      updatedAt: 100000,
      revision: 1,
    };

    const pos = service.calculateCurrentPosition(state, 200000);
    expect(pos).toBe(42.5);
  });

  it("executes host play command and increments revision", async () => {
    const next = await service.processCommand(mockRoomId, mockHostId, {
      type: "play",
      revision: 1,
      payload: { position: 10 },
    });

    expect(next.status).toBe("playing");
    expect(next.revision).toBe(2);
    expect(next.position).toBe(10);
  });

  it("executes host seek command accurately", async () => {
    const next = await service.processCommand(mockRoomId, mockHostId, {
      type: "seek",
      revision: 1,
      payload: { position: 125.4 },
    });

    expect(next.position).toBe(125.4);
    expect(next.revision).toBe(2);
  });

  it("executes host change-video command", async () => {
    const next = await service.processCommand(mockRoomId, mockHostId, {
      type: "change-video",
      revision: 1,
      payload: { videoId: "dQw4w9WgXcQ", position: 0 },
    });

    expect(next.videoId).toBe("dQw4w9WgXcQ");
    expect(next.status).toBe("playing");
    expect(next.revision).toBe(2);
  });

  it("strictly rejects commands issued by non-host listeners with 403 FORBIDDEN", async () => {
    await expect(
      service.processCommand(mockRoomId, "listener-456", {
        type: "play",
        revision: 1,
      })
    ).rejects.toThrow("Only the room host can control playback");
  });

  it("rejects commands with stale revisions", async () => {
    // Current is revision 1. Advance to 2
    await service.processCommand(mockRoomId, mockHostId, {
      type: "play",
      revision: 1,
    });

    // Stale command with rev 0
    const unchanged = await service.processCommand(mockRoomId, mockHostId, {
      type: "pause",
      revision: 0,
    });

    expect(unchanged.revision).toBe(2);
    expect(unchanged.status).toBe("playing"); // pause was ignored
  });
});

