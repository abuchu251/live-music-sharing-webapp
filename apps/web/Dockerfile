# ─── Production Web Frontend Dockerfile ──────────────────────
# Multi-stage build: compiles React SPA with Vite, serves via Nginx

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root configurations & package definitions first for Docker layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

# Install dependencies (cached unless package.json/pnpm-lock changes)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

# Build shared types
RUN pnpm --filter @synctune/shared-types build

# Build web frontend
RUN pnpm --filter @synctune/web build

# Stage 2: Nginx Web Server
FROM nginx:alpine AS runner

# Remove default configuration and copy custom Nginx config
RUN rm /etc/nginx/conf.d/default.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA static assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

