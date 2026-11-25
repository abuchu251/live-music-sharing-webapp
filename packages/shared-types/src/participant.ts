// ─── Participant ───────────────────────────────────────────

export type ParticipantRole = "HOST" | "COHOST" | "LISTENER";

export interface Participant {
  id: string;
  username: string;
  avatar: string;
  role: ParticipantRole;
  connectedAt: number;
  isConnected: boolean;
}

