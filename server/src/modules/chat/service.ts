import { nanoid } from "nanoid";
import type { ChatMessage } from "@synctune/shared-types";
import { AppError } from "../../middleware/errorHandler.js";
import { prisma, isDatabaseReady } from "../../db/prisma.js";

// Rate limiter state: Map<participantId, timestamp[]>
const rateLimitMap = new Map<string, number[]>();

export class ChatService {
  // In-memory message store: Map<roomId, ChatMessage[]>
  // Keeps up to 100 recent messages per room for fast retrieval and lightweight footprint
  private roomMessages = new Map<string, ChatMessage[]>();

  /**
   * Sanitizes message content while preserving natural punctuation like apostrophes.
   */
  private sanitizeContent(raw: string): string {
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Adds a message to the in-memory room buffer (capped at 100 messages).
   */
  addMessageToRoom(roomId: string, message: ChatMessage): void {
    const list = this.roomMessages.get(roomId) || [];
    list.push(message);
    if (list.length > 100) {
      list.shift();
    }
    this.roomMessages.set(roomId, list);

    // Asynchronously persist to PostgreSQL if DB connection is active
    if (isDatabaseReady()) {
      prisma.chatMessage
        .create({
          data: {
            id: message.id,
            roomId,
            senderId: message.senderId,
            senderUsername: message.senderUsername,
            senderAvatar: message.senderAvatar,
            content: message.content,
            isHost: message.isHost,
            createdAt: new Date(message.timestamp),
          },
        })
        .catch((err) => {
          console.warn(`[ChatService] Failed to persist message to DB:`, err?.message || err);
        });
    }
  }

  /**
   * Adds a system announcement message to the room chat history.
   */
  addSystemMessage(message: ChatMessage): void {
    this.addMessageToRoom(message.roomId, message);
  }

  /**
   * Retrieves recent messages for a room.
   */
  getMessages(roomId: string): ChatMessage[] {
    return this.roomMessages.get(roomId) || [];
  }

  /**
   * Clears in-memory messages when a room is permanently closed.
   */
  clearRoom(roomId: string): void {
    this.roomMessages.delete(roomId);
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

    const message: ChatMessage = {
      id: `chat-${nanoid(8)}`,
      roomId,
      senderId,
      senderUsername,
      senderAvatar,
      content: this.sanitizeContent(trimmed),
      timestamp: now,
      isHost,
    };

    this.addMessageToRoom(roomId, message);
    return message;
  }
}

export const chatService = new ChatService();
