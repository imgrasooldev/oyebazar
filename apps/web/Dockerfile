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
COPY packages/storage/package.json packages/storage/
COPY packages/whatsapp/package.json packages/whatsapp/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @oyebazar/web...

# --- build ---
FROM deps AS build
COPY tsconfig.base.json ./
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

# ---------------------------------------------------------------- migrations
#
# 🔴 Schema aur migrations ab IMAGE ke andar hain, aur ye jaan boojh kar hai.
#
# Pehle migrations sirf kisi ke apne computer se chalti thin, aur us ka natija ek dafa
# saamne aa chuka: naya code deploy ho gaya aur us ka maanga hua column DB mein tha hi
# nahi — har order ka safha `Order.courier does not exist` par gir gaya.
#
# Wo tarteeb ki ghalti thi, aur tarteeb yaad rakhne ka bharosa aadmi par nahi rakha ja
# sakta. Ab wo tarteeb DHANCHE mein hai: Fly `release_command` deploy se PEHLE chalata
# hai, purane version ke chalte hue, aur nakaam hone par naya code live hota hi nahi
# (dekhen fly.web.toml).
COPY --from=build /app/packages/db/prisma ./packages/db/prisma

# Prisma ka CLI `.pnpm` ke andar version+hash wale naam par baithta hai, aur wo naam har
# upgrade par badal jata hai. Usay yahin BUILD par hal kar ke ek pakke naam par le aate
# hain — `release_command` mein wohi pakka naam likha hai.
#
# Symlink is liye ke node hamesha ASAL raasta hal karta hai, yani CLI apni deps wahin se
# uthata hai jahan wo waqai padi hain.
RUN ln -s "$(ls -d /app/node_modules/.pnpm/prisma@*/node_modules/prisma/build/index.js | head -1)" \
      /usr/local/lib/prisma-cli.js \
    && node /usr/local/lib/prisma-cli.js --version

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
