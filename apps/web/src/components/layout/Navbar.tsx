import React from "react";
import { Link, useLocation } from "react-router";
import { LogIn, LogOut, Code2, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";

export interface NavbarProps {
  onCreateRoom?: () => void;
  onJoinRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onCreateRoom, onJoinRoom }) => {
  const location = useLocation();
  const isRoomPage = location.pathname.startsWith("/room/");
  const { user, logout, openAuthModal } = useAuth();

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-[0_1px_8px_rgba(27,27,30,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 group transition-transform active:scale-98"
          >
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary font-bold text-base shadow-xs group-hover:bg-primary-container transition-colors">
              J
            </div>
            <span className="font-bold text-lg tracking-tight text-on-surface">
              Jemaw
            </span>
          </Link>

          {!isRoomPage && (
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a
                href="#our-story"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Our Story
              </a>
              <a
                href="#how-it-works"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                How it Works
              </a>
              <a
                href="#live-rooms"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Live Rooms
              </a>
            </nav>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* GitHub Contributor Link */}
          <a
            href="https://github.com/abuchu251/live-music-sharing-webapp/issues/new?title=Contributor+Request&body=Hi%2C+I+would+like+to+contribute+to+SyncTune."
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-tertiary hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Request to be a Contributor on GitHub"
          >
            <Code2 className="w-4 h-4" />
          </a>

          {!isRoomPage ? (
            <>
              {onJoinRoom && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onJoinRoom}
                >
                  Join Room
                </Button>
              )}
              {onCreateRoom && (
                <Button
                  variant="dark"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={onCreateRoom}
                >
                  Start a Room
                </Button>
              )}
            </>
          ) : (
            <Link to="/">
              <Button variant="secondary" size="sm">
                Exit Room
              </Button>
            </Link>
          )}

          {/* User Auth Status */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant">
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant text-xs"
                title={user.email || user.username}
              >
                <span>{user.avatar || "🎧"}</span>
                <span className="font-semibold text-on-surface max-w-[100px] truncate">
                  {user.username}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-tertiary hover:text-error transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={() => openAuthModal("login")}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
