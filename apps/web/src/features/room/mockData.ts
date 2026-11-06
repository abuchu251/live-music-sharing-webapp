export interface SongItem {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  thumbnailUrl: string;
  addedBy: {
    username: string;
    avatar: string;
  };
}

export interface MockParticipant {
  id: string;
  username: string;
  avatar: string;
  role: "HOST" | "LISTENER";
  status: "online" | "offline" | "buffering";
  ping: number; // in ms
}

export interface MockChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  avatar: string;
  content: string;
  timestamp: string;
  isHost?: boolean;
}

export const MOCK_QUEUE: SongItem[] = [
  {
    id: "song-1",
    videoId: "jfKfPfyJRdk",
    title: "lofi hip hop radio - beats to relax/study to",
    artist: "Lofi Girl",
    duration: 215,
    thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80",
    addedBy: { username: "Maya (Host)", avatar: "🎧" },
  },
  {
    id: "song-2",
    videoId: "5qap5aO4i9A",
    title: "Lofi Hip Hop Radio 24/7 Chill Beats",
    artist: "ChilledCow Recordings",
    duration: 184,
    thumbnailUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80",
    addedBy: { username: "David", avatar: "🎸" },
  },
  {
    id: "song-3",
    videoId: "DWcJFNfaw9c",
    title: "Synthwave Radio - Chill Synth / Retro Beats",
    artist: "Lofi Records",
    duration: 240,
    thumbnailUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80",
    addedBy: { username: "Elena", avatar: "✨" },
  },
  {
    id: "song-4",
    videoId: "rUxyKA_-dbg",
    title: "Cozy Coffee Shop Ambience & Smooth Jazz",
    artist: "Cafe Music BGM",
    duration: 310,
    thumbnailUrl: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=400&auto=format&fit=crop&q=80",
    addedBy: { username: "Maya (Host)", avatar: "🎧" },
  },
];

export const MOCK_PARTICIPANTS: MockParticipant[] = [
  {
    id: "user-1",
    username: "Maya",
    avatar: "🎧",
    role: "HOST",
    status: "online",
    ping: 24,
  },
  {
    id: "user-2",
    username: "David",
    avatar: "🎸",
    role: "LISTENER",
    status: "online",
    ping: 38,
  },
  {
    id: "user-3",
    username: "Elena",
    avatar: "✨",
    role: "LISTENER",
    status: "online",
    ping: 45,
  },
  {
    id: "user-4",
    username: "Liam",
    avatar: "👾",
    role: "LISTENER",
    status: "buffering",
    ping: 112,
  },
  {
    id: "user-5",
    username: "Sophia",
    avatar: "🎹",
    role: "LISTENER",
    status: "online",
    ping: 19,
  },
];

export const MOCK_CHAT: MockChatMessage[] = [
  {
    id: "chat-1",
    senderId: "user-1",
    senderUsername: "Maya",
    avatar: "🎧",
    content: "Welcome everyone! Grab a tea and enjoy the chill vibes ☕",
    timestamp: "10:32 AM",
    isHost: true,
  },
  {
    id: "chat-2",
    senderId: "user-2",
    senderUsername: "David",
    avatar: "🎸",
    content: "This beat is immaculate! Synced perfectly.",
    timestamp: "10:33 AM",
  },
  {
    id: "chat-3",
    senderId: "user-3",
    senderUsername: "Elena",
    avatar: "✨",
    content: "Added a synthwave track to upcoming queue!",
    timestamp: "10:35 AM",
  },
  {
    id: "chat-4",
    senderId: "user-4",
    senderUsername: "Liam",
    avatar: "👾",
    content: "Sound quality is super crisp. Love the synchronized player.",
    timestamp: "10:36 AM",
  },
];

export const MOCK_PUBLIC_ROOMS = [
  {
    id: "lofi-cafe-101",
    name: "Midnight Coffee & Chillhop",
    host: "Maya",
    hostAvatar: "🎧",
    listenerCount: 14,
    currentSong: "lofi hip hop radio - beats to relax/study to",
    genre: "Lo-Fi / Chillhop",
  },
  {
    id: "synth-drive-80s",
    name: "Retro Synth & Neon Drive",
    host: "Marcus",
    hostAvatar: "👾",
    listenerCount: 8,
    currentSong: "Nightcall / Kavinsky Synthwave Remaster",
    genre: "Synthwave",
  },
  {
    id: "deep-focus-code",
    name: "Deep Focus for Developers",
    host: "Elena",
    hostAvatar: "✨",
    listenerCount: 22,
    currentSong: "Ambient Coding Session Vol. 4",
    genre: "Ambient",
  },
];

