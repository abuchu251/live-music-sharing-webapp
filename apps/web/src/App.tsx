import { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthModal } from "./features/auth/AuthModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LandingPage } from "./pages/LandingPage";
import { JoinRoomPage } from "./pages/JoinRoomPage";
import { ListeningRoomPage } from "./pages/ListeningRoomPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { FloatingMiniPlayer } from "./components/player/FloatingMiniPlayer";

export function App() {
  const location = useLocation();
  const roomMatch = location.pathname.match(/^\/room\/([^/]+)/);
  const currentRouteRoomId = roomMatch ? roomMatch[1] : null;

  // Active persistent room ID
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const initialMatch = window.location.pathname.match(/^\/room\/([^/]+)/);
    if (initialMatch && initialMatch[1]) return initialMatch[1];
    try {
      const raw = sessionStorage.getItem("synctune:active_room");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.roomId || null;
      }
    } catch {}
    return null;
  });

  const lastLeftRoomRef = useRef<string | null>(null);

  if (!currentRouteRoomId && lastLeftRoomRef.current) {
    lastLeftRoomRef.current = null;
  }

  // If navigating directly to a different room route, update activeRoomId synchronously
  if (
    currentRouteRoomId &&
    currentRouteRoomId !== activeRoomId &&
    currentRouteRoomId !== lastLeftRoomRef.current
  ) {
    setActiveRoomId(currentRouteRoomId);
  }

  // Listen for room left / closed events
  useEffect(() => {
    const handleRoomLeft = () => {
      if (currentRouteRoomId) {
        lastLeftRoomRef.current = currentRouteRoomId;
      }
      setActiveRoomId(null);
    };
    window.addEventListener("synctune:room_left", handleRoomLeft);
    return () => window.removeEventListener("synctune:room_left", handleRoomLeft);
  }, [currentRouteRoomId]);

  const isInsideRoom = Boolean(currentRouteRoomId && currentRouteRoomId === activeRoomId);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-surface text-on-surface antialiased selection:bg-primary selection:text-white">
          {/* Main App Routes (visible when outside an active full room view) */}
          <div className={isInsideRoom ? "hidden" : "block"}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/join" element={<JoinRoomPage />} />
              {!activeRoomId && (
                <Route path="/room/:roomId" element={<ListeningRoomPage />} />
              )}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>

          {/* Persistent Room Session (keeps audio playing continuously in background when navigating away) */}
          {activeRoomId && (
            <div
              key={activeRoomId}
              className={
                isInsideRoom
                  ? "block w-full min-h-screen"
                  : "fixed -left-[9999px] -top-[9999px] w-px h-px opacity-0 pointer-events-none overflow-hidden"
              }
              aria-hidden={!isInsideRoom}
            >
              <ListeningRoomPage roomIdOverride={activeRoomId} />
            </div>
          )}

          <AuthModal />
          <FloatingMiniPlayer />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
