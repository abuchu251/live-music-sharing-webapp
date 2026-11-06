import { Routes, Route } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthModal } from "./features/auth/AuthModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LandingPage } from "./pages/LandingPage";
import { JoinRoomPage } from "./pages/JoinRoomPage";
import { ListeningRoomPage } from "./pages/ListeningRoomPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-purple-600 selection:text-white">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/join" element={<JoinRoomPage />} />
            <Route path="/room/:roomId" element={<ListeningRoomPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <AuthModal />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}
