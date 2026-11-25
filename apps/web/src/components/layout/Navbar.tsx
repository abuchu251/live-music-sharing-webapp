import React, { useState } from "react";
import { Link, useLocation } from "react-router";
import { LogIn, LogOut, Code2, Plus, Menu, X, KeyRound } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-[0_1px_8px_rgba(27,27,30,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
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
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* GitHub Contributor Link (desktop) */}
          <a
            href="https://github.com/abuchu251/live-music-sharing-webapp/issues/new?title=Contributor+Request&body=Hi%2C+I+would+like+to+contribute+to+SyncTune."
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex p-2 rounded-lg text-tertiary hover:text-on-surface hover:bg-surface-container transition-colors"
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
                  className="hidden sm:inline-flex text-xs px-3 py-1.5"
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
                  className="text-xs px-2.5 sm:px-3.5 py-1.5"
                >
                  <span>Start <span className="hidden xs:inline">Room</span></span>
                </Button>
              )}
            </>
          ) : (
            <Link to="/">
              <Button variant="secondary" size="sm" className="text-xs px-3">
                Exit Room
              </Button>
            </Link>
          )}

          {/* User Auth Status (desktop) */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-outline-variant">
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
              className="hidden sm:inline-flex text-xs"
            >
              Sign In
            </Button>
          )}

          {/* Mobile Menu Toggle Button */}
          {!isRoomPage && (
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Slide-down Drawer */}
      {!isRoomPage && mobileMenuOpen && (
        <div className="md:hidden bg-surface-container-lowest border-b border-outline-variant px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          <nav className="flex flex-col gap-2.5 text-sm font-medium">
            <a
              href="#our-story"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors"
            >
              Our Story
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors"
            >
              How it Works
            </a>
            <a
              href="#live-rooms"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors"
            >
              Live Rooms
            </a>
          </nav>

          <div className="pt-3 border-t border-outline-variant flex flex-col gap-2">
            {onJoinRoom && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onJoinRoom();
                }}
                className="w-full py-2.5 px-3 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-xs flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
              >
                <KeyRound className="w-4 h-4 text-tertiary" />
                <span>Enter Room Code</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container border border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="text-base">{user.avatar || "🎧"}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">{user.username}</span>
                    <span className="text-[10px] text-tertiary">{user.email}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1 text-xs text-error font-medium hover:bg-error/10 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal("login");
                }}
                className="w-full py-2.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4 text-tertiary" />
                <span>Sign In to Account</span>
              </button>
            )}

            <a
              href="https://github.com/abuchu251/live-music-sharing-webapp"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 text-center text-xs text-tertiary hover:text-on-surface transition-colors flex items-center justify-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Contribute on GitHub</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
