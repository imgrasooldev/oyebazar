# Baji worker — Playwright + BullMQ consumer (Fly.io)
#
# Playwright ki official image use karte hain: Chromium aur us ki saari system
# dependencies pehle se mojood hain. Apni image banane par Linux par fonts/libs
# ka masla ghanton kha jata hai.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy AS base

ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

WORKDIR /app

# --- dependencies (layer cache: sirf manifests badlein to hi dobara install ho) ---
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/queue/package.json packages/queue/
COPY packages/storage/package.json packages/storage/
COPY packages/whatsapp/package.json packages/whatsapp/
COPY apps/worker/package.json apps/worker/

RUN pnpm install --frozen-lockfile --filter @oyebazar/worker...

# --- source ---
COPY packages/ packages/
COPY apps/worker/ apps/worker/
# 🔴 templates worker ke saath jate hain — inhi se status pack banta hai
COPY templates/ templates/

RUN pnpm --filter @oyebazar/db generate

# Fly health check
EXPOSE 8080

# tsx TypeScript seedha chalata hai — build step ki zaroorat nahi (worker chhota hai)
CMD ["pnpm", "--filter", "@oyebazar/worker", "start"]
