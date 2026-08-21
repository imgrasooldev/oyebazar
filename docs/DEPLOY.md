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

### Beech ka rasta: muqarrar (static) OTP

`STATIC_OTP="112233"` lagane par **reseller aur dukan** us ek code se andar aa sakte hain
— WhatsApp ke baghair bhi. Soft launch mein maal daalne aur chala kar dekhne ke liye ye
kaafi hai.

🔴 Us ki qeemat saaf samajh len: jo bhi ye code jaan le, wo **kisi bhi mojood number** se
andar aa sakta hai, aur code badalta na hone ki wajah se ek dafa leak ho kar hamesha
khula rehta hai. Ye sirf us arse ke liye hai jab site ka pata girey huay logon tak na
pohancha ho.

Teen cheezein phir bhi qaim rehti hain — aur inhen halka na samjhen:

* **Ops (admin) is se BAHAR hai.** Wahan poora paisa aur sab ka data hai; us ka code
  waise hi random rehta hai aur `flyctl logs -a oyebazar-web` se parha jata hai.
* Challenge asli hai: 5 minute ki mudat, ghalat koshishon ki hadd, aur rate limit — sab
  lagti hain. Ghalat code ab bhi "Code ghalat hai" deta hai.
* Session ke token aur dukan ke magic link **kabhi** muqarrar nahi hote — wo hamesha
  crypto-random hain.

WhatsApp lagte hi `STATIC_OTP` **khali kar ke** dobara deploy karen. Jab tak ye laga hai,
app har boot par log mein `static_otp_enabled` chillati hai — taake wo bhoola na ja sake.

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

---

## 4 · Domain — `oyebazar.com`

Do raste hain. **Nameserver badalna sirf doosre raste mein zaroori hai.**

### Rasta A — jahan domain khareeda, wahin records (saada)

Nameserver waise hi rehne den; sirf teen record daalen:

| record | naam | qadar | TTL |
|---|---|---|---|
| A | `@` | Fly ka IPv4 — `flyctl ips list -a oyebazar-web` | 300 |
| AAAA | `@` | Fly ka IPv6 — usi command se | 300 |
| CNAME | `www` | `oyebazar-web.fly.dev` | 300 |

**Bhari hui misal** (qadrein farzi hain — asli `flyctl ips list` se aati hain):

| record | naam | qadar | TTL |
|---|---|---|---|
| A | `@` | `66.241.125.84` | 300 |
| AAAA | `@` | `2a09:8280:1::4c:9f21:0` | 300 |
| CNAME | `www` | `oyebazar-web.fly.dev` | 300 |

Kaun si qadar **pakki** hai aur kaun si badlegi:

* `oyebazar-web.fly.dev` — **pakka**. Ye app ka naam hai (`fly.web.toml`), aur ye badalta nahi.
* Dono IP — **farzi**. App banne par Fly apne IP deta hai; wohi daalne hain.
* Naam ka khana (`@`, `www`): kuch registrar `@` ki jagah `oyebazar.com` maangte hain,
  aur kuch khali khana chhorne ko kehte hain — teenon ka matlab ek hi hai (apex domain).

IPv4 pehli dafa allocate karna parta hai (muft, shared):

```bash
flyctl ips allocate-v4 --shared -a oyebazar-web
flyctl ips allocate-v6 -a oyebazar-web
flyctl ips list -a oyebazar-web
```

Phir certificate:

```bash
flyctl certs add -a oyebazar-web oyebazar.com
flyctl certs add -a oyebazar-web www.oyebazar.com
flyctl certs show -a oyebazar-web oyebazar.com   # halat dekhne ke liye
```

Certificate khud ban jata hai (DNS phailne ke baad, aksar 5–30 minute).

### Rasta B — Cloudflare (nameserver badalte hain)

Faida: Bazaar ke safhe (jo Google se aate hain) Cloudflare ke edge se milte hain, yani
Pakistan mein foran khulte hain. Ye wohi cheez hai jo raftar par sab se zyada asar
dalti hai.

1. Cloudflare par domain add karen → wo **do nameserver** deta hai.
2. Wo dono nameserver domain ke registrar par daal den (yahi "nameserver badalna" hai).
3. Cloudflare mein:

| type | naam | qadar | proxy |
|---|---|---|---|
| CNAME | `@` | `oyebazar-web.fly.dev` | 🟠 on |
| CNAME | `www` | `oyebazar-web.fly.dev` | 🟠 on |

Nameserver ki misal (farzi — Cloudflare aap ko apne do naam deta hai):

```
adam.ns.cloudflare.com
bella.ns.cloudflare.com
```

Ye dono registrar par "Custom nameservers" mein daalte hain, aur purane (registrar ke
apne) nameserver hata dete hain. Phailne mein 1–24 ghante lag sakte hain.

4. SSL/TLS mode: **Full (strict)**.
5. Certificate banwate waqt proxy thori der 🌥️ off rakhen (DNS-only), warna Fly ki
   tasdeeq Cloudflare par ruk jati hai. Ban jane ke baad wapas on.

🔴 **Rasta B ke saath ek secret lazmi hai:** `TRUST_CLOUDFLARE="1"`.

Wajah: Cloudflare ke peechay Fly ko sirf Cloudflare ka IP nazar aata hai. Us ke baghair
hamari rate limit poore mulk ko **ek hi banda** samajhti hai — ek reseller ki hadd sab
par lag jati hai, aur OTP par lagi brute-force ki rok bemani ho jati hai. Ye secret
lagte hi asli banda `cf-connecting-ip` se pehchana jata hai.

Ulta bhi utna hi ahem: **Cloudflare saamne na ho to ye secret na lagayen** — us soorat
mein koi bhi wo header khud bhej kar hadd se bach sakta hai.

### Kaun sa rasta?

Rasta A se shuru karen — kam purze, aur aaj hi chal jata hai. Cloudflare baad mein
kabhi bhi lagaya ja sakta hai (nameserver badal kar), aur us waqt sirf ek secret aur
lagta hai. Ulta karna (Cloudflare se hatana) bhi utna hi aasan hai.

---

## 5 · Deploy ke baad — teen cheezein foran jaanchen

1. **Login chalta hai?** Apne number par OTP mangwayen. Na aaye to WhatsApp ke secrets
   ghalat hain — aur us soorat mein koi bhi andar nahi aa sakta.
2. **Tasveer chart-hti hai?** Ek maal par tasveer lagayen. Na charhe to Supabase ke
   secrets ya bucket ka naam ghalat hai.
3. **Status pack banta hai?** Reseller ke catalogue se ek pack banayen. Na bane to
   `REDIS_URL` khali hai ya worker chal nahi raha (`flyctl logs -a oyebazar-worker`).

---

## 6 · Roz ka kaam

```bash
flyctl logs -a oyebazar-web
flyctl status -a oyebazar-web
flyctl deploy -c fly.web.toml --remote-only   # naya code
```

Naya migration banaye to **deploy se pehle** qadam 3 dobara chalayen — code jo column
maangta hai wo DB mein maujood hona chahiye, warna safha 500 deta hai.
