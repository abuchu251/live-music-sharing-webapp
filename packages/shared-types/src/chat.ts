// ─── Chat ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  isHost: boolean;
}
