# OyeBazar — live jane ka rasta

Ye document ek hi sawal ka jawab deta hai: **khali Fly account se `oyebazar.com` tak
kaise pohanchte hain**, aur har qadam par kya cheez tootti hai agar wo qadam chhoot jaye.

Do cheezein alag hain aur ghalti se ek samajh li jati hain:

| | kya hai | kahan chalta hai |
|---|---|---|
| **web** | reseller, dukan aur ops ke safhe | `oyebazar-web` (Fly) |
| **worker** | status pack banata hai, subah ka broadcast, yaad-dehaniyan | `oyebazar-worker` (Fly) |

Worker ke baghair app chalti hai — magar **status pack nahi banta**, yani reseller ke
paas lagane ko tayyar tasveer nahi hoti. Wo poore karobar ka asal kaam hai, is liye
dono jate hain.

---

## 1 · Faislay — pehle ye tay karen

| sawal | tajweez | wajah |
|---|---|---|
| Database | **Supabase** (ya Neon — dono chalte hain) | Tasveerein waise bhi Supabase storage par jati hain; ek hi jagah rakhna hisab aur bill dono saada rakhta hai. Neon behtar Postgres deta hai — lena ho to sirf `DATABASE_URL` badalta hai, aur kuch nahi. |
| Region | **DB aur app EK hi ilaqe mein** | Har safha DB se baat karta hai. App Singapore aur DB Mumbai ho to har query par ~60ms zaya — aur ek safhe par kai query hoti hain. |
| Redis | **Upstash** (Fly extension) | Iske baghair status pack render nahi hota (queue log-only mode mein chali jati hai). |
| WhatsApp | **wati** ya **meta** | 🔴 Iske baghair OTP nahi jata, yani **koi login hi nahi kar sakta**. Ye launch ki sab se ahem chabi hai. |

Fly ke qareeb tareen region: `bom` (Mumbai) sab se qareeb hai, `sin` (Singapore) doosra.
Abhi `fly.web.toml` aur `fly.worker.toml` dono par `sin` likha hai — Mumbai lena ho to
dono files mein `primary_region` badal den.

---

## 2 · Secrets — jo Fly par jane hain

`.env.example` mein har khana likha hua hai. Live par ye chahiyen:

```
DATABASE_URL        Postgres (pooled)
DIRECT_URL          Postgres (direct — migrations isi se chalti hain)
APP_URL             https://oyebazar.com
SESSION_COOKIE_NAME oyebazar_session
DEFAULT_FEE_RATE_BPS 500
WHATSAPP_PROVIDER   wati | meta
WATI_API_URL / WATI_API_KEY        (agar wati)
META_PHONE_NUMBER_ID / META_ACCESS_TOKEN / META_WEBHOOK_VERIFY_TOKEN   (agar meta)
SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_BUCKET
R2_PUBLIC_URL       tasveeron ka public prefix
REDIS_URL           Upstash
OPS_API_KEY         🔴 khali chhora to /api/v1/ops/* band rehte hain (fail closed)
```

🔴 `NODE_ENV` haath se set **na** karen — Dockerfile khud `production` set karta hai.

---

## 3 · Qadam ba qadam

```bash
# 0) Login (ye aap khud chalayen — browser khulta hai)
flyctl auth login

# 1) Dono app banayen (sirf pehli dafa)
flyctl apps create oyebazar-web
flyctl apps create oyebazar-worker

# 2) Secrets (misal — apni asli qadrein daalen)
flyctl secrets set -a oyebazar-web \
  DATABASE_URL="..." DIRECT_URL="..." APP_URL="https://oyebazar.com" \
  SESSION_COOKIE_NAME="oyebazar_session" DEFAULT_FEE_RATE_BPS="500" \
  WHATSAPP_PROVIDER="wati" WATI_API_URL="..." WATI_API_KEY="..." \
  SUPABASE_URL="..." SUPABASE_SERVICE_KEY="..." SUPABASE_BUCKET="status-packs" \
  R2_PUBLIC_URL="https://<project>.supabase.co/storage/v1/object/public/status-packs" \
  REDIS_URL="..." OPS_API_KEY="..."

# worker ko wohi secrets chahiyen (APP_URL bhi — link isi se bante hain)
flyctl secrets set -a oyebazar-worker ...wohi...

# 3) Database ka dhancha (migrations) — apni machine se, prod DB par
DATABASE_URL="<prod>" DIRECT_URL="<prod>" pnpm --filter @oyebazar/db exec prisma migrate deploy

# 4) Deploy
flyctl deploy -c fly.web.toml --remote-only
flyctl deploy -c fly.worker.toml --remote-only

# 5) Domain
flyctl certs add -a oyebazar-web oyebazar.com
flyctl certs add -a oyebazar-web www.oyebazar.com
flyctl ips list -a oyebazar-web     # ye IP domain ke DNS mein daalne hain
```

DNS (domain jahan se khareeda, wahan):

| record | naam | qadar |
|---|---|---|
| A | `@` | Fly ka IPv4 (`flyctl ips list`) |
| AAAA | `@` | Fly ka IPv6 |
| CNAME | `www` | `oyebazar-web.fly.dev` |

Certificate khud ba khud ban jata hai — `flyctl certs show -a oyebazar-web oyebazar.com`
se halat dekhi ja sakti hai.

---

## 4 · Deploy ke baad — teen cheezein foran jaanchen

1. **Login chalta hai?** Apne number par OTP mangwayen. Na aaye to WhatsApp ke secrets
   ghalat hain — aur us soorat mein koi bhi andar nahi aa sakta.
2. **Tasveer chart-hti hai?** Ek maal par tasveer lagayen. Na charhe to Supabase ke
   secrets ya bucket ka naam ghalat hai.
3. **Status pack banta hai?** Reseller ke catalogue se ek pack banayen. Na bane to
   `REDIS_URL` khali hai ya worker chal nahi raha (`flyctl logs -a oyebazar-worker`).

---

## 5 · Roz ka kaam

```bash
flyctl logs -a oyebazar-web
flyctl status -a oyebazar-web
flyctl deploy -c fly.web.toml --remote-only   # naya code
```

Naya migration banaye to **deploy se pehle** qadam 3 dobara chalayen — code jo column
maangta hai wo DB mein maujood hona chahiye, warna safha 500 deta hai.
