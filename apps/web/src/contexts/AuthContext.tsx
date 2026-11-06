import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  User,
  AuthSessionUser,
  LoginRequest,
  RegisterRequest,
  GuestAuthRequest,
} from "@synctune/shared-types";
import {
  loginApi,
  registerApi,
  guestAuthApi,
  getMeApi,
  getStoredToken,
  setStoredToken,
} from "../services/api";

interface AuthContextType {
  user: User | AuthSessionUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  loginAsGuest: (data?: GuestAuthRequest) => Promise<void>;
  logout: () => void;
  authModalOpen: boolean;
  authModalMode: "login" | "register";
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | AuthSessionUser | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  // Load session from token on mount
  useEffect(() => {
    async function initSession() {
      const stored = getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await getMeApi();
        setUser(userData);
        setToken(stored);
      } catch {
        // Token expired or invalid
        setStoredToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await loginApi(data);
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
    setAuthModalOpen(false);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await registerApi(data);
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
    setAuthModalOpen(false);
  }, []);

  const loginAsGuest = useCallback(async (data?: GuestAuthRequest) => {
    const res = await guestAuthApi({
      username: data?.username || `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: data?.avatar || "🎧",
    });
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
    setAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const openAuthModal = useCallback((mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const isAuthenticated = Boolean(user && !user.isGuest);
  const isGuest = Boolean(user?.isGuest);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isGuest,
        isLoading,
        login,
        register,
        loginAsGuest,
        logout,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

