import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  Room,
  User,
  AuthSessionUser,
  AuthResponse,
  GuestAuthResponse,
  LoginRequest,
  RegisterRequest,
  GuestAuthRequest,
  Playlist,
  PlaylistTrack,
  CreatePlaylistRequest,
  AddTrackToPlaylistRequest,
} from "@synctune/shared-types";

const API_BASE = "/api";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem("synctune_token");
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem("synctune_token", token);
    } else {
      localStorage.removeItem("synctune_token");
    }
  } catch {
    // localStorage might be unavailable
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg =
      body?.error?.message || body?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return (body?.data ?? body) as T;
}

export async function fetchHealth() {
  return request<{ status: string; timestamp: string; uptime: number; database?: string }>("/health");
}

// ─── Room Endpoints ─────────────────────────────────────────

export async function createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
  return request<CreateRoomResponse>("/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getRoom(roomId: string): Promise<{ room: Room }> {
  return request<{ room: Room }>(`/rooms/${roomId}`);
}

export async function joinRoom(
  roomId: string,
  data: JoinRoomRequest
): Promise<JoinRoomResponse> {
  return request<JoinRoomResponse>(`/rooms/${roomId}/join`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listActiveRooms(): Promise<{ rooms: Room[] }> {
  return request<{ rooms: Room[] }>("/rooms");
}

// ─── Auth Endpoints ─────────────────────────────────────────

export async function registerApi(data: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function loginApi(data: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function guestAuthApi(data: GuestAuthRequest): Promise<GuestAuthResponse> {
  return request<GuestAuthResponse>("/auth/guest", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMeApi(): Promise<User | AuthSessionUser> {
  return request<User | AuthSessionUser>("/auth/me");
}

// ─── Playlist Endpoints ─────────────────────────────────────

export async function getPlaylistsApi(): Promise<Playlist[]> {
  return request<Playlist[]>("/playlists");
}

export async function createPlaylistApi(data: CreatePlaylistRequest): Promise<Playlist> {
  return request<Playlist>("/playlists", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function addTrackToPlaylistApi(
  playlistId: string,
  data: AddTrackToPlaylistRequest
): Promise<PlaylistTrack> {
  return request<PlaylistTrack>(`/playlists/${playlistId}/tracks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deletePlaylistApi(playlistId: string): Promise<void> {
  return request<void>(`/playlists/${playlistId}`, {
    method: "DELETE",
  });
}
