export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string;
  role: "USER" | "ADMIN";
  isGuest?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSessionUser {
  id: string;
  username: string;
  avatar: string;
  email?: string;
  role?: "USER" | "ADMIN" | "GUEST";
  isGuest?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GuestAuthResponse {
  token: string;
  user: AuthSessionUser;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  avatar?: string;
}

export interface GuestAuthRequest {
  username?: string;
  avatar?: string;
}
