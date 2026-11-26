import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Plus,
  Repeat,
  Radio,
  Link as LinkIcon,
  Music,
} from "lucide-react";
import { YouTubePlayer, type YouTubePlayerHandle } from "./YouTubePlayer";
import { extractYouTubeVideoId } from "../../utils/youtube";
import { usePlaybackSync } from "../../features/playback/usePlaybackSync";
import type { SongItem } from "../../features/room/mockData";
import type { PlaybackState, QueueItem } from "@synctune/shared-types";

export interface RoomPlayerProps {
  currentSong: QueueItem | SongItem | null;
  isHost: boolean;
  initialPlaybackState: PlaybackState;
  isPlaylistFinished?: boolean;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  onChangeVideo?: (videoId: string, title?: string) => void;
  onReplayPlaylist?: () => void;
  onOpenAddSong?: () => void;
}

const PRESET_TRACKS = [
  { id: "DWcJFNfaw9c", title: "🌆 Synthwave Radio" },
  { id: "5qap5aO4i9A", title: "🌿 Chillhop Beats" },
  { id: "4xDzrJKXOOY", title: "☕ Lofi Beats" },
];

export const RoomPlayer: React.FC<RoomPlayerProps> = ({
  currentSong,
  isHost,
  initialPlaybackState,
  isPlaylistFinished = false,
  onNextTrack,
  onPreviousTrack,
  onChangeVideo,
  onReplayPlaylist,
  onOpenAddSong,
}) => {
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentSong?.duration || 0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoPlayQueue, setAutoPlayQueue] = useState(true);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Real-Time Playback Synchronization Hook
  const {
    playbackState,
    syncStatus,
    currentDrift,
    isLocallyPaused,
    toggleLocalPlayback,
    resyncToLive,
    sendPlay,
    sendPause,
    sendSeek,
    sendChangeVideo,
  } = usePlaybackSync({
    playerRef,
    isHost,
    initialState: initialPlaybackState,
    onTrackChange: (newVideoId) => {
      if (onChangeVideo) {
        onChangeVideo(newVideoId);
      }
    },
  });

  const isRoomPlaying = playbackState.status === "playing";
  const isEffectivelyPlaying = isHost ? isRoomPlaying : isRoomPlaying && !isLocallyPaused;
  const activeVideoId = currentSong?.videoId || playbackState.videoId || "";
  const isQueueEmpty = !activeVideoId;

  // Reset timeline and duration when track switches
  useEffect(() => {
    setCurrentTime(0);
    if (currentSong?.duration && currentSong.duration > 0) {
      setDuration(currentSong.duration);
    } else {
      setDuration(0);
    }
  }, [currentSong?.id, currentSong?.videoId, activeVideoId]);

  const handleTogglePlay = () => {
    if (isHost) {
      if (isRoomPlaying) {
        sendPause();
      } else {
        sendPlay();
      }
    } else {
      toggleLocalPlayback();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    playerRef.current?.seekTo(newTime);
    sendSeek(newTime);
  };

  const handleSkipSeconds = (deltaSeconds: number) => {
    if (!isHost) return;
    const targetTime = Math.max(0, Math.min(currentTime + deltaSeconds, duration || 9999));
    setCurrentTime(targetTime);
    playerRef.current?.seekTo(targetTime);
    sendSeek(targetTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    playerRef.current?.setVolume(newVol);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      playerRef.current?.unMute();
      playerRef.current?.setVolume(volume);
    } else {
      setIsMuted(true);
      playerRef.current?.mute();
    }
  };

  const handleLoadCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHost) return;

    const extracted = extractYouTubeVideoId(customUrlInput.trim());
    if (!extracted) {
      setUrlError("Invalid YouTube URL. Please enter a valid watch or youtu.be link.");
      return;
    }

    setUrlError(null);
    sendChangeVideo(extracted, 0);
    if (onChangeVideo) {
      onChangeVideo(extracted);
    }
    setCustomUrlInput("");
    setShowUrlInput(false);
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div ref={containerRef} className="flex flex-col gap-3 w-full">
      {/* 1. Video Stage Container Card */}
      <div className="w-full bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs overflow-hidden flex flex-col">
        {/* Top Status Strip inside Video Frame */}
        <div className="px-4 py-2 bg-surface-container flex items-center justify-between border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-secondary font-mono text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${isQueueEmpty ? "bg-tertiary" : "bg-secondary animate-pulse"}`} />
              {isQueueEmpty
                ? "Queue Empty"
                : isLocallyPaused
                ? "Locally Paused"
                : syncStatus === "in-sync"
                ? isEffectivelyPlaying
                  ? "Synced (Playing)"
                  : "Synced (Paused)"
                : syncStatus === "correcting"
                ? "Re-synchronizing..."
                : "Buffering"}
            </span>

            {/* Soundwave Mini Indicator */}
            {!isQueueEmpty && isEffectivelyPlaying && (
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-2 bg-secondary equalizer-bar" />
                <span className="w-0.5 h-3 bg-secondary equalizer-bar" />
                <span className="w-0.5 h-1.5 bg-secondary equalizer-bar" />
                <span className="w-0.5 h-2.5 bg-secondary equalizer-bar" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-tertiary font-mono text-xs">
            <span className="hidden sm:inline">
              Drift: {isQueueEmpty ? "—" : currentDrift < 0.05 ? "<38ms" : `±${currentDrift.toFixed(2)}s`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleFullscreen}
                className="hover:text-on-surface p-1 rounded hover:bg-surface-container-high transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                type="button"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 16:9 Video Viewport */}
        <div className="relative w-full aspect-video bg-black overflow-hidden group">
          {isQueueEmpty ? (
            <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center p-6 text-center z-10 space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <Music className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-on-surface">Queue is empty</h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  {isHost
                    ? "Add songs to start the listening session. Search YouTube, paste a link, or pick a Quick Pick below."
                    : "Waiting for the host to add tracks to the queue. Hang tight!"}
                </p>
              </div>
              {isHost && onOpenAddSong && (
                <button
                  type="button"
                  onClick={onOpenAddSong}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-container text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Songs
                </button>
              )}
            </div>
          ) : (
            <>
              <YouTubePlayer
                ref={playerRef}
                videoId={activeVideoId}
                onTimeUpdate={(curr, dur) => {
                  setCurrentTime(curr);
                  if (dur > 0) setDuration(dur);
                }}
                onEnded={() => {
                  if (isHost && onNextTrack && autoPlayQueue) onNextTrack();
                }}
              />

              {/* Playlist Completed State Overlay */}
              {isPlaylistFinished && (
                <div className="absolute inset-0 bg-surface/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-4 animate-in fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                    <Radio className="w-7 h-7 text-primary" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-lg font-bold text-on-surface">Queue Completed</h3>
                    <p className="text-xs text-tertiary leading-relaxed">
                      All tracks in the shared queue have played. Replay from the beginning or drop more songs to keep listening together!
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {isHost && onReplayPlaylist && (
                      <button
                        type="button"
                        onClick={onReplayPlaylist}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-container text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Replay Queue
                      </button>
                    )}
                    {onOpenAddSong && (
                      <button
                        type="button"
                        onClick={onOpenAddSong}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-outline-variant shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" /> Add Songs
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Quick Picks Bar & Paste URL Drawer */}
      <div className="w-full bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs p-3 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <span className="text-xs font-semibold text-tertiary mr-1 shrink-0">Quick Picks:</span>
          {PRESET_TRACKS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                if (!isHost) return;
                sendChangeVideo(preset.id, 0);
                if (onChangeVideo) {
                  onChangeVideo(preset.id, preset.title);
                }
              }}
              disabled={!isHost}
              className={`px-2.5 py-1 rounded text-xs transition-colors shrink-0 cursor-pointer ${
                activeVideoId === preset.id
                  ? "bg-[#FFF7ED] text-primary border border-primary/50 font-semibold"
                  : "bg-surface-container hover:bg-surface-container-high text-on-surface border border-transparent"
              } ${!isHost ? "opacity-50 cursor-not-allowed" : ""}`}
              type="button"
            >
              {preset.title}
            </button>
          ))}
        </div>

        {isHost && (
          <button
            onClick={() => setShowUrlInput((prev) => !prev)}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            type="button"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{showUrlInput ? "Close Link Input" : "Paste YouTube Link"}</span>
          </button>
        )}
      </div>

      {/* Host Custom URL Input Box */}
      {isHost && showUrlInput && (
        <form onSubmit={handleLoadCustomUrl} className="w-full bg-surface-container-lowest rounded-lg border border-outline-variant p-3 shadow-xs flex flex-col gap-2 animate-in fade-in">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Paste any YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
              value={customUrlInput}
              onChange={(e) => {
                setCustomUrlInput(e.target.value);
                setUrlError(null);
              }}
              className="flex-1 text-xs rounded-lg bg-surface border border-outline-variant px-3 py-2 text-on-surface placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              autoFocus
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary-container text-white rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Broadcast Song
            </button>
          </div>
          {urlError && <p className="text-xs text-error font-medium">{urlError}</p>}
        </form>
      )}

      {/* 3. Transport & Progress Scrubber Deck */}
      <div className="w-full bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs p-3.5 sm:p-4 md:p-5 flex flex-col gap-3">
        {/* Interactive Progress Scrubber */}
        <div className="flex flex-col gap-1.5">
          <div className="relative group/scrub flex items-center cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!isHost || isQueueEmpty}
              className={`w-full h-2 rounded-lg appearance-none bg-surface-container accent-primary cursor-pointer focus:outline-none transition-all ${
                isHost && !isQueueEmpty ? "hover:h-2.5" : "cursor-not-allowed opacity-90"
              }`}
              style={{
                background: `linear-gradient(to right, #ea580c 0%, #ea580c ${progressPercent}%, #e4e1e6 ${progressPercent}%, #e4e1e6 100%)`,
              }}
            />
          </div>

          <div className="flex justify-between items-center font-mono text-xs text-tertiary font-medium">
            <span>{formatTime(currentTime)}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-tertiary/80">
              TIME ELAPSED
            </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls Row: Volume | Center Transport | Autoplay */}
        <div className="flex flex-col md:grid md:grid-cols-3 items-center gap-3 pt-2 border-t border-outline-variant/60">
          {/* Center: Precision Audio Controls (Mobile: First) */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-2 order-1 md:order-2 w-full md:w-auto">
            <button
              onClick={onPreviousTrack}
              disabled={!isHost || isQueueEmpty}
              className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-tertiary hover:bg-surface-container hover:text-on-surface transition-colors ${
                !isHost || isQueueEmpty ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              title={isQueueEmpty ? "Queue is empty" : isHost ? "Previous Track" : "Only Host can skip"}
              type="button"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSkipSeconds(-10)}
              disabled={!isHost || isQueueEmpty}
              className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-tertiary hover:bg-surface-container hover:text-on-surface transition-colors ${
                !isHost || isQueueEmpty ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              title={isQueueEmpty ? "Queue is empty" : isHost ? "Rewind 10 seconds" : "Only Host can seek"}
              type="button"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Big Solid Charcoal Master Play/Pause */}
            <button
              onClick={handleTogglePlay}
              disabled={isQueueEmpty}
              className={`w-13 h-13 sm:w-12 sm:h-12 rounded-full bg-on-surface hover:bg-black text-white flex items-center justify-center shadow-md transition-transform active:scale-95 ${
                isQueueEmpty ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
              title={
                isQueueEmpty
                  ? "Queue is empty"
                  : isHost
                  ? (isRoomPlaying ? "Pause for All" : "Play for All")
                  : (isLocallyPaused ? "Resume & Follow Room" : "Pause My Audio")
              }
              type="button"
            >
              {isEffectivelyPlaying && !isQueueEmpty ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => handleSkipSeconds(10)}
              disabled={!isHost || isQueueEmpty}
              className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-tertiary hover:bg-surface-container hover:text-on-surface transition-colors ${
                !isHost || isQueueEmpty ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              title={isQueueEmpty ? "Queue is empty" : isHost ? "Forward 10 seconds" : "Only Host can seek"}
              type="button"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={onNextTrack}
              disabled={!isHost || isQueueEmpty}
              className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-tertiary hover:bg-surface-container hover:text-on-surface transition-colors ${
                !isHost || isQueueEmpty ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              title={isQueueEmpty ? "Queue is empty" : isHost ? "Next Track" : "Only Host can skip"}
              type="button"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Left: Volume Slider (Mobile: Second) */}
          <div className="flex items-center justify-center md:justify-start gap-2.5 order-2 md:order-1 w-full md:w-auto">
            <button
              onClick={handleToggleMute}
              className="text-tertiary hover:text-on-surface transition-colors cursor-pointer p-1"
              type="button"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-error" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="w-28 sm:w-24 flex items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-2 sm:h-1.5 rounded bg-surface-container accent-on-surface cursor-pointer"
              />
            </div>
            <span className="font-mono text-xs text-tertiary w-8">
              {isMuted ? "0%" : `${volume}%`}
            </span>
          </div>

          {/* Right: Autoplay Toggle Pill (Mobile: Third) */}
          <div className="flex items-center justify-center md:justify-end gap-2 order-3 w-full md:w-auto">
            <button
              onClick={() => setAutoPlayQueue((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer select-none transition-colors ${
                autoPlayQueue ? "bg-[#FFF7ED] text-primary border border-primary/30" : "bg-surface-container text-tertiary"
              }`}
              title="Continuous auto-play for shared queue"
              type="button"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px] font-semibold uppercase">
                Autoplay {autoPlayQueue ? "On" : "Off"}
              </span>
            </button>
          </div>
        </div>

        {/* Listener Notification */}
        {!isHost && (
          <div className="flex items-center justify-center gap-2 pt-1 text-center text-xs text-tertiary">
            <span>
              {isLocallyPaused
                ? "You paused playback locally."
                : "Synchronized listening: Follows room live in real time."}
            </span>
            {isLocallyPaused && (
              <button
                onClick={resyncToLive}
                className="text-primary hover:underline font-semibold cursor-pointer"
                type="button"
              >
                Sync with Room Live →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
