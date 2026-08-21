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

Ye tay ho chuke hain:

| cheez | faisla | wajah |
|---|---|---|
| Database | **Supabase** | Tasveerein waise bhi Supabase storage par jati hain (code aur config dono usi par hain). Ek vendor = ek region, ek bill, kam tootne wali jagahen. Neon par jana ho to sirf `DATABASE_URL`/`DIRECT_URL` badalte hain — koi darwaza band nahi. |
| Region | **Singapore (`sin`)** — DB bhi wahin (ap-southeast-1) | Har safha DB se baat karta hai. App aur DB alag ilaqon mein hon to har query par faasle ka waqt lagta hai, aur ek safhe par kai query hoti hain. |
| Redis | **Upstash** | Iske baghair status pack render nahi hota (queue log-only mode mein chali jati hai) — aur wohi is karobar ka asal kaam hai. |
| WhatsApp | **abhi nahi** | 🔴 Neeche parhen — is ka natija saaf samajh lena zaroori hai. |

### 🔴 WhatsApp ke baghair live jane ka matlab

Provider na ho to paighaam kahin nahi jate — sirf server ke **logs mein chhapte hain**.
Amal mein is ka matlab:

* Aap khud `flyctl logs -a oyebazar-web` se OTP parh kar andar aa sakte hain.
* **Koi asli reseller ya dukan wala andar nahi aa sakega** — usay code kabhi nahi milega.
* Jis ke paas logs ka rasta hai, wo kisi ke bhi number par OTP parh sakta hai.

Is liye site chalu to ho jayegi, magar **us ka pata kisi ko na den** jab tak WATI ya
Meta na lag jaye. Wo lagte hi `WHATSAPP_PROVIDER` set karen aur dobara deploy — aur kuch
nahi badalta.

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

# 2) Secrets — .env.production bhar kar, ek hi command se dono apps par
#    (qadrein terminal par kabhi nahi chhapti — dekhen scripts/fly-secrets.mjs)
cp .env.production.example .env.production   # phir isay bharen
node scripts/fly-secrets.mjs --dry-run       # pehle dekh len kya ja raha hai
node scripts/fly-secrets.mjs

# --- ya haath se, agar zyada pasand ho ---
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
