import type {
  PlaybackState,
  PlaybackCommand,
} from "@synctune/shared-types";
import { IRoomRepository, roomRepository } from "../rooms/repository.js";
import { AppError } from "../../middleware/errorHandler.js";

export class PlaybackService {
  constructor(private repo: IRoomRepository = roomRepository) {}

  /**
   * Calculates the authoritative playback position in seconds at a given timestamp.
   */
  calculateCurrentPosition(state: PlaybackState, atTimestamp: number = Date.now()): number {
    if (state.status !== "playing") {
      return state.position;
    }

    const elapsedSeconds = Math.max(0, (atTimestamp - state.updatedAt) / 1000);
    return state.position + elapsedSeconds;
  }

  /**
   * Processes a host playback command, updates authoritative state,
   * increments revision number, and returns the new PlaybackState.
   */
  async processCommand(
    roomId: string,
    participantId: string,
    command: PlaybackCommand
  ): Promise<PlaybackState> {
    const room = await this.repo.findById(roomId);
    if (!room) {
      throw new AppError(404, `Room "${roomId}" not found.`, "ROOM_NOT_FOUND");
    }

    if (room.status === "closed") {
      throw new AppError(400, "Cannot change playback in a closed room.", "ROOM_CLOSED");
    }

    // Permission check: ONLY the host can control playback
    if (room.hostId !== participantId) {
      throw new AppError(
        403,
        "Unauthorized: Only the room host can control playback.",
        "FORBIDDEN"
      );
    }

    const current = room.currentPlaybackState;
    const now = Date.now();

    // Advance revision sequentially so legitimate host commands are never dropped
    const nextRevision = Math.max(current.revision, command.revision || 0) + 1;

    let nextState: PlaybackState;

    switch (command.type) {
      case "play": {
        const targetPos =
          command.payload?.position !== undefined
            ? Math.max(0, command.payload.position)
            : current.position;

        nextState = {
          videoId: command.payload?.videoId || current.videoId,
          status: "playing",
          position: targetPos,
          updatedAt: now,
          revision: nextRevision,
        };
        break;
      }

      case "pause": {
        // Freeze position at exact current elapsed time
        const currentElapsed = this.calculateCurrentPosition(current, now);
        const targetPos =
          command.payload?.position !== undefined
            ? Math.max(0, command.payload.position)
            : currentElapsed;

        nextState = {
          videoId: current.videoId,
          status: "paused",
          position: targetPos,
          updatedAt: now,
          revision: nextRevision,
        };
        break;
      }

      case "seek": {
        const targetPos = Math.max(0, command.payload?.position ?? 0);

        nextState = {
          videoId: current.videoId,
          status: current.status === "idle" ? "paused" : current.status,
          position: targetPos,
          updatedAt: now,
          revision: nextRevision,
        };
        break;
      }

      case "change-video": {
        const videoId = command.payload?.videoId;
        if (!videoId) {
          throw new AppError(400, "Video ID is required to change song.", "BAD_REQUEST");
        }

        nextState = {
          videoId,
          status: "playing",
          position: Math.max(0, command.payload?.position ?? 0),
          updatedAt: now,
          revision: nextRevision,
        };
        break;
      }

      case "next": {
        const videoId = command.payload?.videoId || current.videoId;

        nextState = {
          videoId,
          status: "playing",
          position: 0,
          updatedAt: now,
          revision: nextRevision,
        };
        break;
      }

      default:
        throw new AppError(400, `Unknown command type: ${(command as PlaybackCommand).type}`, "BAD_REQUEST");
    }

    // Persist updated playback state in the room
    room.currentPlaybackState = nextState;
    await this.repo.update(room);

    console.log(
      `[Playback] Room "${roomId}" state updated [rev ${nextState.revision}]: ${nextState.status} (videoId=${nextState.videoId}, pos=${nextState.position.toFixed(2)}s)`
    );

    return nextState;
  }
}

export const playbackService = new PlaybackService();

