import React from "react";
import { Link, useLocation } from "react-router";
import { Radio, Plus, LogIn, Code2, LogOut, User as UserIcon } from "lucide-react";
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
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group transition-transform active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-md shadow-purple-600/30 group-hover:shadow-purple-600/50 transition-shadow">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              SyncTune
            </span>
          </div>
        </Link>

        {/* Center / Navigation items */}
        {!isRoomPage && (
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a
              href="/#how-it-works"
              className="hover:text-zinc-100 transition-colors"
            >
              How it works
            </a>
            <a
              href="/#features"
              className="hover:text-zinc-100 transition-colors"
            >
              Features
            </a>
            <a
              href="/#preview"
              className="hover:text-zinc-100 transition-colors"
            >
              Live Demo
            </a>
          </nav>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {!isRoomPage ? (
            <>
              {onJoinRoom && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<LogIn className="w-4 h-4" />}
                  onClick={onJoinRoom}
                >
                  Join Room
                </Button>
              )}
              {onCreateRoom && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={onCreateRoom}
                >
                  Create Room
                </Button>
              )}
            </>
          ) : (
            <Link to="/">
              <Button variant="ghost" size="sm">
                Exit Room
              </Button>
            </Link>
          )}

          {/* User Auth Status */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                title={user.email || user.username}
              >
                <span>{user.avatar || "🎧"}</span>
                <span className="font-medium text-zinc-200 max-w-[100px] truncate">
                  {user.username}
                </span>
                {user.isGuest && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-semibold">
                    Guest
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<UserIcon className="w-4 h-4" />}
              onClick={() => openAuthModal("login")}
            >
              Sign In
            </Button>
          )}

          <a
            href="https://github.com/abuchu251/live-music-sharing-webapp/issues/new?title=%5BContributor+Request%5D+I%27d+like+to+contribute+to+SyncTune&body=Hi+%40abuchu251%2C%0A%0AI+would+love+to+contribute+to+SyncTune%21%0A%0A%2A%2AWhat+I+would+like+to+help+with%3A%2A%2A+%0A%2A%2AMy+skills%2Fexperience%3A%2A%2A+%0A%2A%2AContact%2FDiscord%3A%2A%2A+"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-zinc-400 hover:text-purple-300 rounded-lg hover:bg-zinc-800/60 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Request to be a Contributor on GitHub"
            aria-label="Request to be a Contributor on GitHub"
          >
            <Code2 className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline text-xs text-zinc-300 hover:text-white">Contribute</span>
          </a>
        </div>
      </div>
    </header>
  );
};
