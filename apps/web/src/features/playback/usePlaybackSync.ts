import { useEffect, useRef, useState, useCallback } from "react";
import type { PlaybackState, PlaybackCommand } from "@synctune/shared-types";
import type { YouTubePlayerHandle } from "../../components/player/YouTubePlayer";
import { getSocket } from "../../services/socket";

export interface PlaybackSyncOptions {
  playerRef: React.RefObject<YouTubePlayerHandle | null>;
  isHost: boolean;
  initialState: PlaybackState;
  onTrackChange?: (videoId: string) => void;
}

export type SyncStatus = "in-sync" | "correcting" | "buffering" | "paused";

export function usePlaybackSync({
  playerRef,
  isHost,
  initialState,
  onTrackChange,
}: PlaybackSyncOptions) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(initialState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("in-sync");
  const [currentDrift, setCurrentDrift] = useState<number>(0);
  const [isLocallyPaused, setIsLocallyPaused] = useState<boolean>(false);

  // Clock offset in ms between client and server (serverTime = Date.now() + clockOffset)
  const clockOffsetRef = useRef<number>(0);
  const isProgrammaticUpdateRef = useRef<boolean>(false);
  const consecutiveDriftRef = useRef<number>(0);
  const localRevisionRef = useRef<number>(initialState.revision);

  // Sync clock with server using NTP style ping/pong
  const syncServerTime = useCallback(() => {
    const socket = getSocket();
    if (!socket.connected) return;

    const t0 = Date.now();
    socket.emit("sync:time", t0, (res) => {
      const t1 = Date.now();
      const rtt = Math.max(0, t1 - t0);
      const serverNow = res.serverTime + rtt / 2;
      clockOffsetRef.current = serverNow - t1;
    });
  }, []);

  // Compute estimated current server time in ms
  const getEstimatedServerTime = useCallback(() => {
    return Date.now() + clockOffsetRef.current;
  }, []);

  // Compute expected playback position for a playing video
  const calculateExpectedPosition = useCallback(
    (state: PlaybackState): number => {
      if (state.status !== "playing") {
        return state.position;
      }
      const now = getEstimatedServerTime();
      const elapsedSeconds = Math.max(0, (now - state.updatedAt) / 1000);
      return state.position + elapsedSeconds;
    },
    [getEstimatedServerTime]
  );

  // Reconcile player against authoritative state
  const reconcilePlayer = useCallback(
    (targetState: PlaybackState) => {
      const player = playerRef.current;
      if (!player) return;

      isProgrammaticUpdateRef.current = true;

      try {
        const expectedPos = calculateExpectedPosition(targetState);
        const currentPos = player.getCurrentTime();
        const drift = Math.abs(currentPos - expectedPos);
        setCurrentDrift(drift);

        // Check video track change
        if (targetState.videoId && targetState.videoId !== playbackState.videoId) {
          if (onTrackChange) onTrackChange(targetState.videoId);
          player.loadVideo(targetState.videoId, Math.floor(expectedPos));
        }

        if (targetState.status === "playing") {
          // If listener is locally paused, respect their local pause
          if (!isHost && isLocallyPaused) {
            player.pause();
            setSyncStatus("paused");
            return;
          }

          // If paused locally, start playing
          const playerState = player.getPlayerState();
          if (playerState !== 1) { // 1 = PLAYING
            player.play();
          }

          // Drift threshold check
          if (drift > 1.5) {
            setSyncStatus("correcting");
            player.seekTo(expectedPos);
          } else {
            setSyncStatus("in-sync");
          }
        } else if (targetState.status === "paused") {
          player.pause();
          setSyncStatus("paused");
          setIsLocallyPaused(false);
          if (drift > 0.5) {
            player.seekTo(targetState.position);
          }
        }
      } catch (err) {
        console.error("[Sync] Reconciliation error:", err);
      } finally {
        setTimeout(() => {
          isProgrammaticUpdateRef.current = false;
        }, 400);
      }
    },
    [calculateExpectedPosition, onTrackChange, playbackState.videoId, playerRef]
  );

  // Listen to authoritative state updates from the server
  useEffect(() => {
    const socket = getSocket();

    const handleStateUpdate = (newState: PlaybackState) => {
      console.log(`[Sync] Received state-update [rev ${newState.revision}]: ${newState.status} @ ${newState.position.toFixed(2)}s`);

      // Reject stale out-of-order packets
      if (newState.revision <= localRevisionRef.current && newState.revision !== 0) {
        console.warn(`[Sync] Stale packet discarded: rev ${newState.revision} <= ${localRevisionRef.current}`);
        return;
      }

      localRevisionRef.current = newState.revision;
      setPlaybackState(newState);
      reconcilePlayer(newState);
    };

    socket.on("playback:state-update", handleStateUpdate);

    // Initial clock sync and interval
    syncServerTime();
    const clockInterval = setInterval(syncServerTime, 15000);

    return () => {
      socket.off("playback:state-update", handleStateUpdate);
      clearInterval(clockInterval);
    };
  }, [reconcilePlayer, syncServerTime]);

  // Periodic Drift Correction Engine (runs every 3s)
  useEffect(() => {
    const driftCheckInterval = setInterval(() => {
      if (isProgrammaticUpdateRef.current) return;
      if (playbackState.status !== "playing") return;
      if (!isHost && isLocallyPaused) return;

      const player = playerRef.current;
      if (!player) return;

      const expectedPos = calculateExpectedPosition(playbackState);
      const currentPos = player.getCurrentTime();
      const drift = Math.abs(currentPos - expectedPos);
      setCurrentDrift(drift);

      if (drift < 0.5) {
        // Under 0.5s: In sync
        consecutiveDriftRef.current = 0;
        setSyncStatus("in-sync");
      } else if (drift <= 1.5) {
        // 0.5s - 1.5s: Monitor
        consecutiveDriftRef.current += 1;
        if (consecutiveDriftRef.current >= 2) {
          // If drift persists for 2 consecutive cycles, gently seek
          setSyncStatus("correcting");
          player.seekTo(expectedPos);
          consecutiveDriftRef.current = 0;
        }
      } else {
        // Above 1.5s: Immediate seek correction
        setSyncStatus("correcting");
        player.seekTo(expectedPos);
        consecutiveDriftRef.current = 0;
      }
    }, 3000);

    return () => clearInterval(driftCheckInterval);
  }, [calculateExpectedPosition, playbackState, playerRef]);

  // Visibility change handler (re-sync after tab is focused)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncServerTime();
        if (playbackState.status === "playing") {
          reconcilePlayer(playbackState);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [playbackState, reconcilePlayer, syncServerTime]);

  // Host Command Dispatcher
  const sendHostCommand = useCallback(
    (commandType: PlaybackCommand["type"], payload?: PlaybackCommand["payload"]) => {
      if (!isHost) {
        console.warn("[Sync] Listener attempted to send host command - blocked locally.");
        return;
      }

      const socket = getSocket();
      const command: PlaybackCommand = {
        type: commandType,
        payload,
        revision: localRevisionRef.current,
      };

      console.log(`[Sync] Host emitting command: ${commandType}`, payload);

      socket.emit("playback:command", command, (res) => {
        if (!res.ok) {
          console.error(`[Sync] Command rejected by server: ${res.error}`);
        }
      });
    },
    [isHost]
  );

  const toggleLocalPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isLocallyPaused) {
      // Resume and immediately resync with authoritative room playback
      setIsLocallyPaused(false);
      const expectedPos = calculateExpectedPosition(playbackState);
      player.seekTo(expectedPos);
      if (playbackState.status === "playing") {
        player.play();
        setSyncStatus("in-sync");
      }
    } else {
      // Pause locally for this listener only
      setIsLocallyPaused(true);
      player.pause();
      setSyncStatus("paused");
    }
  }, [isLocallyPaused, calculateExpectedPosition, playbackState, playerRef]);

  const resyncToLive = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    setIsLocallyPaused(false);
    const expectedPos = calculateExpectedPosition(playbackState);
    player.seekTo(expectedPos);
    if (playbackState.status === "playing") {
      player.play();
      setSyncStatus("in-sync");
    }
  }, [calculateExpectedPosition, playbackState, playerRef]);

  return {
    playbackState,
    syncStatus,
    currentDrift,
    isLocallyPaused,
    isProgrammaticUpdate: isProgrammaticUpdateRef.current,
    toggleLocalPlayback,
    resyncToLive,
    sendPlay: (position?: number) => sendHostCommand("play", { position }),
    sendPause: (position?: number) => sendHostCommand("pause", { position }),
    sendSeek: (position: number) => sendHostCommand("seek", { position }),
    sendChangeVideo: (videoId: string, position: number = 0) =>
      sendHostCommand("change-video", { videoId, position }),
    sendNext: (videoId?: string) => sendHostCommand("next", { videoId }),
  };
}

