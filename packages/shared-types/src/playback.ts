// ─── Playback ─────────────────────────────────────────────

export type PlaybackStatus = "playing" | "paused" | "idle";

export interface PlaybackState {
  videoId: string | null;
  status: PlaybackStatus;
  position: number;
  updatedAt: number;
  revision: number;
}

export interface PlaybackCommand {
  type: "play" | "pause" | "seek" | "change-video" | "next";
  payload?: {
    videoId?: string;
    position?: number;
  };
  revision: number;
}

export function createInitialPlaybackState(): PlaybackState {
  return {
    videoId: null,
    status: "idle",
    position: 0,
    updatedAt: Date.now(),
    revision: 0,
  };
}

