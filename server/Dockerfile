# ─── Production Server Dockerfile ────────────────────────────
# Multi-stage build for SyncTune Express + Socket.IO Server

# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Enable Corepack & pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace configurations
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY server ./server

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm --filter @synctune/server exec prisma generate

# Build shared types & server
RUN pnpm --filter @synctune/shared-types build
RUN pnpm --filter @synctune/server build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Copy compiled artifacts & node_modules from builder
COPY package.json pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/server ./server

WORKDIR /app/server

# Use non-root user
USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
