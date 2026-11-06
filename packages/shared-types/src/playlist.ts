export interface PlaylistTrack {
  id: string;
  playlistId: string;
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnailUrl: string;
  order: number;
  addedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string | null;
  userId: string;
  tracks: PlaylistTrack[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlaylistRequest {
  name: string;
  description?: string;
}

export interface AddTrackToPlaylistRequest {
  videoId: string;
  title: string;
  artist?: string;
  duration?: number;
  thumbnailUrl?: string;
}

