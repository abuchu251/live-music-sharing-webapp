import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Key,
  Radio,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  GripVertical,
  Clock,
  Shield,
  Layers,
} from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { CreateRoomModal } from "../features/room/CreateRoomModal";
import { JoinRoomModal } from "../features/room/JoinRoomModal";
import { MOCK_PUBLIC_ROOMS } from "../features/room/mockData";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isPlayingMock, setIsPlayingMock] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface antialiased">
      {/* Sticky Editorial Header */}
      <Navbar
        onCreateRoom={() => setIsCreateOpen(true)}
        onJoinRoom={() => setIsJoinOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 w-full pt-16">
        {/* SECTION 1: HERO & LIVE PLAYER STAGE MOCKUP */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {/* Monospace Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant shadow-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                SYNCED YOUTUBE LISTENING • NO EXTENSIONS NEEDED
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-on-surface mb-4 leading-[1.12]">
              Put the same song on.
              <br className="hidden sm:inline" />
              {" "}At the exact same millisecond.
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-tertiary max-w-2xl mx-auto mb-8 leading-relaxed">
              Create a room, drop a link, and listen to YouTube together in real time—built for desks, dorms, and long afternoons.
            </p>

            {/* CTA Action Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-14">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-primary hover:bg-primary-container text-white font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Create a Room — Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsJoinOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-semibold border border-outline-variant shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Key className="w-4 h-4 text-tertiary" />
                <span>Enter Room Code</span>
              </button>
            </div>
          </div>

          {/* Editorial Realistic Browser Window Mockup */}
          <div className="w-full mt-2 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-[0_4px_24px_rgba(27,27,30,0.06)] overflow-hidden">
            {/* Window Chrome Titlebar */}
            <div className="bg-surface-container-high px-4 py-3 flex items-center justify-between border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="ml-3 font-mono text-xs text-tertiary hidden sm:inline">
                  synctune.live/room/oak-desk-44
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container text-on-surface font-mono text-[11px] font-semibold border border-outline-variant">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  CLOCK SYNC LOCKED
                </span>
                <span className="font-mono text-[11px] text-tertiary hidden md:inline">
                  RTC-UDP • 60 FPS
                </span>
              </div>
            </div>

            {/* Studio Canvas: 8/4 Asymmetric Partition */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant bg-surface-container-low">
              {/* Left Stage & Controls (8 cols) */}
              <div className="lg:col-span-8 p-4 md:p-6 flex flex-col justify-between bg-surface-container-lowest">
                {/* Mockup Video Stage Area */}
                <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-xs bg-inverse-surface group">
                  <img
                    src="https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop"
                    alt="Rainy Tokyo minimalist oak desk setup with pour-over coffee and analog textures"
                    className="w-full h-full object-cover opacity-85"
                  />
                  {/* Video Overlay UI */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 flex flex-col justify-between p-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded bg-black/70 text-white font-mono text-xs flex items-center gap-1.5 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        YouTube IFrame Master
                      </span>
                      <span className="font-mono text-[11px] text-zinc-300 bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm">
                        1080p60 • Lossless Sync
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-white font-mono text-xs mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-white truncate">
                            Lofi Girl — 1 A.M Study Session [chill & lofi hip hop]
                          </span>
                          <span className="text-zinc-400 hidden sm:inline">• 12:44 / 34:10</span>
                        </div>
                        <span className="text-secondary font-semibold shrink-0">0.00s skew</span>
                      </div>

                      {/* Scrubber Bar */}
                      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden flex cursor-pointer">
                        <div className="bg-primary h-full w-[38%]" />
                        <div className="bg-secondary h-full w-[1%]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Telemetry & Controls Strip */}
                <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant">
                  {/* Micro-Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
                      title="Previous"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPlayingMock(!isPlayingMock)}
                      className="w-9 h-9 rounded bg-primary text-white flex items-center justify-center hover:bg-primary-container transition-colors shadow-xs"
                      title={isPlayingMock ? "Pause" : "Play"}
                    >
                      {isPlayingMock ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
                      title="Next"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-outline-variant mx-1" />
                    <span className="font-mono text-[11px] text-tertiary">
                      HOST: @SAM (AUTHORITY)
                    </span>
                  </div>

                  {/* Drift Chip */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded bg-surface-container text-on-surface border border-outline-variant">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-mono text-xs font-semibold text-secondary">&lt; 42ms drift</span>
                    <span className="font-mono text-xs text-tertiary hidden sm:inline">• 4 peer nodes aligned</span>
                  </div>
                </div>
              </div>

              {/* Right Queue & Peers (4 cols) */}
              <div className="lg:col-span-4 p-4 md:p-5 bg-surface-container-low flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm text-on-surface">Shared Queue</span>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                      4 TRACKS
                    </span>
                  </div>

                  {/* Queue Stack */}
                  <div className="flex flex-col gap-2">
                    {/* Active Track */}
                    <div className="p-2.5 rounded-lg bg-[#FFF7ED] border border-primary/40 relative overflow-hidden shadow-xs">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                      <div className="flex items-start justify-between gap-2 pl-2">
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider block">
                            NOW PLAYING
                          </span>
                          <p className="text-xs font-semibold text-on-surface truncate">
                            1 A.M Study Session
                          </p>
                          <p className="font-mono text-[11px] text-tertiary truncate">
                            Lofi Girl • req. by Elena
                          </p>
                        </div>
                        <span className="font-mono text-xs text-primary font-semibold shrink-0">
                          12:44
                        </span>
                      </div>
                    </div>

                    {/* Queued Track 1 */}
                    <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-tertiary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-on-surface truncate">
                            Lamp — 恋人へ (Koibito E)
                          </p>
                          <p className="font-mono text-[11px] text-tertiary">City Pop • Elena</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-tertiary shrink-0">3:42</span>
                    </div>

                    {/* Queued Track 2 */}
                    <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-tertiary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-on-surface truncate">
                            Idealism — Nagashi
                          </p>
                          <p className="font-mono text-[11px] text-tertiary">Lo-Fi • Marcus</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-tertiary shrink-0">2:18</span>
                    </div>

                    {/* Queued Track 3 */}
                    <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-3.5 h-3.5 text-tertiary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-on-surface truncate">
                            Jinsang — Herecme
                          </p>
                          <p className="font-mono text-[11px] text-tertiary">Beats • Priya</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-tertiary shrink-0">2:50</span>
                    </div>
                  </div>
                </div>

                {/* Connected Peers Strip */}
                <div className="pt-4 mt-4 border-t border-outline-variant">
                  <div className="flex items-center justify-between text-xs text-tertiary mb-2">
                    <span className="font-mono text-[11px] uppercase font-bold text-tertiary">
                      Peers Connected (4)
                    </span>
                    <span className="font-mono text-[11px] text-secondary font-semibold">All Synced</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                      S
                    </div>
                    <div className="w-6 h-6 rounded-full bg-secondary text-white text-[11px] font-bold flex items-center justify-center">
                      E
                    </div>
                    <div className="w-6 h-6 rounded-full bg-tertiary text-white text-[11px] font-bold flex items-center justify-center">
                      M
                    </div>
                    <div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface text-[11px] font-bold flex items-center justify-center">
                      P
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: LIVE ROOMS SHOWCASE */}
        <section id="live-rooms" className="w-full bg-surface-container-low border-t border-outline-variant py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
                  STUDIO ARCHIVE
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface mt-1">
                  Active Listening Rooms
                </h2>
                <p className="text-sm text-tertiary mt-1">
                  Drop into an open session or start your own studio space.
                </p>
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-semibold border border-outline-variant text-sm shadow-xs transition-colors"
              >
                + Create New Room
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MOCK_PUBLIC_ROOMS.map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    navigate(`/room/${room.id}`, {
                      state: {
                        roomName: room.name,
                        username: localStorage.getItem("synctune:pref:username") || "Listener",
                        avatar: localStorage.getItem("synctune:pref:avatar") || "🎧",
                        isHost: false,
                      },
                    });
                  }}
                  className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-xs hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-base text-on-surface group-hover:text-primary transition-colors">
                        {room.name}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-secondary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                        {room.listenerCount} LISTENING
                      </span>
                    </div>

                    <p className="text-xs text-tertiary leading-relaxed mb-4">
                      {room.genre} · Synchronized live studio session
                    </p>

                    <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-center gap-2 mb-4">
                      <span className="text-base">🎵</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">
                          {room.currentSong}
                        </p>
                        <p className="font-mono text-[10px] text-tertiary truncate">
                          Direct audio sync
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-surface-container-high flex items-center justify-center font-bold text-[10px] text-on-surface">
                        {room.hostAvatar || room.host.charAt(0)}
                      </div>
                      <span className="font-medium text-tertiary">
                        Curated by {room.host}
                      </span>
                    </div>
                    <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Tune in &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: HOW IT WORKS / PHILOSOPHY */}
        <section id="how-it-works" className="w-full py-20 bg-surface border-t border-outline-variant">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
                ENGINEERING TELEMETRY
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface mt-1">
                Built for true collective focus.
              </h2>
              <p className="text-tertiary text-sm mt-2 leading-relaxed">
                Rebuffering, drift-correction, and zero-account accessibility so you can share any track in seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-[#FFF7ED] text-primary flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-on-surface mb-2">
                  Precision Clock Synchronization
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Calculates network latency with NTP-style roundtrip pinging, automatically nudging playback if drift exceeds 50 milliseconds.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-on-surface mb-2">
                  Collaborative Real-Time Queue
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Anyone in the room can search or paste YouTube links to add to the playlist. Hosts can reorder tracks effortlessly with drag and drop.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-on-surface mb-2">
                  No Accounts, No Plugins Required
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  No Chrome extensions or Spotify accounts required. Runs entirely on official web APIs inside standard browser tabs.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <Footer />

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />
    </div>
  );
};
