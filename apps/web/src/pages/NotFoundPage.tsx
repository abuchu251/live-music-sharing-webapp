import React from "react";
import { Link } from "react-router";
import { Radio, Music, Home } from "lucide-react";
import { Button } from "../components/ui/Button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 text-zinc-100 text-center relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-md w-full space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-purple-400 shadow-xl">
          <Music className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-purple-400">
            Error 404
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Lost in the Sound?
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The listening room or page you are looking for has closed, moved, or never existed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Home className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Back to Home
            </Button>
          </Link>
          <Link to="/join" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Radio className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Browse Rooms
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
