# Architecture

> Hamara product app nahi hai — hamara product wo **image** hai jo WhatsApp status par jati hai.
> App us image ko banane ka zariya hai. Har technical faisla isi jumle se nikalta hai.

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│ apps/web  (Next.js 15)                                       │
│   app/(public)/  — logged-out: bazaar, home, login           │
│   app/(app)/     — logged-in: catalogue, Content Studio      │
│   app/api/v1/    — REST endpoints (patle handlers)           │
│   lib/container  — COMPOSITION ROOT (wahid jagah jahan `new`)│
│   lib/adapters/  — clock, tokens, messaging, queue, limiter  │
└───────────────┬──────────────────────────────────────────────┘
                │ services + ports (interfaces)
┌───────────────▼──────────────────────────────────────────────┐
│ packages/core  — DOMAIN + APPLICATION                        │
│   domain/   — views (read models), order state machine       │
│   ports/    — repository + infrastructure INTERFACES         │
│   services/ — Bazaar, Catalogue, Pricing, StatusPack, Auth   │
│   ⚠ yahan Prisma, Next.js, HTTP ka naam tak nahi aata        │
└───────────────┬──────────────────────────────────────────────┘
                │ implements
┌───────────────▼──────────────────────────────────────────────┐
│ packages/db  — PRISMA ADAPTERS (repository pattern)          │
│   selectors.ts        — 🔴 price leak ki pehli defence       │
│   repositories/*.ts   — core ke ports ka amal                │
└──────────────────────────────────────────────────────────────┘

packages/shared — Zod DTOs, money (integer PKR), fee, errors, constants
```

**Ye layering kyun:** juniors ke saath sab se bara khatra business logic ka bikhar jana hai.
Yahan wo mumkin hi nahi — `apps/` mein sirf routing aur presentation hai, aur `packages/core`
mein koi framework import nahi ho sakta.

**Scalability:** aaj web + Postgres kaafi hai (2,000 resellers is se bohat door hain). Jab worker,
ops console, ya alag API service chahiye hogi, wo `packages/core` ko dobara istemal karengi —
`apps/` ka koi code haath nahi lagega.

## Do surfaces (qanooni)

| | Bazaar `app/(public)` | App `app/(app)` |
|---|---|---|
| Kaun | koi bhi, Google se | sirf registered resellers |
| Price | 🔴 koi nahi | Baji price |
| Order button | 🔴 bilkul nahi | haan (Phase 2) |
| Fee | 🔴 muft | fee model yahan |

Wajah: Sales Tax Act 2(18A) — "online marketplace" ki tareef **fee** aur **digital orders**
dono par poori hoti hai. Bazaar dono par bahar hai. Dono zones ek hi Next.js app mein hain
magar unka data alag hai: `PublicProductView` mein price ka field **maujood hi nahi**.

## Price isolation — teen layers

1. **Prisma select** (`packages/db/src/selectors.ts`) — `supplierPrice` maanga hi nahi jata
2. **Zod `.strict()` DTOs** (`packages/shared/src/dto/`) — extra field aaye to runtime par throw
3. **CI test** (`apps/web/__tests__/security/price-leak.test.ts`) — merge block

Type level par bhi: `supplierPrice` sirf `PricingProductView` mein hai, jo sirf order pricing
aur fee ledger use karta hai. Reseller-facing service us type ko chhoo hi nahi sakti.

## Content Studio ka flow

```
Reseller "اسٹیٹس پیک بنائیں" dabati hai
   → POST /api/v1/status-pack { productId, templateKey, retailPrice }
   → StatusPackService: price tay → CACHE dekha (resellerId+productId+template+price)
        ├─ hit  → { status: READY, imageUrl }        (<200ms)
        └─ miss → row banti hai + RenderQueue.enqueue → { status: RENDERING }
   → UI poll karti hai GET /api/v1/status-pack?…      (p95 <2s)
   → worker (Playwright) render kar ke markRendered() karta hai
```

### Render ki asli lagat (naapi gayi, andaza nahi)

| | pehla render | warm |
|---|---|---|
| HTML banana (photo download + font inline) | ~2,900ms | **~2ms** (photo cache) |
| Chromium screenshot | ~560ms | ~560ms |
| JPEG encode (mozjpeg q88) | ~360ms | ~360ms |
| **Total** | ~3,900ms | **~920ms** |

Do faisle jo yahan se nikle:

1. **Photo cache** (`template.ts`) — ek hi product ki tasveer 2,000 resellers ke liye render
   hoti hai. Bina cache ke har render 2.9s network par kharch karta tha (render ka 95%).
2. **JPEG, PNG nahi** — 620KB → 290KB. Status pack ek photo hai; PNG ka faida sirf theory mein
   hai aur Sadia ka data mehnga hai.

⚠ Fonts data-URI ke taur par inline hote hain — CDN se aate to render non-deterministic ho jata
aur visual regression test kabhi pass na hota.

## Rozana ka nizaam (worker)

```
03:00 PKT   pregenerate-daily-packs
              → DailyDrop banta hai (5 items, category-wise, 14 din mein na dohraya gaya)
              → har active reseller × har item → render queue
              → 2,000 × 5 = 10,000 renders · 6 parallel × ~900ms ≈ 25 minute

09:00 PKT   daily-broadcast
              → wohi DailyDrop har active reseller ke WhatsApp par
              → 🔴 20 msg/sec ka pacer · jitter · attempts: 1 (retry NAHI)
              → 3 baar fail ho chuke number par bhejna band, reseller LIMITED
```

Teen cheezein jaan boojh kar aisi hain:

1. **`DailyDrop` ek table hai, calculation nahi.** Pre-generation, broadcast aur app ka home —
   teenon ko *bilkul wohi* list chahiye. Warna message mein kuch aur hota hai aur app mein kuch aur.
2. **6 ghante ka faasla.** Renders ~25 minute lete hain, magar kuch atak jaye to subah tak
   theek karne ka waqt milta hai. Broadcast ke baad pata chalna bohat dair hai.
3. **Broadcast retry nahi karta** (`attempts: 1`). Aadha bhej kar fail hua job dobara chale to
   aadhi resellers ko do messages jate hain — Meta ki nazar mein wo spam hai, aur quality
   rating girne par tier neeche aa jata hai.

## Order ka safar

```
Reseller customer se WhatsApp par baat karti hai
   → /orders/new/<productId> par tafseel bharti hai (location pin ← RTO lever)
   → POST /api/v1/orders  (Idempotency-Key header lazmi)
        · stock check ✅  (confirmation se PEHLE)
        · ek order = ek wholesaler
        · price SNAPSHOTS + fee (supplier price par, supplier ke apne rate se)
        → PENDING_CONFIRM
   → 🔴 reseller "تصدیق کریں" dabati hai
        → CONFIRMED  +  confirmedBy = RESELLER  +  FeeLedger row banti hai
   → ops SENT_TO_SUPPLIER  (confirmedAt null ho to service layer rok deti hai)
   → DISPATCHED → DELIVERED | RTO (fee WRITTEN_OFF, delete nahi)
```

**`confirmedBy` kyun:** Phase 1 mein confirmation reseller karti hai. Doc ka RTO number
(35% → 15%) customer ki apni "HAAN" par mabni hai, jo zyada mazboot signal hai. Field is liye
hai ke 2–3 mahine baad apne data se RTO ka moqabla ho sake — reseller-confirmed vs
customer-confirmed — aur faisla raye se nahi, number se ho.

## Stack

| Layer | Faisla | Wajah |
|---|---|---|
| Web | Next.js 15 (App Router) | PWA + SSR + API ek jagah |
| DB | Neon Postgres + Prisma | branching per PR; juniors prod data se door |
| Storage | Supabase Storage → (R2 agar egress barhe) | port ke peechay, badalna ek file |
| Hosting | Fly.io (web + worker) | worker ko long-running process + ~1GB RAM chahiye |
| Queue | BullMQ + Redis | nightly 10,000 renders |
| Render | Playwright HTML screenshot | 🔴 Urdu Nastaliq canvas par tootti hai |
| Auth | DB session + opaque token | 🔴 JWT nahi — shared phone, revoke chahiye |
| Validation | Zod | ek schema se runtime + types |

Jaan boojh kar **nahi**: microservices, GraphQL, Kubernetes, React Native (Phase 3 tak), JWT.
