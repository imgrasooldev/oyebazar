# Logins aur URLs — OyeBazar

Kaun kahan se andar aata hai, aur kis ke paas kitna ikhtiyar hai.

Production par domain `oyebazar.com` hai; neeche ke raaste wahan bhi wohi hain
(`http://localhost:3000` ki jagah `https://oyebazar.com`).

> **"Credentials kahan hain?"** — kahin nahi, aur ye jaan boojh kar hai. Kisi ka bhi
> login us ke **WhatsApp number** se hota hai; wohi us ki pehchan hai. Super admin ka
> "credential" = wo number jo `OpsUser` mein `SUPER_ADMIN` ke taur par darj hai.

**Poore system mein koi password nahi hai.** Har login WhatsApp OTP se hota hai: number
daalen, 6 hindson ka code aata hai, andar. Wajah [ARCHITECTURE.md](./ARCHITECTURE.md)
mein hai — phone kho jaye ya kisi aur ke haath lag jaye to session foran khatam ki ja
sakti hai, jo password ke sath mumkin nahi.

---

## 1. Reseller (bahenein jo status par bechti hain)

| | |
|---|---|
| Login | `/login` |
| Naya account | wohi safha — number naya ho to naam aur sheher poochh kar **foran** ban jata hai |
| Login ke baad | `/dashboard` |
| Cookie | `oyebazar_session` · 7 din |

Reseller ka account **khud-ba-khud chalu** ho jata hai. Bachao aage hai: order us ki
apni tasdeeq ke baghair wholesaler tak jata hi nahi.

Andar kya hai: dashboard (kamai, ruke hue order), catalogue + Content Studio (status
pack), orders, bazaar.

---

## 2. Wholesaler (dukan wale)

| | |
|---|---|
| Login | `/supplier/login` |
| Nayi dukan ki darkhwast | `/supplier/join` |
| Login ke baad | `/supplier/orders` |
| Cookie | `oyebazar_supplier` · 7 din |

Login **sirf VERIFIED dukan** kar sakti hai. Darkhwast bhejne se dukan live nahi hoti —
wo `PENDING` banti hai aur ops team admin portal se manzoori deti hai ya rabta kar ke
baqi tafseel mukammal karti hai.

Andar kya hai: aaye hue order (qubool/mana), aur apna maal — stock on/off.

### Magic link — bina login

Jab order us ke paas jata hai, WhatsApp par link jata hai:

```
/supplier/o/<token>
```

Ye link **sirf wohi ek order** kholta hai aur login nahi maangta — dukan par jaldi mein
yehi kaam ka hai. Token 32 bytes ka hai, ek hi order par chalta hai, aur us safhe par
reseller ka retail rate kabhi nahi dikhta (sirf wholesaler ki apni raqam).

---

## 3. Admin / super admin (ops team)

| | |
|---|---|
| Login | `/admin/login` |
| Login ke baad | `/admin` |
| Cookie | `oyebazar_admin` · **24 ghante** (baqi 7 din) |

Session chhoti hai kyunke is portal se poora karobar chalta hai.

### Chaar darjay

Barhte hue — upar wale ke paas neeche walon ka sab kuch hota hai.

| Role | Kis ke liye | Kya kar sakta hai |
|---|---|---|
| `REVIEWER` | Auditor, investor, naya banda | **Sab kuch dekhna** — order, maal, resellers, paisa. Badalna kuch nahi. |
| `COORDINATOR` | Rozana chalane wala | Us ke ilawa: order aage barhana (wholesaler ko bhejna, dispatched/delivered/RTO) |
| `MANAGER` | Team lead | Us ke ilawa: dukan verify/list/band, maal LIVE/archive, reseller band, invoice "paid" |
| `SUPER_ADMIN` | Malik | Us ke ilawa: **fee rate**, **invoice banana**, aur **team** (naye user, role, access) |

Fee rate aur invoice SUPER_ADMIN tak mehdood hain kyunke dono seedha kamai ka faisla
hain: ek ghalat click se supplier hamesha ke liye 0% par chala jata hai, aur invoice
banate hi ledger ki rows `PENDING` se `INVOICED` ho jati hain aur wapas nahi hoti.

Naya user by default **REVIEWER** banta hai — sab se kam ikhtiyar. Barhana aasan hai;
"pehle sab kuch de do, baad mein kam kar denge" kabhi yaad nahi rehta.

🔴 Roles aur har ikhtiyar ek hi file mein likhe hain:
`packages/core/src/domain/ops-permissions.ts`. Service wahin se rokti hai aur Team ka
safha wahin se jadwal banata hai — do jagah likhne ka anjaam yehi hota hai ke UI kuch
aur kehti hai aur server kuch aur karta hai.

🔴 Ye rok **service mein** hai, UI par nahi — button chhupana kaafi nahi hota, koi bhi
seedha API call kar sakta hai.

### Screens

`/admin` dashboard · `/admin/orders` · `/admin/suppliers` · `/admin/products` ·
`/admin/resellers` · `/admin/money` · `/admin/team`

### 🔴 Pehla super admin — nayi (production) database par

Nayi DB par koi ops user hota hi nahi: `/admin/login` par koi andar nahi ja sakta, aur
Team ka safha bhi kaam nahi aata kyunke wo pehle se mojood SUPER_ADMIN maangta hai.
Pehla darwaza CLI se khulta hai:

```bash
pnpm db:ops-user -- --name "Ghulam Rasool" --email me@oyebazar.com --phone 03004445566
```

Fly.io par:

```bash
fly ssh console -C "pnpm db:ops-user -- --name 'Naam' --email a@oyebazar.com --phone 03001234567"
```

Role na den to `SUPER_ADMIN` banta hai. Number pehle se mojood ho to CLI kuch nahi
badalti — sirf batati hai (chup chaap kisi ka access badalna sab se bura anjaam hai).

Is ke baad ki saari team **`/admin/team`** se banti hai.

### Naya ops user kaise bane

**`/admin/team`** se — sirf SUPER_ADMIN. Naam, email, WhatsApp number aur role daal den; login
usi number se hoga (koi password nahi). Usi safhe par role badalna aur access band/chalu
karna bhi hai, aur ek jadwal jo batati hai ke har role kya kar sakta hai.

Kisi ke jane par **Disable** — us ki saari sessions usi waqt khatam ho jati hain, agle
din tak khula hua browser nahi chalta.

🔴 Do cheezen jaan boojh kar roki gayi hain: **apna role khud badalna** aur **khud ko band
karna**. Wajah amli hai — aakhri SUPER_ADMIN khud ko gira de to fee rate aur invoice ka
darwaza hamesha ke liye band ho jata hai, aur koi bacha hi nahi jo usay wapas khole.

---

## 4. Dev machine par test accounts

Ye sirf local seed ke hain. Production par ye numbers mojood nahi.

### Ops

| Naam | Number | Role |
|---|---|---|
| Ghulam Rasool | `03004445566` | SUPER_ADMIN |
| Ops Coordinator | `03004445577` | COORDINATOR |
| Auditor Sahib | `03005556677` | REVIEWER |

### Reseller

| Naam | Number |
|---|---|
| صادیہ | `03001234567` |
| عائشہ | `03009876543` |
| حرا | `03331112233` |

### Wholesaler

| Dukan | Number |
|---|---|
| المدینہ فیبرکس | `03001200000` |
| نور ٹیکسٹائل | `03001200010` |
| فیصل فیبرکس | `03001200040` |

### Dev par OTP kahan se milta hai

Do jagah, dono se kaam chal jata hai:

1. **Safhe par hi** — dev mein code login screen par ek kaale dabbe mein dikhta hai aur
   khana pehle se bhara hota hai. Production mein ye kabhi nahi aata (do taale:
   `NODE_ENV` aur messaging provider — dekhen `apps/web/__tests__/security/dev-otp.test.ts`).
2. **Terminal mein** — dev server ke log mein `whatsapp_template_dev` line.

### Status pack dev mein render karne ke liye

Dev mein Redis nahi hota, is liye render queue sirf log likhti hai aur Content Studio
mein "ban raha hai…" ruka rehta hai. Ek dafa chala kar chhor den:

```bash
pnpm --filter @oyebazar/worker render:watch
```

---

## 5. Teen alag cookies — kyun

`oyebazar_session` (reseller) · `oyebazar_supplier` (wholesaler) · `oyebazar_admin` (ops)

Ek hi naam hota to ek login doosre ko gira deta. Ye rozana hota: dukan par ek hi
computer se beta reseller ka kaam bhi karta hai, aur ops ka banda support ke liye
reseller ka account bhi khol kar dekhta hai.

Hifazat sirf naam par nahi hai — har session par likha hota hai ke wo **kis** ki hai
(`resellerId` / `supplierId` / `opsUserId`). Reseller ka asli token admin cookie mein
chipka dein to bhi andar nahi jaya ja sakta; jaancha gaya hai.

---

## 6. Secrets kahan hain

🔴 Is document mein koi asli password ya key nahi hai, aur nahi honi chahiye. Yahan sirf
ye likha hai ke kaunsi cheez kahan rakhi jati hai.

| | |
|---|---|
| Local machine | `.env` (git se bahar — `.gitignore` mein hai) |
| Naya developer | `.env.example` copy kar ke `.env` banaye |
| Production (Fly.io) | `fly secrets set KEY=value` — kabhi repo mein nahi |

Kya kya set hota hai:

| Key | Kis liye |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Postgres (Neon ya local) |
| `APP_URL` | Magic link isi se banta hai — production par `https://oyebazar.com` |
| `WHATSAPP_PROVIDER` | `console` (dev) ya `wati` (asli) |
| `WATI_API_URL` / `WATI_API_KEY` | WhatsApp bhejne ke liye — OTP aur order ke paighaam |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `SUPABASE_BUCKET` | Status pack ki tasveerein |
| `REDIS_URL` | Render queue (na ho to dev mein sirf log) |
| `OPS_API_KEY` | Purane `/api/v1/ops/*` endpoints — naya admin portal is se nahi chalta |
| `DEFAULT_FEE_RATE_BPS` | Nayi dukan ka default fee rate (500 = 5%) |
| `RENDER_CONCURRENCY` | Worker ek waqt mein kitne pack banaye |

`NODE_ENV` yahan **set na karen** — Next/Node khud karte hain. `.env` mein reh jaye to
production build tootti hai aur session cookie `secure` nahi rehti.

---

## 7. Local par sab kuch chalane ke liye

Teen cheezen, teen terminal:

```bash
pnpm db:local     # Postgres (embedded, port 5433)
pnpm dev          # website — http://localhost:3000
pnpm --filter @oyebazar/worker render:watch   # status pack banata hai
```

Pehli dafa:

```bash
pnpm install
pnpm db:migrate:deploy
pnpm db:seed
```

Seed ke baad upar wale (§4) saare test accounts kaam karne lag jate hain.
