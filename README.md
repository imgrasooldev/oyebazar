# Baji

WhatsApp status par bechne wali resellers ke liye content + coordination platform.

> **Hamara product app nahi hai — hamara product wo image hai jo WhatsApp status par jati hai.**

Pehle `docs/ARCHITECTURE.md` aur `docs/CONVENTIONS.md` parhen. Naye developer ke liye
wo do documents lazmi hain.


## Logins aur URLs

Kaun kahan se andar aata hai (reseller, wholesaler, admin), test accounts aur dev par
OTP kahan milta hai — sab [docs/ACCESS.md](docs/ACCESS.md) mein hai.

Team ko bhejne ke liye [docs/ACCESS.pdf](docs/ACCESS.pdf) bhi mojood hai. Markdown
badlen to PDF dobara bana lein:

```bash
pnpm --filter @oyebazar/worker docs:pdf
```

## Chalane ka tareeqa

Kuch install karne ki zaroorat nahi — na Docker, na Postgres. Do terminal chahiyen.

**Terminal 1 — database (chalta rehne dein):**

```bash
pnpm install
cp .env.example .env
pnpm db:local
```

**Terminal 2 — app:**

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Ab `http://localhost:3000` khulega.

**Login:** seed ka number `03001234567`. `WHATSAPP_PROVIDER=console` par OTP **Terminal 2 mein
chhapta hai** — koi asli WhatsApp message nahi jata. Wahan se code copy kar ke daal dein.

**Aaj ka pack + status pack images** (Redis ke baghair):

```bash
pnpm --filter @oyebazar/worker daily:dev
```

### ⚠ Do cheezein jo local par tang karti hain

1. **`pnpm build` aur `pnpm dev` ek saath na chalayen.** Production build dev ke `.next`
   chunks overwrite kar deta hai aur dev server `Cannot find module './267.js'` de kar
   mar jata hai. Aisa ho jaye to: dev band karen → `apps/web/.next` delete → dobara `pnpm dev`.
2. **Tailwind config ya `globals.css` badlein to dev server restart karen.** Next config
   file ko hot-reload nahi karta; purani CSS cache mein reh jati hai.

### Neon/Supabase par jana ho

`.env` mein sirf `DATABASE_URL` aur `DIRECT_URL` badal dein, `pnpm db:migrate:deploy`
chala dein — `pnpm db:local` ki phir zaroorat nahi.

## Repo

```
apps/web         Next.js 15 — public bazaar + reseller portal + REST API
apps/worker      Playwright render pool + BullMQ consumer (Content Studio)
packages/core    domain + services + ports (koi framework nahi)
packages/db      Prisma adapters (repository pattern)
packages/queue   BullMQ producer + connection
packages/shared  Zod DTOs, money (integer PKR), fee, errors
templates/       status pack templates (base.css + layout.html + per-template CSS)
docs/            ARCHITECTURE, CONVENTIONS
```

## Status pack khud dekhen (na DB chahiye, na Redis)

```bash
pnpm --filter @oyebazar/worker render:preview
```

Saare 8 templates render ho kar `apps/worker/preview-out/` mein aa jate hain.
**Ye asli phone par khol kar dekhen** — Nastaliq screen par judti hai ya tootti hai, ye
sirf wahin pata chalta hai. Ek template chahiye to: `render:preview -- eid`

Naya template banana = `templates/<key>/template.css` mein CSS variables badalna. Koi deploy nahi.

## Commands

| Command | Kaam |
|---|---|
| `pnpm db:local` | local Postgres (`.local/pgdata`, gitignored) |
| `pnpm dev` | web dev server |
| `pnpm dev:worker` | worker (Redis chahiye) |
| `pnpm typecheck` | poore workspace ka tsc |
| `pnpm test` | unit + security tests |
| `pnpm test:security` | 🔴 sirf price-leak test (CI blocking) |
| `pnpm db:studio` | Prisma Studio |

## Do surfaces — kabhi na milayen

| | Bazaar (logged-out) | App (login ke baad) |
|---|---|---|
| Price | 🔴 koi nahi | Baji price |
| Order button | 🔴 bilkul nahi | haan (Phase 2) |
| Fee | 🔴 muft | fee model yahan |

Wajah qanooni hai — tafseel `docs/ARCHITECTURE.md` mein.

## Worker chalana (asli render ke liye)

```bash
# ek dafa
pnpm --filter @oyebazar/worker exec playwright install chromium
# .env mein REDIS_URL set karen, phir
pnpm --filter @oyebazar/worker dev
```

REDIS_URL na ho to app chalti rehti hai magar pack `RENDERING` par ruk jata hai (queue log-only).

## Rozana ke jobs

Worker chalte hi do schedules khud register kar leta hai (waqt Pakistan ka):

| Waqt | Job | Kaam |
|---|---|---|
| 03:00 | `pregenerate-daily-packs` | aaj ka drop banao + sab resellers ke packs pehle se render |
| 09:00 | `daily-broadcast` | "آج کا اسٹیٹس پیک" har active reseller ke WhatsApp par |
| har 30 min | `order-maintenance` | 6 ghante → reseller ko reminder · 24 ghante → order auto-cancel |
| 1 tareekh, 10:00 | `fee-invoicing` | pichhle mahine ki fee ka invoice har supplier ke liye |

Haath se chalane ke liye Redis mein job daal dein, ya `apps/worker/src/jobs/daily.jobs.ts` ke
do function seedha call kar lein.

## Ops API (Retool ke liye)

`/api/v1/ops/*` — header `x-ops-key: $OPS_API_KEY`. Key set na ho to endpoints **band** hain.

| Endpoint | Kaam |
|---|---|
| `GET /ops/orders` | orders list (internal view — fee aur supplier ke saath) |
| `PATCH /ops/orders/:id/status` | `SENT_TO_SUPPLIER` · `DISPATCHED` · `DELIVERED` · `RTO` |
| `GET /ops/fee-ledger` | collection % (guardrail ≥85%) + kis supplier ka kitna bill banna hai |
| `POST /ops/fee-ledger/invoice` | invoice banao (job fail ho jaye to) |
| `PATCH /ops/fee-ledger/invoice` | paisa aa gaya — `COLLECTED` |

⚠ Shared key arzi hai. Ops team 3 se barhe to `OpsUser` login lazmi — kis ne kya kiya, ye
pata chalna chahiye.

## Abhi kya nahi bana

- Ops **UI** — endpoints tayyar hain, Retool par screens banani hain
- `OpsUser` login (abhi shared API key)
- Customer confirmation bot (`confirmedBy = CUSTOMER` ka raasta khula hai)
- WhatsApp inbound webhook (customer ke jawab parhna)
- Courier integration (tracking link)
