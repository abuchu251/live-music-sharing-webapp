import { nanoid } from "nanoid";
import type { ChatMessage } from "@synctune/shared-types";
import { AppError } from "../../middleware/errorHandler.js";

// Rate limiter state: Map<participantId, timestamp[]>
const rateLimitMap = new Map<string, number[]>();

export class ChatService {
  /**
   * Sanitizes message content to prevent HTML / script injection attacks.
   */
  private sanitizeContent(raw: string): string {
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Validates and posts a chat message with anti-spam rate limiting.
   */
  postMessage(params: {
    roomId: string;
    senderId: string;
    senderUsername: string;
    senderAvatar: string;
    isHost: boolean;
    content: string;
  }): ChatMessage {
    const { roomId, senderId, senderUsername, senderAvatar, isHost, content } = params;

    const trimmed = content.trim();
    if (!trimmed) {
      throw new AppError(400, "Message cannot be empty.", "EMPTY_MESSAGE");
    }

    if (trimmed.length > 200) {
      throw new AppError(400, "Message exceeds 200 character limit.", "MESSAGE_TOO_LONG");
    }

    // Anti-spam protection: Max 3 messages per 5 seconds per participant
    const now = Date.now();
    const windowMs = 5000;
    const maxMessagesInWindow = 3;

    const timestamps = rateLimitMap.get(senderId) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= maxMessagesInWindow) {
      throw new AppError(
        429,
        "Slow down! You are sending messages too quickly.",
        "RATE_LIMITED"
      );
    }

    validTimestamps.push(now);
    rateLimitMap.set(senderId, validTimestamps);

    return {
      id: `chat-${nanoid(8)}`,
      roomId,
      senderId,
      senderUsername,
      senderAvatar,
      content: this.sanitizeContent(trimmed),
      timestamp: now,
      isHost,
    };
  }
}

export const chatService = new ChatService();

