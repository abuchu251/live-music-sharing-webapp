import { describe, it, expect, beforeEach } from "vitest";
import { RoomService } from "../server/src/modules/rooms/service.js";
import { InMemoryRoomRepository } from "../server/src/modules/rooms/repository.js";

describe("Room Management & Collaborative Queue Service", () => {
  let repo: InMemoryRoomRepository;
  let roomService: RoomService;

  beforeEach(() => {
    repo = new InMemoryRoomRepository();
    roomService = new RoomService(repo);
  });

  it("creates a room with the creator designated as HOST", async () => {
    const { room, host } = await roomService.createRoom({
      roomName: "Lo-Fi Beats Study",
      hostUsername: "HostAlex",
      avatar: "🎧",
    });

    expect(room.name).toBe("Lo-Fi Beats Study");
    expect(room.hostId).toBe(host.id);
    expect(room.participants.length).toBe(1);
    expect(room.participants[0]?.role).toBe("HOST");
    expect(room.status).toBe("active");
  });

  it("allows listeners to join and updates member list", async () => {
    const { room } = await roomService.createRoom({
      roomName: "Study Room",
      hostUsername: "HostUser",
      avatar: "🎧",
    });

    const joinRes = await roomService.joinRoom({
      roomId: room.id,
      username: "ListenerBob",
      avatar: "🎵",
    });

    expect(joinRes.participant.id).toBeDefined();
    expect(joinRes.participant.role).toBe("LISTENER");

    const updated = await roomService.getRoom(room.id);
    expect(updated.participants.length).toBe(2);
  });

  it("handles host disconnection safely without silent privilege transfer", async () => {
    const { room, host } = await roomService.createRoom({
      roomName: "Host Recovery Room",
      hostUsername: "HostAlex",
      avatar: "🎧",
    });

    // Host disconnects
    const result = await roomService.setParticipantConnected(room.id, host.id, false);
    expect(result?.room.status).toBe("host-disconnected");
    expect(result?.room.hostId).toBe(host.id); // Host privileges preserved

    // Host reconnects
    const recovered = await roomService.setParticipantConnected(room.id, host.id, true);
    expect(recovered?.room.status).toBe("active");
  });

  it("collaborative queue: host and listener add tracks; permission rules strictly enforced", async () => {
    const { room, host } = await roomService.createRoom({
      roomName: "Queue Test",
      hostUsername: "HostAlex",
      avatar: "🎧",
    });

    const { participant: listener } = await roomService.joinRoom({
      roomId: room.id,
      username: "ListenerBob",
      avatar: "🎵",
    });

    // 1. Host adds track 1
    const { item: track1 } = await roomService.addQueueItem({
      roomId: room.id,
      participant: host,
      videoId: "video1",
      title: "Song 1",
    });
    expect(track1.title).toBe("Song 1");

    // 2. Listener adds track 2
    const { item: track2 } = await roomService.addQueueItem({
      roomId: room.id,
      participant: listener,
      videoId: "video2",
      title: "Song 2",
    });
    expect(track2.title).toBe("Song 2");

    // 3. Listener attempts to remove host's track 1 -> rejected 403
    await expect(
      roomService.removeQueueItem({
        roomId: room.id,
        participantId: listener.id,
        isHost: false,
        queueItemId: track1.id,
      })
    ).rejects.toThrow("You can only remove tracks that you added");

    // 4. Listener removes their own track 2 -> allowed
    const { room: roomAfterListenerRemove } = await roomService.removeQueueItem({
      roomId: room.id,
      participantId: listener.id,
      isHost: false,
      queueItemId: track2.id,
    });
    expect(roomAfterListenerRemove.queue.find((t) => t.id === track2.id)).toBeUndefined();

    // 5. Host can remove any track
    const { room: roomAfterHostRemove } = await roomService.removeQueueItem({
      roomId: room.id,
      participantId: host.id,
      isHost: true,
      queueItemId: track1.id,
    });
    expect(roomAfterHostRemove.queue.length).toBe(0);
  });
});
