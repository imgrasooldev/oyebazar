# Baji web — Next.js 15 standalone (Fly.io)
FROM node:22-slim AS base

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- deps ---
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/queue/package.json packages/queue/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @oyebazar/web...

# --- build ---
FROM deps AS build
COPY packages/ packages/
COPY apps/web/ apps/web/
RUN pnpm --filter @oyebazar/db generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @oyebazar/web build

# --- runtime (standalone output — chhoti image) ---
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
# Prisma engine + generated client standalone trace mein aate hain
COPY --from=build /app/node_modules/.pnpm ./node_modules/.pnpm

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
