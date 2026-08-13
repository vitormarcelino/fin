# syntax=docker/dockerfile:1

################################################################################
# base — pinned Node LTS + corepack-managed pnpm (version comes from the
# "packageManager" field in package.json, so it always matches what's
# used locally / in CI). Alpine keeps layers small; switch to a
# node:24-slim (Debian) base if you ever need a native dep that doesn't
# ship musl binaries.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

################################################################################
# deps — install once, cached by lockfile hash. Installs devDependencies
# too (needed for `next build`, TypeScript, Tailwind); the runtime image
# never sees this stage's node_modules.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=fin-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

################################################################################
# builder — compiles the app. `output: "standalone"` (next.config.ts)
# makes `next build` trace and emit only the files actually needed to
# run the server into .next/standalone.
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1

# lib/db/index.ts throws at import time if DATABASE_URL is unset, and
# `next build` imports route modules (even fully dynamic ones, like the
# dashboard page here) to collect build metadata — so a value must be
# present at build time. It's never connected to: postgres.js dials
# lazily on first query, and none of this app's routes query the DB
# during the build (no generateStaticParams/force-static in use). Real
# runtime queries use the DATABASE_URL passed to `docker run`/compose.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

################################################################################
# runner — minimal production image: just the standalone server, static
# assets and public files. No source, no node_modules, no package
# manager, no build tooling.
FROM node:24-alpine AS runner
RUN apk add --no-cache tini

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ || exit 1

# tini as PID 1 forwards SIGTERM properly so Next.js can drain in-flight
# requests / pending after() callbacks before exiting (see Next.js
# self-hosting docs — recommends a 10-30s drain period on the platform side).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
