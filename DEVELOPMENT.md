# SyncTune Development Log & Architecture Record

## Completed Work

### Milestone 1: Project Initialization & Monorepo Setup (Completed)
- **Monorepo architecture established**: Set up root configuration with `pnpm workspaces` across `apps/*`, `server`, and `packages/*`.
- **Root tooling**: Configured `pnpm-workspace.yaml`, `tsconfig.base.json` (strict TypeScript with ES2022 target, bundler resolution), `.gitignore`, and `.env.example`.
- **Shared Types package (`@synctune/shared-types`)**:
  - `Participant` and `ParticipantRole` ("HOST" | "LISTENER", presence flag)
  - `PlaybackState`, `PlaybackStatus`, `PlaybackCommand`, `createInitialPlaybackState()`
  - `Room`, `RoomStatus`, `CreateRoomRequest/Response`, `JoinRoomRequest/Response`
  - `ChatMessage`
  - `ClientToServerEvents`, `ServerToClientEvents`, `InterServerEvents`, `SocketData`
  - Configured composite project references and declaration emit.
- **Backend Server (`@synctune/server`)**:
  - Express 5.0 application factory (`createApp`)
  - Socket.IO 4.8 server attached to HTTP server with typed event contracts
  - CORS middleware configured via environment variables
  - Centralized `errorHandler` middleware and `AppError` class
  - `/api/health` monitoring endpoint returning uptime and ISO timestamp
  - Graceful process shutdown handling (`SIGINT`, `SIGTERM`)
- **Frontend Web Application (`@synctune/web`)**:
  - React 19 + TypeScript + Vite 6
  - Tailwind CSS v4 configured via `@tailwindcss/vite`
  - React Router v7 configured with route structure (`/`, `*`)
  - Socket.IO client singleton service (`services/socket.ts`) with typed socket client
  - API service layer (`services/api.ts`)
  - Dark-themed landing page shell connecting to `/api/health`
  - Vite development proxy for `/api` and `/socket.io` to Express backend (port 3001)

### Milestone 2: Frontend UI & Design System (Completed)
- **Design System & Theme**:
  - Premium dark theme with deep zinc charcoal background (`#09090b`), purple-to-indigo gradients, and glassmorphism cards.
  - Custom scrollbar styling and animated equalizer CSS keyframe animations.
  - Reusable UI component library:
    - `Button`: Variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), sizes, loading spinner, and icon slots.
    - `Input`: Label, helper text, error state, and left/right icon integration.
    - `Badge`: Variants (`purple`, `emerald`, `amber`, `zinc`, `red`), dot status indicators.
    - `Card`: Default, elevated, interactive, and subtle gradient glow borders.
    - `Avatar`: Fallback initials with deterministic color gradients, host badges, and presence dots.
    - `Modal`: Accessible dialog with ESC key handling, backdrop blur, and body scroll lock.
- **Pages Implemented**:
  1. **Landing Page (`/`)**:
     - Modern hero section with live headline and animated badges.
     - Primary CTAs for "Create a Room" and "Join with Room Code".
     - Interactive Live Preview showcase card with animated music wave and room peek.
     - "How it works" 3-step guide (Create Room → Share Invite → Sync & Listen).
     - Architecture & capabilities feature highlights.
     - Public demo rooms browser.
     - Header navigation and comprehensive footer with YouTube policy compliance note.
  2. **Create Room Modal / Flow**:
     - Room name input, display name, 10 music avatar presets, and public/unlisted privacy options.
     - Seamless transition to generated room URL with host privileges.
  3. **Join Room Page (`/join`) & Modal**:
     - Room code or full URL input, display name, avatar selector.
     - Direct jump-in cards for active public demo sessions.
  4. **Listening Room Page (`/room/:roomId`)**:
     - **Header**: Room name, ID, live connection status, copy invite link button with toast feedback, role switcher (Host vs. Listener preview toggle).
     - **Main Area**: Aspect-ratio 16:9 YouTube video player container with animated equalizer, song info, duration, timestamp scrubber bar, volume slider, fullscreen mock, and host controls (previous, rewind 10s, glowing play/pause, forward 10s, next).
     - **Sidebar**: 3-tab layout for:
       - *Queue*: Now playing, upcoming tracks with duration and adder info, "+ Add Song" form, remove button for host.
       - *People*: Connected participants with online/buffering badges, pings, host crown indicator, and invite box.
       - *Live Chat*: Real-time message stream with sender avatars, host tags, timestamps, message length counter, and send button.
  5. **404 Not Found Page (`*`)**:
     - Polished dark error screen with quick navigation back to home or room browser.
- **Verification**:
  - `pnpm run typecheck`: Passed with 0 errors across monorepo.
  - `pnpm run build`: Production build succeeded (`dist/` generated).
  - Preview tests passed across `/`, `/join`, `/room/:roomId`, and `*`.

### Milestone 3: Listening Rooms & Membership (Completed)
- **Data Models & Contracts**:
  - Extended `@synctune/shared-types` with `CreateRoomRequest/Response`, `JoinRoomRequest/Response`, avatar choices, and reconnecting `participantId`.
  - Defined `RoomStatus`: `"active" | "closed" | "host-disconnected"`.
- **In-Memory Repository (`server/src/modules/rooms/repository.ts`)**:
  - Defined `IRoomRepository` interface (`findById`, `create`, `update`, `delete`, `list`).
  - Implemented `InMemoryRoomRepository` with deep-cloning semantics to isolate mutation.
  - Repository pattern designed for direct replacement with PostgreSQL + Prisma in Milestone 7.
- **Room Domain Service (`server/src/modules/rooms/service.ts`)**:
  - `createRoom()`: Generates unique room ID (`room-nanoid`) and host participant ID (`user-nanoid`). Sets creator as `role: "HOST"`.
  - `joinRoom()`: Supports new listeners (`role: "LISTENER"`) and seamless reconnection for existing participants by `participantId`.
  - `setParticipantConnected()`: Tracks connection status. Detects host disconnection and transitions room status to `"host-disconnected"` without silently transferring host privileges.
  - `leaveRoom()`: Removes participant, updates room status accordingly.
- **REST Endpoints (`server/src/modules/rooms/routes.ts`)**:
  - `POST /api/rooms`: Validates input with Zod, creates room, returns room details, `participantId`, and shareable `inviteUrl`.
  - `GET /api/rooms`: Lists all active rooms.
  - `GET /api/rooms/:id`: Fetches room details by ID (returns 404 for invalid/expired rooms).
  - `POST /api/rooms/:id/join`: Validates input with Zod, joins room, returns snapshot and `participantId`.
- **Socket.IO Room Handlers (`server/src/sockets/handlers/roomHandler.ts`)**:
  - Handled `room:join` with callback and broadcast to room channel (`room:participant-joined`).
  - Handled `room:leave` with broadcast (`room:participant-left`).
  - Handled `disconnect` with presence broadcast (`room:participant-updated`, `room:status-changed`).
  - Implemented safe host session recovery on socket reconnection.
- **Frontend Real-Time Integration**:
  - `CreateRoomModal`: Calls REST `POST /api/rooms`, saves credentials in `sessionStorage`, and routes to room.
  - `JoinRoomModal` & `JoinRoomPage`: Calls REST `POST /api/rooms/:id/join`, saves credentials, and routes to room.
  - `ListeningRoomPage`: Initializes via REST, establishes WebSocket connection, joins Socket.IO room channel, listens for participant arrivals/departures, and displays live host status.
- **Acceptance Criteria Verification**:
  - Ran automated end-to-end multi-client integration test (`scratch/test-m3.mjs`).
  - Verified 2 concurrent clients (Host + Listener).
  - Confirmed mutual presence, host identification, host disconnect warning, and safe host reconnection.

### Milestone 4: YouTube Playback Integration (Completed)
- **Official YouTube IFrame Player API Integration**:
  - Created TypeScript type definitions for `window.YT`, `YT.Player`, `YT.PlayerState`, and player options (`apps/web/src/types/youtube.d.ts`).
  - Implemented singleton script loader (`apps/web/src/services/youtubeLoader.ts`) for dynamic, deduplicated loading of `https://www.youtube.com/iframe_api`.
  - Built reusable `YouTubePlayer` component (`apps/web/src/components/player/YouTubePlayer.tsx`):
    - Exposes imperative handles via `ref` (`play()`, `pause()`, `seekTo()`, `getCurrentTime()`, `getDuration()`, `getPlayerState()`, `loadVideo()`, `setVolume()`, `mute()`, `unMute()`).
    - Configured `playerVars` with `origin: window.location.origin` (satisfies YouTube Error 153 policy requirement).
    - Detects player states (`UNSTARTED`, `PLAYING`, `PAUSED`, `BUFFERING`, `CUED`, `ENDED`).
    - Dispatches periodic time tracking events (`onTimeUpdate`) every 500ms while playing.
    - Handles browser autoplay restrictions with an interactive "Click to Enable Audio" overlay.
    - Gracefully cleans up player instances on component unmount (`destroy()`).
- **YouTube URL Parsing & Security Validation (`apps/web/src/utils/youtube.ts`)**:
  - Strictly extracts and validates 11-character video IDs.
  - Accepts standard watch URLs, shortened `youtu.be`, embeds, shorts, mobile, music URLs, and raw 11-char IDs.
  - Rejects untrusted domains, phishing URLs, and malformed inputs.
  - Implemented human-readable error messages for YouTube error codes (2, 5, 100, 101, 150, 153).
- **Listening Room Integration (`apps/web/src/components/player/RoomPlayer.tsx`)**:
  - Integrated official `YouTubePlayer` into the listening room interface.
  - Added host-facing YouTube stream selector with custom URL input and quick-pick presets.
  - Connected playback scrubber, timestamps (`currentTime` and `duration`), and host controls (play/pause, seek ±10s, previous, next, volume/mute).
  - Auto-advances to the next queued track when a video ends.
- **Verification**:
  - Automated test suite (`scratch/test-m4.mjs`) ran 20 URL parser test cases and error code translations; 100% passed.
  - `pnpm run typecheck` and `pnpm run build` passed with 0 errors.

### Milestone 5: Real-Time Playback Synchronization (Completed)
- **Authoritative Server Playback Engine (`server/src/modules/playback/service.ts`)**:
  - The backend server is the authoritative single source of truth for `PlaybackState`:
    `{ videoId, status: "playing" | "paused" | "idle", position, updatedAt, revision }`.
  - Implemented exact elapsed time calculation:
    `expectedPosition = position + (currentServerTime - updatedAt) / 1000`.
  - Processed host commands: `playback:play`, `playback:pause`, `playback:seek`, `playback:change-video`, and `playback:next`.
  - Verified host permissions on every command (`room.hostId === participantId`), rejecting unauthorized listener requests with `403 FORBIDDEN`.
  - Incremented monotonic revision numbers on state updates and rejected stale/out-of-order commands.
  - Broadcasted `playback:state-update` to all connected clients in the room.
  - Added NTP-style server clock calibration event (`sync:time`).
- **Client Synchronization Engine (`apps/web/src/features/playback/usePlaybackSync.ts`)**:
  - NTP clock calibration: Measures RTT and estimates server clock offset (`(serverTime + rtt/2) - clientNow`).
  - Expected position computation: Reconciles local player position against `state.position + elapsed`.
  - Three-tier drift correction strategy:
    - `< 0.5s` drift: In sync (no seek, natural network jitter allowed).
    - `0.5s – 1.5s` drift: Monitored over consecutive 3-second polling cycles; soft correction if drift persists.
    - `> 1.5s` drift: Immediate seek correction to expected position.
  - Feedback loop guard: Flags programmatic player changes (`isProgrammaticUpdate`) so local player events are not mistakenly sent back to the server as user commands.
  - Re-sync on tab visibility change (`visibilitychange` listener) to handle background tab timer throttling.
- **Player Component Integration (`apps/web/src/components/player/RoomPlayer.tsx`)**:
  - Wired `usePlaybackSync` to player controls, scrubber, and YouTube stream picker.
  - Connected live drift indicator pill (`Drift: <50ms` or `±0.12s`).
- **Acceptance Criteria Verification**:
  - Executed automated multi-client test (`scratch/test-m5.mjs`) with 3 concurrent client sessions + 1 late joiner.
  - Verified host play, pause (with accurate server elapsed time), seek, video change, late joiner catch-up, stale packet rejection, and unauthorized command blocking.
  - `pnpm run typecheck` and `pnpm run build` passed with 0 errors.

### Milestone 6: Shared Social Experience & Queue (Completed)
- **Collaborative Song Queue (`server/src/modules/rooms/service.ts`)**:
  - Defined `QueueItem` data contract (`id`, `videoId`, `title`, `artist`, `duration`, `thumbnailUrl`, `addedBy`, `addedAt`).
  - Added `room.queue` with `addQueueItem()`, `removeQueueItem()`, and `reorderQueue()`.
  - Permission model:
    - Host can add, remove any track, and reorder upcoming tracks.
    - Listeners can add tracks (subject to `allowListenerQueue: boolean` room setting).
    - Listeners can only remove tracks they personally added; unauthorized removals are rejected with `403 FORBIDDEN`.
  - Queue changes broadcast in real time to all room members via `queue:updated`.
- **Real-Time Room Text Chat (`server/src/modules/chat/service.ts`)**:
  - Defined `ChatMessage` contract (`id`, `roomId`, `senderId`, `senderUsername`, `senderAvatar`, `content`, `timestamp`, `isHost`).
  - HTML & Script Sanitization: Encodes entities (`<`, `>`, `&`, `"`, `'`) to strictly prevent XSS / script execution.
  - Anti-Spam Rate Limiting: Sliding-window rate limiter restricts participants to a maximum of 3 messages per 5 seconds, rejecting floods with `429 RATE_LIMITED`.
  - Chat messages broadcast to room participants via `chat:message`.
- **Frontend Real-Time Sidebar Integration (`apps/web/src/features/room/RoomSidebar.tsx`)**:
  - *Queue Tab*: Real-time list of upcoming tracks, video thumbnail, duration, adder identity, "+ Add Song" form with YouTube link extraction, and remove button.
  - *People Tab*: Live listener list with real-time presence indicators, latency/ping, and host identification badge.
  - *Chat Tab*: Live auto-scrolling message stream with sender avatars, host tags, formatted timestamps, message length limiter, and anti-spam notifications.
- **Acceptance Criteria Verification**:
  - Executed automated multi-client integration test (`scratch/test-m6.mjs`) with 3 concurrent sessions (Host + 2 Listeners).
  - Verified collaborative queue additions, host reordering, unauthorized removal rejection, real-time chat broadcasts, HTML sanitization, and anti-spam rate limiting.
  - `pnpm run typecheck` and `pnpm run build` passed with 0 errors.

### Milestone 7: Persistence & Security (Completed)
- **Database Schema & Prisma ORM (`server/prisma/schema.prisma`)**:
  - Configured Prisma Client with PostgreSQL provider.
  - Models: `User`, `Room`, `RoomParticipant`, `RoomQueueItem`, `Playlist`, `PlaylistTrack`, `ChatMessage`.
  - Resilient dual-mode database connector (`server/src/db/prisma.ts`):
    - Connects to PostgreSQL when `DATABASE_URL` is configured and available.
    - Seamlessly falls back to memory repositories without failing startup if database is offline.
    - `/api/health` reports current database connection state (`PostgreSQL (Prisma)` or `in-memory-fallback`).
- **Authentication & Security Engine (`server/src/modules/auth/`)**:
  - **Password Security**: Bcrypt password hashing (`bcryptjs` with 12 salt rounds) and timing-safe password comparison.
  - **JWT Authorization**: Signs and verifies JSON Web Tokens with `jsonwebtoken`, configurable secrets, and expiration periods (`JWT_SECRET`, `JWT_EXPIRES_IN`).
  - **Dual-Mode Repositories**: Implemented `PrismaUserRepository` and `InMemoryUserRepository` behind `IUserRepository`.
  - **User Management**:
    - `POST /api/auth/register`: Validates inputs with Zod, checks email/username uniqueness, hashes passwords, returns user snapshot & JWT.
    - `POST /api/auth/login`: Validates credentials, verifies hash, returns user snapshot & JWT.
    - `POST /api/auth/guest`: Issues guest JWT tokens for instant participation without registration.
    - `GET /api/auth/me`: Protected route returning authenticated user profile.
  - **Rate Limiting Middleware (`server/src/middleware/rateLimit.ts`)**:
    - Global API rate limiter: 200 requests per 15 minutes.
    - Auth route limiter: 30 requests per 15 minutes on sensitive auth endpoints (`/register`, `/login`).
    - Exposes standard rate limit headers (`RateLimit-Limit`, `RateLimit-Remaining`).
- **Playlists Module (`server/src/modules/playlists/`)**:
  - Implemented `IPlaylistRepository` with Prisma and In-Memory implementations.
  - Endpoints (all JWT authenticated):
    - `POST /api/playlists`: Create playlist.
    - `GET /api/playlists`: Fetch current user's playlists.
    - `GET /api/playlists/:id`: Fetch playlist with tracks.
    - `POST /api/playlists/:id/tracks`: Add YouTube track to playlist.
    - `DELETE /api/playlists/:id/tracks/:trackId`: Remove track from playlist.
    - `DELETE /api/playlists/:id`: Delete playlist.
- **Frontend Authentication Integration**:
  - `apps/web/src/contexts/AuthContext.tsx`: React Context providing reactive auth state (`user`, `token`, `isAuthenticated`, `isGuest`), auto-restoring session from `localStorage`.
  - `apps/web/src/features/auth/AuthModal.tsx`: Modern tabbed modal for Sign In, Create Account (with avatar picker), and "Continue as Guest".
  - `apps/web/src/components/layout/Navbar.tsx`: Displays active user profile badge, guest tag, and Sign Out button; opens `AuthModal` on demand.
  - `apps/web/src/services/api.ts`: Automatically attaches `Authorization: Bearer <token>` to all HTTP requests.
  - `apps/web/src/services/socket.ts`: Authenticates Socket.IO client handshakes with auth tokens.
- **Acceptance Criteria Verification**:
  - Automated test suite (`scratch/test-m7.mjs`) ran 27 tests covering registration, bcrypt hashing, duplicate rejection, weak password rejection, valid login, invalid login rejection, guest auth, protected `/api/auth/me`, playlist CRUD, and rate limit headers.
  - 100% passed (27 PASSED, 0 FAILED).
  - Monorepo `pnpm run typecheck` and `pnpm run build` passed with 0 errors.

### Milestone 8: Testing, Optimization & Production Deployment (Completed)
- **Comprehensive Vitest Test Suite (`tests/`)**:
  - `tests/youtube.test.ts`: URL extraction (standard, short, embed, shorts, music), ID extraction, edge-case rejection, error translation (7 tests).
  - `tests/playback.test.ts`: Server-authoritative playback position calculation, elapsed time formula, host command execution, host permission enforcement, stale revision rejection (7 tests).
  - `tests/chat.test.ts`: Message structure, anti-XSS HTML sanitization, character length limits, sliding-window anti-spam rate limiting (5 tests).
  - `tests/auth.test.ts`: Bcrypt password hashing & timing-safe comparison, JWT token signing & verification, user registration, duplicate prevention, credential authentication, guest sessions (7 tests).
  - `tests/rooms.test.ts`: Room creation, host designation, listener joining, host disconnect detection, host recovery, collaborative queue operations and permission validation (4 tests).
  - `tests/playlist.test.ts`: Playlist creation, adding YouTube tracks, unauthorized cross-user access rejection, track removal, playlist deletion (3 tests).
  - **Results**: 33 unit and integration tests passing in Vitest (`pnpm test`).
- **Frontend Optimization & Code Splitting (`apps/web/vite.config.ts`)**:
  - Implemented Rollup `manualChunks`:
    - `vendor-react` (React, React-DOM, React-Router)
    - `vendor-socket` (Socket.IO client)
    - `vendor-icons` (Lucide icons)
  - Enables aggressive long-term browser caching for core vendor libraries while isolating app bundle updates.
- **Production Containerization & Deployment Orchestration**:
  - `server/Dockerfile`: Multi-stage build (Node 22 alpine, pnpm frozen lockfile, Prisma Client generator, unprivileged `node` runner, health check).
  - `apps/web/Dockerfile`: Multi-stage build (Node 22 alpine builder, Nginx alpine runner).
  - `apps/web/nginx.conf`: Nginx configuration with SPA fallback (`try_files $uri $uri/ /index.html`), reverse proxy for `/api/`, WebSocket upgrade for `/socket.io/`, Gzip compression, and security headers.
  - `docker-compose.yml`: Fully orchestrates PostgreSQL 16 (with volume & health check), SyncTune backend server (waiting on PostgreSQL), and Nginx web frontend (exposing port 8080).
  - `.dockerignore`: Excludes build artifacts, local dependencies, and environment files.

---

## Architectural Decisions

1. **pnpm Workspaces with `workspace:*`**:
   - Chosen over npm for strict dependency isolation (eliminating phantom dependencies) and instant symlinking.
   - Requires approving native build scripts (e.g. `esbuild`, `@prisma/client`) in pnpm 12 via `pnpm approve-builds --all`.

2. **Modular Monolith over Microservices**:
   - Web frontend and real-time backend live in the same repository.
   - Server organized by domain modules (`rooms`, `playback`, `participants`, `chat`, `auth`, `playlists`) to keep boundaries clean while avoiding premature distributed infrastructure.

3. **Server-Authoritative Real-Time Architecture**:
   - The backend server is the single source of truth for `PlaybackState`.
   - Host sends commands (`playback:command`), server validates permissions, updates state, increments `revision`, and broadcasts authoritative state updates.

4. **Dual-Mode Persistence Architecture (Resilient Hybrid Fallback)**:
   - Prisma Client with PostgreSQL serves as the production database for users, rooms, playlists, and chat messages.
   - To ensure local developer velocity and robust CI execution without requiring external running database daemons, domain repositories implement dual-mode interfaces (`PrismaRepository` and `InMemoryRepository`).
   - If PostgreSQL is not connected, the server automatically boots in in-memory mode and reports this on `/api/health`.

5. **Frequency-Separated Storage Strategy**:
   - Playback tick synchronization happens in-memory and over WebSocket broadcasts without writing to PostgreSQL on every tick.
   - Playback state snapshots are persisted periodically or on structural events (track changes, pause/play commands).

6. **Production Nginx Reverse Proxy & WebSocket Gateway**:
   - Web container terminates HTTP port 80/8080 and handles static asset serving with gzip.
   - Seamlessly upgrades `/socket.io/` connections with `Upgrade` and `Connection: "upgrade"` headers directly to the backend container.

---

## Outstanding Work (Next Milestones)

- **Milestone 9**: Mobile application:
  - React Native + Expo mobile client.
  - Reusing `@synctune/shared-types` contracts and Socket.IO real-time synchronization protocol.

---

## Known Limitations & Technical Constraints

1. **YouTube IFrame API Native Controls**:
   - YouTube's Terms of Service prohibit removing or obscuring native player controls.
   - Listeners could theoretically touch the native player; our client listens to `onStateChange` and reconciles position back to authoritative server state.
2. **YouTube Autoplay Restrictions**:
   - Modern browsers block unmuted autoplay without explicit user interaction. New listeners joining an in-progress song must trigger a click gesture or use muted playback until unmuted.
3. **Background Tab Throttling**:
   - Browsers throttle background tabs down to 1Hz timer execution. Drift correction reconciliation executes immediately on `visibilitychange` (tab focus).
