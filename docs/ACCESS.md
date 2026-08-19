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

## 0. Saare raaste ek jagah

Production par `http://localhost:3000` ki jagah `https://oyebazar.com`.

### Bina login (koi bhi khol sakta hai)

| Safha | Raasta |
|---|---|
| Home | `/` |
| Bazaar — dukanon ki directory | `/bazaar` |
| Ek dukan ka safha | `/bazaar/<slug>` — misal `/bazaar/al-madina-fabrics` |
| Nayi dukan ki darkhwast | `/supplier/join` |
| Order ka magic link (WhatsApp se) | `/supplier/o/<token>` |

🔴 Bazaar par koi rate nahi aur koi order button nahi — ye qanooni faisla hai, dekhen §2.

### Reseller

| Safha | Raasta |
|---|---|
| Login / naya account | `/login` |
| Dashboard | `/dashboard` |
| Catalogue | `/catalogue` |
| Maal ka safha + Content Studio | `/catalogue/<productId>` |
| Naya order | `/orders/new/<productId>` |
| Apne order | `/orders` |

### Wholesaler

| Safha | Raasta |
|---|---|
| Login | `/supplier/login` |
| Aaye hue order | `/supplier/orders` |
| Apna maal — stock, tasveerein, rate | `/supplier/stock` |

### Ops / Admin

| Safha | Raasta | Kam se kam darja |
|---|---|---|
| Login | `/admin/login` | — |
| Dashboard | `/admin` | REVIEWER |
| Orders | `/admin/orders` | REVIEWER |
| Wholesalers | `/admin/suppliers` | REVIEWER |
| Products + rate ki darkhwasten | `/admin/products` | REVIEWER (faisla: MANAGER) |
| Resellers | `/admin/resellers` | REVIEWER |
| Money — fee, invoice | `/admin/money` | REVIEWER (invoice: SUPER_ADMIN) |
| Team | `/admin/team` | SUPER_ADMIN |

Dekhna aur karna alag cheezen hain: REVIEWER har safha khol sakta hai magar wahan ka koi
button nahi chalta (rok service mein hai, UI par nahi — §3).

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

Maal par ek se zyada tasveerein hon to Content Studio mein "کون سی تصویر؟" wali patti
aati hai — har tasveer ka apna pack banta hai aur apna cache rakhta hai. Ek hi tasveer
ho to ye patti nahi aati (3-tap ka usool).

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

Andar kya hai: aaye hue order (qubool/mana), aur apna maal — stock on/off, aur har maal
ki tasveerein aur video.

### Rate badalna — do alag raaste

| Maal ki halat | Kaun badal sakta hai |
|---|---|
| `DRAFT` (abhi manzoor nahi hua) | **wholesaler khud** — naam, rate, category, ginti, sab |
| `LIVE` | **sirf ops ki manzoori se** — wholesaler darkhwast bhejta hai |

🔴 LIVE par ye rok kaarobari hai, technical nahi. Reseller apna retail rate save kar
chuki hoti hai aur us ka status pack pehle se WhatsApp par laga hua hota hai. Rate barhte
hi `bajiPrice` barhta hai — aur ab wo pack us rate ka elaan kar raha hota hai jo us ki
apni lagat se KAM hai. Usay pata tab chalta hai jab customer haan keh chuka hota hai aur
order fail hota hai. Itla ye nuqsan nahi rokti, sirf khabar deti hai.

Manzoori dete waqt ops ko `/admin/products` par saaf dikhta hai ke **kitni resellers ka
saved rate naye cost se neeche hai** — wohi log jin ka pehle se laga hua pack loss par
bik raha hoga. Manzoori usi lamhe un ka rate bhi theek kar deti hai (naye `suggestedRetail`
par), warna un ka agla status pack apni lagat se kam ka rate chhap kar chala jata.

Ikhtiyar: **MANAGER** (`approvePriceChange`). Fee *rate* alag cheez hai aur wo
SUPER_ADMIN par hi rehta hai.

⚠ Jin resellers ka rate badla gaya, unhen WhatsApp par khabar bhejna abhi baqi hai — wo
worker ke paced job ka kaam hai (GOLDEN RULE #10: ek web request se sau paighaam nahi
ja sakte).

### Tasveerein aur video

Naya maal daalte waqt seedha phone se chuni jati hain, aur baad mein `/supplier/stock`
par har maal ke neeche "تصویریں" khol kar aur lagai ya hatai ja sakti hain.

| | |
|---|---|
| Qismein | JPG · PNG · WEBP · MP4 · MOV · WEBM |
| Hadd | tasveer 8 MB · video 50 MB · ek maal par 8 cheezein |
| Sarwarq | koi ek TASVEER — reseller ke Content Studio mein yehi pehle se chuni aati hai |

🔴 File ki qism us ke pehle bytes se pehchani jati hai, browser ke bataye hue
`Content-Type` se nahi. Dev mein upload `apps/web/public/_dev-media` mein girti hai
jahan se Next usay HAMARE apne origin se serve karta hai — wahan ek "image/jpeg" jo asal
mein HTML hai, us safhe par script chala kar reseller ki session cookie tak pohanch
sakti thi. Test: `packages/storage/src/sniff.test.ts`.

🔴 Video par status pack nahi banta (Playwright HTML screenshot se render hota hai).
Video sirf gallery mein chalta hai.

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

Ye sirf local ke hain — production par ye numbers mojood nahi. Koi password nahi; number
daalen aur screen par aaya hua OTP daal den.

Number DB mein hamesha E.164 mein rakha jata hai (`923004445566`), magar login par
`03004445566` likhna kaafi hai — dono ek hi cheez hain.

### Ops (seed se)

| Naam | Number | Role | Email |
|---|---|---|---|
| Ghulam Rasool | `03004445566` | SUPER_ADMIN | founder@oyebazar.com |
| Ops Coordinator | `03004445577` | COORDINATOR | coordinator@oyebazar.com |
| Auditor Sahib | `03005556677` | REVIEWER | audit@oyebazar.com |

Is machine par jaanch ke doran do aur bane the — `Ops Malik` (`03211234567`,
SUPER_ADMIN) aur `Sana Ops` (`03001119999`, MANAGER, **band**). Naye seed par ye nahi
aayenge; Sana ka account is liye band hai ke "Disable karte hi sessions khatam" wali baat
jaanchi ja sake.

### Reseller (seed se)

| Naam | Number | Sheher |
|---|---|---|
| صادیہ | `03001234567` | Lahore |
| عائشہ | `03009876543` | Karachi |
| حرا | `03331112233` | Rawalpindi |

Reseller ka account khud-ba-khud banta hai, is liye is machine par kuch aur bhi hain jo
jaanch ke doran `/login` se bane.

### Wholesaler — saari 13 dukanen VERIFIED aur Bazaar par listed hain

| Dukan | Number | Sheher |
|---|---|---|
| المدینہ فیبرکس | `03001200000` | Karachi |
| نور ٹیکسٹائل | `03001200010` | Karachi |
| شہزاد کلاتھ ہاؤس | `03001200020` | Lahore |
| گلبرگ کلیکشن | `03001200030` | Lahore |
| فیصل فیبرکس | `03001200040` | Faisalabad |
| رحمان ٹریڈرز | `03001200050` | Karachi |
| خان الیکٹرانکس | `03001200060` | Rawalpindi |
| Crescent Cosmetics | `03001264508` | Karachi |
| Metro Home Supplies | `03001222951` | Lahore |
| Multan Dry Fruits & Spices | `03001299665` | Multan |
| Peshawar Crockery House | `03001240160` | Peshawar |
| Sialkot Sports Co. | `03001201884` | Sialkot |
| Gujranwala Steel House | `03217654321` | Gujranwala |

Dukan ka naam usi zaban mein rehta hai jo us ne khud likha — Bazaar par tarjuma nahi
hota, kyunke naam pehchan hai.

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
