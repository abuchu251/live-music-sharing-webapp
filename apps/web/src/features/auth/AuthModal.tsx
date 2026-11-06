import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { User, Lock, Mail, Music2, Sparkles, AlertCircle } from "lucide-react";

const AVATAR_OPTIONS = ["🎧", "🎵", "🎸", "🎹", "🎤", "🎷", "🥁", "📻", "⚡", "🌟"];

export function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    loginAsGuest,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("🎧");
  const [guestName, setGuestName] = useState("");
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isGuestMode) {
        await loginAsGuest({ username: guestName || undefined, avatar });
      } else if (authModalMode === "login") {
        await login({ emailOrUsername: email, password });
      } else {
        await register({ email, username, password, avatar });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={authModalOpen}
      onClose={closeAuthModal}
      title={
        isGuestMode
          ? "Join as Guest"
          : authModalMode === "login"
          ? "Welcome Back"
          : "Create Your Account"
      }
    >
      <div className="space-y-5">
        {/* Toggle Mode Tabs (when not in guest mode) */}
        {!isGuestMode && (
          <div className="flex border-b border-zinc-800 pb-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                openAuthModal("login");
              }}
              className={`flex-1 pb-2 text-center text-sm font-semibold transition-colors ${
                authModalMode === "login"
                  ? "border-b-2 border-purple-500 text-purple-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                openAuthModal("register");
              }}
              className={`flex-1 pb-2 text-center text-sm font-semibold transition-colors ${
                authModalMode === "register"
                  ? "border-b-2 border-purple-500 text-purple-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isGuestMode ? (
            <div className="space-y-4">
              <Input
                label="Guest Display Name"
                placeholder="e.g. BeatsLover"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                leftIcon={<User className="h-4 w-4 text-zinc-400" />}
              />

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Select Avatar
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-transform ${
                        avatar === emoji
                          ? "border-2 border-purple-500 bg-purple-500/20 scale-110"
                          : "border border-zinc-700 bg-zinc-800 hover:scale-105"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : authModalMode === "login" ? (
            <div className="space-y-4">
              <Input
                label="Email or Username"
                type="text"
                placeholder="alex@synctune.com or alex"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="h-4 w-4 text-zinc-400" />}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<Lock className="h-4 w-4 text-zinc-400" />}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="alex@synctune.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="h-4 w-4 text-zinc-400" />}
              />

              <Input
                label="Username"
                type="text"
                placeholder="alex_beats"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                leftIcon={<User className="h-4 w-4 text-zinc-400" />}
              />

              <Input
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<Lock className="h-4 w-4 text-zinc-400" />}
              />

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Select Avatar
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-transform ${
                        avatar === emoji
                          ? "border-2 border-purple-500 bg-purple-500/20 scale-110"
                          : "border border-zinc-700 bg-zinc-800 hover:scale-105"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Music2 className="h-4 w-4 animate-spin" /> Processing...
              </span>
            ) : isGuestMode ? (
              "Enter as Guest"
            ) : authModalMode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        {/* Guest switch toggle */}
        <div className="pt-2 text-center">
          {isGuestMode ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsGuestMode(false);
              }}
              className="text-xs text-purple-400 hover:text-purple-300 hover:underline"
            >
              Already have an account? Sign In or Register
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsGuestMode(true);
              }}
              className="flex items-center justify-center gap-1.5 mx-auto text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Just browsing? Continue as Guest
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
