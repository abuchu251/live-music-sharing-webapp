import React from "react";
import { Link } from "react-router";
import { Radio, Music, Home } from "lucide-react";
import { Button } from "../components/ui/Button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface text-on-surface text-center relative overflow-hidden">
      <div className="max-w-md w-full bg-white border border-outline rounded-2xl p-8 shadow-sm space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-xs">
          <Music className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
            Status 404 · Session Not Found
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface font-sans">
            Lost in the Frequency
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            The listening room or studio page you are looking for has concluded, moved, or never existed.
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
              Back to Overview
            </Button>
          </Link>
          <Link to="/join" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Radio className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Browse Sessions
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
