# SyncTune 🎵

> A production-oriented social music listening platform where multiple people can listen to YouTube music videos together in real time.

---

## Features (Planned & In Progress)

- 🎧 **Synchronized Playback** — Host controls play, pause, seek, and track change with server-authoritative time synchronization and drift correction.
- 🚪 **Listening Rooms** — Create instant rooms, share invitation links, and listen with friends.
- 👥 **Real-Time Presence** — See who is currently in the room and listening with you.
- 💬 **Live Chat** — Chat in real-time with listeners in the room.
- 📋 **Collaborative Queue** — Add and suggest upcoming YouTube music tracks.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Socket.IO Client
- **Backend**: Node.js (LTS), Express 5, TypeScript, Socket.IO 4, Prisma ORM, Bcrypt, JWT
- **Database**: PostgreSQL (Prisma Client with resilient in-memory fallback)
- **Shared Contracts**: `@synctune/shared-types`
- **Player**: Official YouTube IFrame Player API
- **Monorepo**: pnpm workspaces

---

## Project Structure

```
music-sharing-website/
├── apps/
│   ├── web/               # React + Vite frontend
│   └── mobile/            # React Native (Phase 9)
├── server/                # Express + Socket.IO backend
├── packages/
│   └── shared-types/      # TypeScript contracts shared across web, mobile, and server
├── package.json           # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Getting Started

### Prerequisites

- **Node.js**: `>= 22.0.0`
- **pnpm**: `>= 10.0.0` (tested with pnpm 12)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd music-sharing-website

# Install all workspace dependencies
pnpm install

# Approve post-install scripts (e.g. esbuild)
pnpm approve-builds --all
```

### Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default configuration:
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Development

To run both backend and frontend concurrently:

```bash
# Build shared types first
pnpm run build:types

# Start both frontend and backend
pnpm run dev
```

Or run them individually in separate terminals:

```bash
# Terminal 1: Backend (http://localhost:3001)
pnpm run dev:server

# Terminal 2: Frontend (http://localhost:5173)
pnpm run dev:web
```

### Verification & Testing

```bash
# Run unit and integration test suite (Vitest)
pnpm test

# Typecheck all packages
pnpm run typecheck

# Build all packages
pnpm run build
```

---

## Production Deployment (Docker Compose)

SyncTune is configured for full multi-container deployment using Docker Compose:

```bash
# Build and run PostgreSQL, Backend, and Web (Nginx)
docker-compose up --build -d

# Check service status
docker-compose ps

# Access SyncTune at:
# http://localhost:8080
```

---

## Development Milestones

- [x] **Milestone 1**: Project Initialization & Monorepo Setup
- [x] **Milestone 2**: Frontend UI & Design System
- [x] **Milestone 3**: Listening Rooms & Membership
- [x] **Milestone 4**: YouTube IFrame Player Integration
- [x] **Milestone 5**: Real-Time Playback Synchronization
- [x] **Milestone 6**: Social Features (Queue, Chat, Presence)
- [x] **Milestone 7**: Persistence & Security (PostgreSQL + Prisma)
- [x] **Milestone 8**: Testing, Optimization & Deployment
- [ ] **Milestone 9**: Mobile Application (React Native + Expo)

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed architectural decisions, progress tracking, and known limitations.

