import { describe, it, expect } from "vitest";
import { ChatService } from "../server/src/modules/chat/service.js";

describe("Room Chat Service", () => {
  const chatService = new ChatService();

  it("posts valid messages and returns structured ChatMessage", () => {
    const msg = chatService.postMessage({
      roomId: "room-1",
      senderId: "user-1",
      senderUsername: "Alice",
      senderAvatar: "🎧",
      isHost: true,
      content: "Hello everyone in the listening room!",
    });

    expect(msg.content).toBe("Hello everyone in the listening room!");
    expect(msg.senderUsername).toBe("Alice");
    expect(msg.isHost).toBe(true);
    expect(typeof msg.id).toBe("string");
    expect(typeof msg.timestamp).toBe("number");
  });

  it("sanitizes HTML tags and script injections to prevent XSS", () => {
    const msg = chatService.postMessage({
      roomId: "room-1",
      senderId: "user-2",
      senderUsername: "Attacker",
      senderAvatar: "👾",
      isHost: false,
      content: `<script>alert('xss')</script><img src="x" onerror="evil()" />`,
    });

    expect(msg.content).not.toContain("<script>");
    expect(msg.content).not.toContain("</script>");
    expect(msg.content).toContain("&lt;script&gt;");
    expect(msg.content).toContain("&lt;img src=&quot;x&quot;");
  });

  it("rejects empty or whitespace-only messages", () => {
    expect(() =>
      chatService.postMessage({
        roomId: "room-1",
        senderId: "user-3",
        senderUsername: "User",
        senderAvatar: "🎧",
        isHost: false,
        content: "   ",
      })
    ).toThrow("Message cannot be empty");
  });

  it("rejects messages exceeding 200 characters", () => {
    expect(() =>
      chatService.postMessage({
        roomId: "room-1",
        senderId: "user-4",
        senderUsername: "User",
        senderAvatar: "🎧",
        isHost: false,
        content: "A".repeat(201),
      })
    ).toThrow("Message exceeds 200 character limit");
  });

  it("enforces sliding-window anti-spam rate limiting (max 3 msgs / 5 sec)", () => {
    const spammerId = "spammer-999";
    const post = () =>
      chatService.postMessage({
        roomId: "room-1",
        senderId: spammerId,
        senderUsername: "Spammer",
        senderAvatar: "⚡",
        isHost: false,
        content: "Hello",
      });

    // 1st, 2nd, 3rd succeed
    expect(post()).toBeDefined();
    expect(post()).toBeDefined();
    expect(post()).toBeDefined();

    // 4th throws 429
    expect(() => post()).toThrow("Slow down! You are sending messages too quickly");
  });
});

