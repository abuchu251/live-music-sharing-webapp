import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Radio,
  Sparkles,
  Music,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import type { SongItem } from "../../features/room/mockData";

export interface MockPlayerProps {
  currentSong: SongItem | null;
  isHost: boolean;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  onAddSongPrompt?: () => void;
}

export const MockPlayer: React.FC<MockPlayerProps> = ({
  currentSong,
  isHost,
  onNextTrack,
  onPreviousTrack,
  onAddSongPrompt,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(48); // Mock 48s elapsed
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  const duration = currentSong?.duration || 215;

  // Mock ticking when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => (prev >= duration ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    setCurrentTime(Number(e.target.value));
  };

  const handleTogglePlay = () => {
    if (!isHost) return;
    setIsPlaying((prev) => !prev);
  };

  const handleSkipTime = (delta: number) => {
    if (!isHost) return;
    setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + delta)));
  };

  if (!currentSong) {
    return (
      <div className="w-full aspect-video rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center mb-4 text-zinc-400">
          <Music className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-1">
          No Video Currently Playing
        </h3>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          {isHost
            ? "Paste a YouTube link or choose from the queue to start listening together."
            : "Waiting for the host to select a song..."}
        </p>
        {isHost && onAddSongPrompt && (
          <button
            onClick={onAddSongPrompt}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Pick a Song to Play
          </button>
        )}
      </div>
    );
  }

  const progressPercent = (currentTime / duration) * 100;

  return (
    <div className="w-full space-y-4">
      {/* Video Container (YouTube Player Placeholder) */}
      <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl group">
        {/* Mock Video Backdrop with animated ambient blur */}
        <img
          src={currentSong.thumbnailUrl}
          alt={currentSong.title}
          className="w-full h-full object-cover filter brightness-[0.7] group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Ambient Dark Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-zinc-950/60" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm" dot>
              {isPlaying ? "Playing Synchronized" : "Paused by Host"}
            </Badge>
            <Badge variant="zinc" size="sm">
              YouTube IFrame HD
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full border border-zinc-800 backdrop-blur-sm">
              ID: {currentSong.videoId}
            </span>
          </div>
        </div>

        {/* Center Equalizer Wave when playing */}
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="flex items-end gap-1.5 h-12">
              <span className="equalizer-bar w-1.5 bg-purple-400 rounded-full" />
              <span className="equalizer-bar w-1.5 bg-indigo-400 rounded-full" />
              <span className="equalizer-bar w-1.5 bg-pink-400 rounded-full" />
              <span className="equalizer-bar w-1.5 bg-purple-400 rounded-full" />
            </div>
          </div>
        )}

        {/* Bottom Metadata in Player */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">
                Now Playing
              </span>
              <span className="text-xs text-zinc-500">•</span>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                Added by {currentSong.addedBy.avatar} {currentSong.addedBy.username}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight line-clamp-1 drop-shadow-md">
              {currentSong.title}
            </h2>
            <p className="text-xs md:text-sm text-zinc-300 drop-shadow">
              {currentSong.artist}
            </p>
          </div>
        </div>
      </div>

      {/* Playback Controls & Progress Bar Card */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 md:p-5 shadow-xl backdrop-blur-md space-y-3">
        {/* Scrubber / Progress Bar */}
        <div className="space-y-1">
          <div className="relative group/scrub flex items-center cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration}
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
              onClick={() => setIsMuted((prev) => !prev)}
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
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setIsMuted(false);
              }}
              className="w-full h-1 rounded-lg appearance-none bg-zinc-800 accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Center: Playback Buttons */}
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
              onClick={() => handleSkipTime(-10)}
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
              title={isHost ? (isPlaying ? "Pause" : "Play") : "Host controls playback"}
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
              onClick={() => handleSkipTime(10)}
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

          {/* Right: Sync Status / Fullscreen */}
          <div className="flex items-center justify-end gap-2 w-32 md:w-44">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-full border border-zinc-700/60">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Sync locked</span>
            </div>
            <button
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Non-host notice pill */}
        {!isHost && (
          <div className="text-center pt-1">
            <span className="text-[11px] text-zinc-500 italic">
              Playback is synchronized to the host. Sit back and enjoy the stream.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

