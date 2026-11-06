import React from "react";
import { Radio, Heart, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                SyncTune
              </span>
            </Link>
            <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
              Real-time synchronized YouTube music listening rooms. Listen to
              your favorite tracks together with friends anywhere in the world,
              in microsecond sync.
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-purple-400" /> YouTube IFrame API
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Server-Authoritative
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-zinc-200 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/join" className="hover:text-zinc-200 transition-colors">
                  Join a Room
                </Link>
              </li>
              <li>
                <Link to="/room/demo-room" className="hover:text-zinc-200 transition-colors">
                  Live Preview Room
                </Link>
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 mb-3">
              Policy & Legal
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              SyncTune uses the official YouTube IFrame Player API. We do not download,
              proxy, extract, or redistribute audio or video streams. All content and
              branding belong to YouTube and their respective copyright holders.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} SyncTune. Built with engineering precision.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> for shared music experiences
          </p>
        </div>
      </div>
    </footer>
  );
};

