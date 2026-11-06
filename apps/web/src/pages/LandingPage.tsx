import React, { useState } from "react";
import { Link } from "react-router";
import {
  Radio,
  Play,
  Users,
  Sparkles,
  Zap,
  ShieldCheck,
  Music2,
  Share2,
  ArrowRight,
  Disc,
} from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { CreateRoomModal } from "../features/room/CreateRoomModal";
import { JoinRoomModal } from "../features/room/JoinRoomModal";
import { MOCK_PUBLIC_ROOMS } from "../features/room/mockData";

export const LandingPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-purple-600 selection:text-white">
      {/* Sticky Header */}
      <Navbar
        onCreateRoom={() => setIsCreateOpen(true)}
        onJoinRoom={() => setIsJoinOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36">
          {/* Subtle glowing purple background blob */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/20 blur-[130px] -z-10 pointer-events-none rounded-full" />
          <div className="absolute top-1/3 left-1/3 w-[350px] h-[300px] bg-indigo-600/15 blur-[100px] -z-10 pointer-events-none rounded-full" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium">
              <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span>Real-Time YouTube Music Synchronization</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1]">
              Listen together.{" "}
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">
                Every beat in sync.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Create a listening room, invite your friends with a single link,
              and stream YouTube music videos with server-authoritative playback synchronization.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Play className="w-5 h-5 fill-current" />}
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto"
              >
                Create a Room — Free
              </Button>

              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Users className="w-5 h-5" />}
                onClick={() => setIsJoinOpen(true)}
                className="w-full sm:w-auto"
              >
                Join with Room Code
              </Button>
            </div>

            {/* Interactive Live Demo Preview Card */}
            <div id="preview" className="pt-10 max-w-4xl mx-auto">
              <Card
                variant="elevated"
                glow
                className="p-3 sm:p-5 border-zinc-800/80 bg-zinc-900/70"
              >
                <div className="flex items-center justify-between pb-3 px-1 border-b border-zinc-800/80 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                    <span className="font-semibold text-zinc-200">
                      Live Preview · Late Night Lo-Fi Room
                    </span>
                    <Badge variant="purple" size="sm">
                      Host: Maya
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline font-mono">14 listeners connected</span>
                    <Link
                      to="/room/preview-demo"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                    >
                      Enter Room <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  {/* Mock Video player in preview */}
                  <div className="md:col-span-2 relative aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800 group">
                    <img
                      src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80"
                      alt="Lo-Fi Room"
                      className="w-full h-full object-cover filter brightness-[0.75]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-between p-4">
                      <div className="flex justify-between items-start">
                        <Badge variant="purple" size="sm" dot>
                          In Perfect Sync (0.02s)
                        </Badge>
                        <span className="text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-zinc-400">
                          1080p
                        </span>
                      </div>
                      <div className="text-left space-y-1">
                        <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                          Now Streaming
                        </p>
                        <h4 className="text-base font-bold text-white">
                          lofi hip hop radio - beats to relax/study to
                        </h4>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full w-[45%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar peek in preview */}
                  <div className="space-y-2 text-left bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                        <span>Upcoming Queue</span>
                        <Disc className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 truncate">
                          1. Retro Synth / Neon Beats
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 truncate">
                          2. Cozy Coffee Shop Jazz
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 truncate">
                          3. Ambient Coding Session Vol. 4
                        </div>
                      </div>
                    </div>

                    <Link to="/room/preview-demo" className="w-full">
                      <Button variant="primary" size="sm" className="w-full">
                        Try Interactive Room
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-20 border-t border-zinc-900 bg-zinc-950/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            <div className="space-y-3 max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Simple & Frictionless
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                How SyncTune Works
              </h2>
              <p className="text-sm text-zinc-400">
                No browser extensions. No sign-ups required. No complex server setup.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-900/40">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Radio className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-mono text-purple-400">Step 01</span>
                  <h3 className="text-lg font-bold text-white">Create a Room</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Name your room, pick your avatar, and become the host. You hold playback controls to play, pause, seek, and queue tracks.
                </p>
              </Card>

              <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-900/40">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Share2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-mono text-indigo-400">Step 02</span>
                  <h3 className="text-lg font-bold text-white">Share Invitation</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Send your room link or unique room code to friends. Anyone can join instantly directly from any modern web browser.
                </p>
              </Card>

              <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-900/40">
                <div className="w-12 h-12 rounded-2xl bg-pink-600/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-mono text-pink-400">Step 03</span>
                  <h3 className="text-lg font-bold text-white">Listen in Sync</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  When the host plays, seeks, or pauses, every participant's YouTube player follows instantaneously with automated drift correction.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* FEATURE HIGHLIGHTS */}
        <section id="features" className="py-20 border-t border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Architecture & Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Engineered for High-Fidelity Sync
              </h2>
              <p className="text-sm text-zinc-400">
                Designed with a server-authoritative model so your group never falls out of sync.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-5 space-y-3 bg-zinc-900/30 border-zinc-800">
                <Zap className="w-6 h-6 text-amber-400" />
                <h4 className="text-base font-bold text-white">Server-Authoritative</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The backend maintains the authoritative clock and revision numbers, eliminating sync feedback loops.
                </p>
              </Card>

              <Card className="p-5 space-y-3 bg-zinc-900/30 border-zinc-800">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h4 className="text-base font-bold text-white">Official YouTube API</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  100% compliant with YouTube IFrame policies. Native player quality without downloading or stream proxying.
                </p>
              </Card>

              <Card className="p-5 space-y-3 bg-zinc-900/30 border-zinc-800">
                <Music2 className="w-6 h-6 text-purple-400" />
                <h4 className="text-base font-bold text-white">Collaborative Queue</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Listeners can suggest songs, view upcoming tracks, and chat while the host curates playback.
                </p>
              </Card>

              <Card className="p-5 space-y-3 bg-zinc-900/30 border-zinc-800">
                <Users className="w-6 h-6 text-indigo-400" />
                <h4 className="text-base font-bold text-white">Live Presence & Chat</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  See who is connected, check their synchronization status and ping, and share thoughts in room chat.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* DEMO ROOMS SHOWCASE */}
        <section className="py-20 border-t border-zinc-900 bg-zinc-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                  Explore Active Sessions
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Public Demo Rooms
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsJoinOpen(true)}
              >
                Join with custom code
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MOCK_PUBLIC_ROOMS.map((room) => (
                <Card
                  key={room.id}
                  variant="interactive"
                  className="p-5 space-y-4 border-zinc-800/80 bg-zinc-900/50"
                  onClick={() => {
                    window.location.href = `/room/${room.id}`;
                  }}
                >
                  <div className="flex items-start justify-between">
                    <Badge variant="purple" size="sm">
                      {room.genre}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{room.listenerCount} listening</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white truncate">
                      {room.name}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate mt-1">
                      🎵 {room.currentSong}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span>{room.hostAvatar}</span> Host: {room.host}
                    </span>
                    <span className="text-purple-400 font-medium group-hover:underline">
                      Join &rarr;
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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

