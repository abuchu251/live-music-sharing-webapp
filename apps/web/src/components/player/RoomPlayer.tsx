import React, { useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Sparkles,
  Link as LinkIcon,
  Radio,
} from "lucide-react";
import { YouTubePlayer, type YouTubePlayerHandle } from "./YouTubePlayer";
import { Badge } from "../ui/Badge";
import { extractYouTubeVideoId } from "../../utils/youtube";
import { usePlaybackSync } from "../../features/playback/usePlaybackSync";
import type { SongItem } from "../../features/room/mockData";
import type { PlaybackState, QueueItem } from "@synctune/shared-types";

export interface RoomPlayerProps {
  currentSong: QueueItem | SongItem | null;
  isHost: boolean;
  initialPlaybackState: PlaybackState;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  onChangeVideo?: (videoId: string, title?: string) => void;
}

const PRESET_TRACKS = [
  { id: "jfKfPfyJRdk", title: "lofi hip hop radio - beats to relax/study to", artist: "Lofi Girl" },
  { id: "5qap5aO4i9A", title: "Lofi Hip Hop Radio 24/7 Chill Beats", artist: "ChilledCow" },
  { id: "DWcJFNfaw9c", title: "Synthwave Radio - Chill Synth / Retro Beats", artist: "Lofi Records" },
];

export const RoomPlayer: React.FC<RoomPlayerProps> = ({
  currentSong,
  isHost,
  initialPlaybackState,
  onNextTrack,
  onPreviousTrack,
  onChangeVideo,
}) => {
  const playerRef = useRef<YouTubePlayerHandle>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentSong?.duration || 0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  // Real-Time Playback Synchronization Hook
  const {
    playbackState,
    syncStatus,
    currentDrift,
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
        onChangeVideo(newVideoId, `YouTube Track (${newVideoId})`);
      }
    },
  });

  const isPlaying = playbackState.status === "playing";
  const activeVideoId = playbackState.videoId || currentSong?.videoId || "jfKfPfyJRdk";

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleTogglePlay = () => {
    if (!isHost) return;
    if (isPlaying) {
      sendPause(currentTime);
    } else {
      sendPlay(currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    const targetSeconds = Number(e.target.value);
    setCurrentTime(targetSeconds);
    sendSeek(targetSeconds);
  };

  const handleSkipSeconds = (delta: number) => {
    if (!isHost) return;
    const nextTime = Math.max(0, Math.min(duration, currentTime + delta));
    setCurrentTime(nextTime);
    sendSeek(nextTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    playerRef.current?.setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
      playerRef.current?.unMute();
    }
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleLoadCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractYouTubeVideoId(customUrlInput);
    if (!videoId) {
      setUrlError("Invalid YouTube URL or ID. Please check the link and try again.");
      return;
    }

    setUrlError(null);
    setCustomUrlInput("");
    setShowUrlInput(false);

    if (isHost) {
      sendChangeVideo(videoId, 0);
    }
    if (onChangeVideo) {
      onChangeVideo(videoId, `YouTube Video (${videoId})`);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full space-y-4">
      {/* Real YouTube Player Container */}
      <div className="relative w-full rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl group">
        <YouTubePlayer
          ref={playerRef}
          videoId={activeVideoId}
          autoplay={false}
          controls={true}
          onTimeUpdate={(curr, dur) => {
            setCurrentTime(curr);
            if (dur > 0) setDuration(dur);
          }}
          onEnded={() => {
            if (isHost && onNextTrack) onNextTrack();
          }}
        />

        {/* Top Badges Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                syncStatus === "in-sync"
                  ? "emerald"
                  : syncStatus === "correcting"
                  ? "amber"
                  : "purple"
              }
              size="sm"
              dot
            >
              {syncStatus === "in-sync"
                ? isPlaying
                  ? "Synchronized (Playing)"
                  : "Synchronized (Paused)"
                : syncStatus === "correcting"
                ? "Re-synchronizing..."
                : "Buffering"}
            </Badge>

            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full border border-zinc-800 backdrop-blur-sm">
              <Radio className="w-2.5 h-2.5 text-emerald-400" />
              Drift: {currentDrift < 0.05 ? "<50ms" : `±${currentDrift.toFixed(2)}s`}
            </span>
          </div>

          <span className="text-[11px] font-mono text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full border border-zinc-800 backdrop-blur-sm">
            ID: {activeVideoId} (rev {playbackState.revision})
          </span>
        </div>
      </div>

      {/* Host URL / Track Selector Drawer */}
      {isHost && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Host Controls: Select YouTube Stream</span>
            </span>
            <button
              onClick={() => setShowUrlInput((prev) => !prev)}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{showUrlInput ? "Hide Link Input" : "Paste YouTube Link"}</span>
            </button>
          </div>

          {showUrlInput && (
            <form onSubmit={handleLoadCustomUrl} className="space-y-2 animate-in fade-in">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste any YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    setUrlError(null);
                  }}
                  className="flex-1 text-xs rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  Broadcast Song
                </button>
              </div>
              {urlError && <p className="text-xs text-red-400">{urlError}</p>}
            </form>
          )}

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-zinc-500 text-[11px]">Quick Picks:</span>
            {PRESET_TRACKS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  sendChangeVideo(preset.id, 0);
                  if (onChangeVideo) {
                    onChangeVideo(preset.id, preset.title);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
                  activeVideoId === preset.id
                    ? "bg-purple-600/30 border-purple-500 text-purple-200"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {preset.title.split("-")[0]?.trim()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control Bar & Timestamp Scrubber */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 md:p-5 shadow-xl backdrop-blur-md space-y-3">
        {/* Scrubber / Progress Bar */}
        <div className="space-y-1">
          <div className="relative group/scrub flex items-center cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!isHost}
              className={`w-full h-1.5 rounded-lg appearance-none bg-zinc-800 accent-purple-500 cursor-pointer focus:outline-none transition-all ${
                isHost ? "hover:h-2.5" : "cursor-not-allowed opacity-80"
              }`}
              style={{
                background: `linear-gradient(to right, #9333ea 0%, #6366f1 ${progressPercent}%, #27272a ${progressPercent}%, #27272a 100%)`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between gap-4 pt-1">
          {/* Left: Volume */}
          <div className="flex items-center gap-2.5 w-32 md:w-44">
            <button
              onClick={handleToggleMute}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 rounded-lg appearance-none bg-zinc-800 accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={onPreviousTrack}
              disabled={!isHost}
              title={isHost ? "Previous Track" : "Only Host can skip"}
              className={`p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ${
                !isHost ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSkipSeconds(-10)}
              disabled={!isHost}
              title={isHost ? "Rewind 10s" : "Only Host can seek"}
              className={`p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ${
                !isHost ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Main Play/Pause Button */}
            <button
              onClick={handleTogglePlay}
              disabled={!isHost}
              title={isHost ? (isPlaying ? "Pause for All" : "Play for All") : "Host controls playback"}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all transform active:scale-95 ${
                !isHost
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  : isPlaying
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/40 cursor-pointer border border-purple-400/40"
                  : "bg-white text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-white/20 cursor-pointer"
              }`}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => handleSkipSeconds(10)}
              disabled={!isHost}
              title={isHost ? "Forward 10s" : "Only Host can seek"}
              className={`p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ${
                !isHost ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={onNextTrack}
              disabled={!isHost}
              title={isHost ? "Next Track" : "Only Host can skip"}
              className={`p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ${
                !isHost ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Authoritative Sync Pill */}
          <div className="flex items-center justify-end gap-2 w-32 md:w-44 text-xs font-mono text-zinc-400">
            <span className="capitalize">{isPlaying ? "Streaming" : "Paused"}</span>
          </div>
        </div>

        {/* Non-host information banner */}
        {!isHost && (
          <div className="text-center pt-1">
            <span className="text-[11px] text-zinc-500 italic">
              Synchronized listening mode: Playback follows the host in real time.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
