import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { AlertCircle, Play, Loader2, Volume2 } from "lucide-react";
import { loadYouTubeIFrameAPI } from "../../services/youtubeLoader";
import { getYouTubeErrorMessage } from "../../utils/youtube";

export interface YouTubePlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => YT.PlayerState | null;
  loadVideo: (videoId: string, startSeconds?: number) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
}

export interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  controls?: boolean;
  startSeconds?: number;
  onReady?: (player: YouTubePlayerHandle) => void;
  onStateChange?: (state: YT.PlayerState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (errorMessage: string, errorCode: number) => void;
  className?: string;
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  (
    {
      videoId,
      autoplay = false,
      controls = false,
      startSeconds = 0,
      onReady,
      onStateChange,
      onTimeUpdate,
      onEnded,
      onError,
      className = "",
    },
    ref
  ) => {
    // playerMountRef is completely unmanaged by React VDOM reconciliation
    const playerMountRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YT.Player | null>(null);
    const timeIntervalRef = useRef<number | null>(null);
    const currentVideoIdRef = useRef<string>(videoId);
    currentVideoIdRef.current = videoId;

    const [isApiLoading, setIsApiLoading] = useState(true);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);

    // Stop time polling timer
    const stopTimeTracking = useCallback(() => {
      if (timeIntervalRef.current) {
        window.clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    }, []);

    // Start time polling timer (fires onTimeUpdate every 500ms when playing)
    const startTimeTracking = useCallback(() => {
      stopTimeTracking();
      timeIntervalRef.current = window.setInterval(() => {
        if (playerRef.current && isPlayerReady) {
          try {
            const current = playerRef.current.getCurrentTime() || 0;
            const dur = playerRef.current.getDuration() || 0;
            if (onTimeUpdate) {
              onTimeUpdate(current, dur);
            }
          } catch {
            // Player may be unmounting
          }
        }
      }, 500);
    }, [isPlayerReady, onTimeUpdate, stopTimeTracking]);

    // Imperative API handle
    const playerHandle: YouTubePlayerHandle = {
      play: () => {
        try {
          playerRef.current?.playVideo();
          setAutoplayBlocked(false);
        } catch (e) {
          console.error("Failed to play video:", e);
        }
      },
      pause: () => {
        try {
          playerRef.current?.pauseVideo();
        } catch (e) {
          console.error("Failed to pause video:", e);
        }
      },
      seekTo: (seconds: number) => {
        try {
          playerRef.current?.seekTo(seconds, true);
        } catch (e) {
          console.error("Failed to seek video:", e);
        }
      },
      getCurrentTime: () => {
        try {
          return playerRef.current?.getCurrentTime() || 0;
        } catch {
          return 0;
        }
      },
      getDuration: () => {
        try {
          return playerRef.current?.getDuration() || 0;
        } catch {
          return 0;
        }
      },
      getPlayerState: () => {
        try {
          return playerRef.current?.getPlayerState() ?? null;
        } catch {
          return null;
        }
      },
      loadVideo: (newVideoId: string, startSec = 0) => {
        try {
          setPlayerError(null);
          playerRef.current?.loadVideoById(newVideoId, startSec);
        } catch (e) {
          console.error("Failed to load video:", e);
        }
      },
      setVolume: (vol: number) => {
        try {
          playerRef.current?.setVolume(vol);
        } catch (e) {
          console.error("Failed to set volume:", e);
        }
      },
      mute: () => {
        try {
          playerRef.current?.mute();
        } catch (e) {
          console.error("Failed to mute:", e);
        }
      },
      unMute: () => {
        try {
          playerRef.current?.unMute();
        } catch (e) {
          console.error("Failed to unmute:", e);
        }
      },
      isMuted: () => {
        try {
          return playerRef.current?.isMuted() || false;
        } catch {
          return false;
        }
      },
    };

    useImperativeHandle(ref, () => playerHandle);

    // Initialize YouTube Player once, then switch videos smoothly without re-mounting
    useEffect(() => {
      let isMounted = true;
      const mount = playerMountRef.current;
      if (!mount) return;

      // If player already initialized, just load the new video smoothly!
      if (playerRef.current && isPlayerReady) {
        try {
          playerRef.current.loadVideoById(videoId, startSeconds);
          setPlayerError(null);
        } catch {
          // If player was in broken state, recreate below
        }
        return;
      }

      // Create an isolated unmanaged child DOM element for YT to replace
      mount.innerHTML = "";
      const ytTarget = document.createElement("div");
      ytTarget.id = `yt-frame-${Math.random().toString(36).substring(2, 9)}`;
      ytTarget.style.width = "100%";
      ytTarget.style.height = "100%";
      mount.appendChild(ytTarget);

      loadYouTubeIFrameAPI()
        .then((YT) => {
          if (!isMounted) return;
          setIsApiLoading(false);

          playerRef.current = new YT.Player(ytTarget, {
            videoId,
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: autoplay ? 1 : 0,
              controls: controls ? 1 : 0,
              enablejsapi: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              start: startSeconds,
            },
            events: {
              onReady: () => {
                if (!isMounted) return;
                setIsPlayerReady(true);
                if (onReady) onReady(playerHandle);
                if (autoplay) {
                  try {
                    playerRef.current?.playVideo();
                  } catch {
                    setAutoplayBlocked(true);
                  }
                }
              },
              onStateChange: (event) => {
                if (!isMounted) return;
                const state = event.data;

                if (state === YT.PlayerState.PLAYING) {
                  startTimeTracking();
                  setAutoplayBlocked(false);
                } else {
                  stopTimeTracking();
                }

                if (state === YT.PlayerState.ENDED) {
                  if (onEnded) onEnded();
                }

                if (onStateChange) onStateChange(state);
              },
              onError: (event) => {
                if (!isMounted) return;
                const message = getYouTubeErrorMessage(event.data);
                setPlayerError(message);
                if (onError) onError(message, event.data);
              },
              onAutoplayBlocked: () => {
                if (!isMounted) return;
                setAutoplayBlocked(true);
              },
            },
          });
        })
        .catch((err: Error) => {
          if (!isMounted) return;
          setIsApiLoading(false);
          setPlayerError(err.message);
          if (onError) onError(err.message, -1);
        });

      return () => {
        isMounted = false;
        stopTimeTracking();
        try {
          playerRef.current?.destroy();
          playerRef.current = null;
        } catch {
          // Ignore destroy cleanup errors
        }
        if (mount) {
          mount.innerHTML = "";
        }
      };
    }, [videoId]);

    return (
      <div
        className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl ${className}`}
      >
        {/* Loading Spinner */}
        {isApiLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-20 space-y-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-xs text-zinc-400">Loading YouTube IFrame Player...</p>
          </div>
        )}

        {/* Error Overlay */}
        {playerError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md z-30 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white">Playback Error</h4>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              {playerError}
            </p>
          </div>
        )}

        {/* Autoplay Blocked Gesture Overlay */}
        {autoplayBlocked && !playerError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-30 space-y-4 p-4 text-center">
            <Volume2 className="w-8 h-8 text-purple-400 animate-bounce" />
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Click to Enable Audio</h4>
              <p className="text-xs text-zinc-300 max-w-xs">
                Your browser requires a click to play synchronized sound.
              </p>
            </div>
            <button
              onClick={() => {
                playerHandle.play();
                playerHandle.unMute();
                setAutoplayBlocked(false);
              }}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              Listen Now
            </button>
          </div>
        )}

        {/* Dedicated Player Mount Container (isolated from React Virtual DOM) */}
        <div ref={playerMountRef} className="w-full h-full" />
      </div>
    );
  }
);

YouTubePlayer.displayName = "YouTubePlayer";
