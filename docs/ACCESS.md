# Logins aur URLs — OyeBazar

Kaun kahan se andar aata hai, us ke paas kitna ikhtiyar hai, aur test ke liye kaun sa
number chalta hai. Production par `http://localhost:3000` ki jagah `https://oyebazar.com`
lagayen — baqi sab wohi rehta hai.

> ### Sab se pehle: koi password hai hi nahi
>
> Har login WhatsApp OTP se hota hai — number daalen, 6 hindson ka code aata hai, andar.
> "Credential" ka matlab is nizam mein sirf ek cheez hai: **WhatsApp number**.
>
> Wajah: phone kisi aur ke haath lag jaye to session ek click mein khatam ki ja sakti
> hai. Password ke saath ye mumkin nahi — wo badalna parta hai, aur us ke saath wo har
> jagah badalna parta hai jahan banday ne wohi password rakha hua ho.

---

## 1. Saare logins — chaar alag darwaze

Chaar surface hain aur **har ek ka apna login safha, apna khaata aur apni cookie** hai.
Ek surface ka khaata doosre par nahi chalta — chahe number wohi ho.

| Surface | Kahan se andar | Khaata kis table mein | Section |
|---|---|---|---|
| Reseller | `/login` | `Reseller` | [§1.1](#11-reseller--login) |
| Wholesaler (dukan) | `/supplier/login` | `Supplier` | [§1.2](#12-wholesaler--supplierlogin) |
| Admin (malik) | `/admin/login` | `OpsUser` · `SUPER_ADMIN` | [§1.3](#13-admin--malik-ka-khaata) |
| Admin ops (team) | `/admin/login` | `OpsUser` · baqi darjay | [§1.4](#14-admin-ops--team-ke-khaate) |

Ye khaate `prisma/seed-accounts.ts` banata hai, aur wo **dev aur production DONO** par
chalta hai (§1.5). Number DB mein E.164 mein rakha jata hai (`923004445566`), magar login
par `03004445566` likhna kaafi hai — dono ek hi cheez hain.

> ### Koi password hai hi nahi
>
> Har login WhatsApp OTP se hota hai — number daalen, 6 hindson ka code aata hai, andar.
> "Credential" ka matlab is nizam mein sirf ek cheez hai: **WhatsApp number**. Code kahan
> se milta hai, wo §1.6 mein hai.
>
> Wajah: phone kisi aur ke haath lag jaye to session ek click mein khatam ki ja sakti
> hai. Password ke saath ye mumkin nahi — wo badalna parta hai, aur us ke saath wo har
> jagah badalna parta hai jahan banday ne wohi password rakha hua ho.

---

### 1.1 Reseller — `/login`

`03002000001` se `03002000012`.

| # | Naam | Login number | Sheher |
|---|---|---|---|
| 1 | صادیہ | `03002000001` | Rawalpindi |
| 2 | حرا | `03002000002` | Lahore |
| 3 | عائشہ | `03002000003` | Karachi |
| 4 | مریم | `03002000004` | Lahore |
| 5 | فاطمہ | `03002000005` | Karachi |
| 6 | زینب | `03002000006` | Faisalabad |
| 7 | ایمان | `03002000007` | Islamabad |
| 8 | رابعہ | `03002000008` | Multan |
| 9 | خدیجہ | `03002000009` | Peshawar |
| 10 | ثنا | `03002000010` | Gujranwala |
| 11 | امینہ | `03002000011` | Sialkot |
| 12 | نورین | `03002000012` | Quetta |

> **Reseller ke liye ye fehrist hadd nahi hai.** `/login` par KOI bhi naya number daalen —
> naam aur sheher poochh kar khaata khud ban jata hai. Jitne chahiyen, utne.

**Jaanchte waqt kaam ki baat:** in mein se `صادیہ` (`03002000001`) ke paas asli order,
payout aur khata bhara hua hai; `حرا` (`03002000002`) bilkul khali hai. Nayi reseller
wala pehla safha (`FirstRun`) sirf khali khaate par khulta hai — dekhen
`packages/core/src/domain/first-run.ts`.

---

### 1.2 Wholesaler — `/supplier/login`

Number ek qaide se banta hai: `03001000001` se `03001000015` — tarteeb wohi jo
`seed-accounts.ts` ke `SUPPLIERS` mein hai.

| # | Dukan | Login number | Sheher |
|---|---|---|---|
| 1 | فیصل فیبرکس | `03001000001` | Faisalabad |
| 2 | شہزاد کلاتھ ہاؤس | `03001000002` | Lahore |
| 3 | الکرم ٹیکسٹائل | `03001000003` | Karachi |
| 4 | مدینہ سوٹ سینٹر | `03001000004` | Lahore |
| 5 | گجرانوالہ اسٹیل ہاؤس | `03001000005` | Gujranwala |
| 6 | ملتان ڈرائی فروٹ | `03001000006` | Multan |
| 7 | سیالکوٹ اسپورٹس | `03001000007` | Sialkot |
| 8 | پشاور کراکری ہاؤس | `03001000008` | Peshawar |
| 9 | کریسنٹ کاسمیٹکس | `03001000009` | Karachi |
| 10 | میٹرو ہوم سپلائیز | `03001000010` | Rawalpindi |
| 11 | نور جیولری | `03001000011` | Lahore |
| 12 | اقبال الیکٹرانکس | `03001000012` | Karachi |
| 13 | چناب لان | `03001000013` | Faisalabad |
| 14 | راوی کچن اسٹور | `03001000014` | Lahore |
| 15 | سوات ہینڈی کرافٹس | `03001000015` | Mingora |

🔴 **Reseller ki tarah khud khaata nahi banta.** Nayi dukan `/supplier/join` par form
bharti hai aur `PENDING` par baithti hai; usay ops `/admin/suppliers` se `VERIFIED`
karti hai. Ye jaan boojh kar hai — bina jaanchi dukan ka maal Bazaar par nahi jana
chahiye.

---

### 1.3 Admin — malik ka khaata

Ek hi khaata, `SUPER_ADMIN` darje par. Login `/admin/login` se.

| Naam | Login number | Darja | Kya kar sakta hai |
|---|---|---|---|
| Ghulam Rasool | `03004445566` | `SUPER_ADMIN` | **Sab kuch** — fee rate, invoice banana, team mein banda daalna/nikalna |

🔴 **Is khaate ka login production par `STATIC_OTP` se BAHAR hai** (`container.ts` —
"Ops is se bahar hai"). Yani us ka code har dafa naya banta hai, aur provider na hone ki
wajah se wo sirf Fly ke log mein likha jata hai:

```bash
flyctl logs -a oyebazar-web --no-tail | grep baji_login_otp | tail -1
```

Ye chalne ka tareeqa nahi hai aur ye maloom hai — hal WhatsApp provider hai (§1.7). Jab
tak wo nahi, admin ka login sirf us bande ke liye khulta hai jis ke paas Fly ka access ho.

---

### 1.4 Admin ops — team ke khaate

Wohi safha (`/admin/login`), magar neeche ke darjay. Har darje ka apna khaata is liye hai
ke **ikhtiyar ki rok ek hi khaate se test hi nahi ho sakti**: REVIEWER dekh sakta hai
magar badal nahi sakta, COORDINATOR order aage barha sakta hai magar fee ko haath nahi
laga sakta.

| Naam | Login number | Darja | Kya kar sakta hai |
|---|---|---|---|
| Ops Manager | `03004445567` | `MANAGER` | Dukanein aur maal manzoor karna, payouts |
| Ops Coordinator | `03004445568` | `COORDINATOR` | Order aage barhana |
| Ops Coordinator 2 | `03004445569` | `COORDINATOR` | Wohi — do bandon ka moqabla dekhne ko |
| Auditor Sahib | `03004445570` | `REVIEWER` | Sirf dekhna, badalna kuch nahi |

Naya banda:

```bash
pnpm db:ops-user -- --name "Naya Banda" --email a@oyebazar.com --phone 03004445571 --role COORDINATOR
```

Darjon ki poori tafseel §5 mein hai (kaun sa button kis darje par chhupta hai).

---

### 1.5 Ye khaate banaye kaise jate hain

```bash
pnpm --filter @oyebazar/db exec tsx prisma/seed-accounts.ts
```

🔴 **Ye script idempotent hai** — jo khaata pehle se ho usay chhoo kar nahi
guzarta (`findUnique` → `continue`). Is liye isay production par dobara chalana MEHFOOZ
hai: nayi entries jurh jati hain, purane khaate aur un ka data waisa ka waisa rehta hai.

Production par chalane ke liye `DATABASE_URL` chahiye — dekhen `docs/DEPLOY.md`.

---

### 1.6 OTP kahan milta hai

| Kahan | Reseller / Wholesaler | Admin aur Admin ops |
|---|---|---|
| **Dev** | Login safhe ke kaale dabbe mein, khana pehle se bhara | Wohi |
| **Production** | `STATIC_OTP` — har number par wohi ek code | ❌ is se BAHAR — code Fly ke log mein |

**Dev par** do jagah, dono se kaam chal jata hai:

1. **Safhe par hi** — login screen par ek kaale dabbe mein code likha aata hai aur khana
   pehle se bhara hota hai.
2. **Terminal mein** — dev server ke log mein `whatsapp_template_dev` wali line.

🔴 Ye asli code production mein kabhi nahi aata. Do taale lage hain: `NODE_ENV`,
aur messaging provider — dekhen `apps/web/__tests__/security/dev-otp.test.ts`.

**Production par** `STATIC_OTP` naam ka ek Fly secret laga hua hai.

> 🔴 **Us ki qadar is repo mein KAHIN nahi likhi jani, aur ye ehtiyat nazaryati nahi
> hai.** Ye repo **PUBLIC** hai — `github.com/imgrasooldev/oyebazar` bina kisi login ke
> khulta hai, aur `raw.githubusercontent.com` se har file seedha parhi ja sakti hai. Is
> safhe par upar wali teen tableein (150+ jaiz login number) bhi wahin se parhi ja sakti
> hain. Un ke saath agar wo code bhi likha ho, to koi bhi shakhs production par kisi bhi
> dukan ya reseller ke tor par andar aa sakta hai — bina kisi andaruni maloomat ke.
>
> 1 September ko wo qadar waqai `CLAUDE.md` mein likhi hui mili aur hata di gayi. **Magar
> hatana kaafi nahi: git ki history mein wo ab bhi mojood hai.** Us ka wahid asli hal
> qadar BADALNA hai (§1.7).

`flyctl secrets list -a oyebazar-web` us ka hona to batata hai, qadar nahi.

**Team ke liye wo qadar likhi hui hai — `.local/CREDENTIALS.md` mein.** Wo file
`.gitignore` mein hai (`.local/`), yani wo kabhi commit nahi hoti aur GitHub par nahi
jati. Us mein chaaron surface ke number aur OTP ek hi safhe par hain, saath admin/ops ka
code Fly ke log se nikalne ka tareeqa.

Repo private ho jaye to wo poori file yahin le aayi ja sakti hai — us waqt tak wo alag
rehni chahiye.

---

## 🔴 1.7 Ek khula hua khatra — parh kar aage barhen

Ye chaar baatein ALAG ALAG bilkul theek hain, magar **saath mein** ek poora darwaza
banati hain:

1. Har dukan ka WhatsApp number `/bazaar` par **bina login** chhapta hai — directory ki
   poori qeemat wohi hai, ye design hai.
2. Seed mein dukan ka `phone` (jis se LOGIN hota hai) aur `whatsappPublic` (jo chhapta
   hai) **ek hi qadar** hain.
3. `STATIC_OTP` laga hone ka matlab hai ke har number par wohi ek code chalta hai.
4. **Aur ye repo public hai** — yani upar wali fehristein bhi khuli hain, aur agar code
   kisi committed file mein likha ho to `/bazaar` kholne ki bhi zaroorat nahi rehti.

Yani koi bhi shakhs `/bazaar` khole, kisi dukan ka number parhe, `/supplier/login` par
daale, wo code likhe — aur us dukan ke portal mein hai: order, customer ke **naam, number
aur ghar ke pate**, payout. **Koi andaruni maloomat darkar nahi.**

Hal ki tarteeb, aur **isi tarteeb mein**:

1. `WHATSAPP_PROVIDER` set ho (WATI ka URL + key), taake asli OTP waqai pohanche
2. **Us ke baad** `STATIC_OTP` hataya jaye

🔴 Tarteeb ulti karna khud ko bahar kar dena hai: provider ke baghair `STATIC_OTP`
hatate hi kisi ko koi code nahi milega — team ko bhi nahi.

Jab tak wo nahi ho sakta, **do qadam jo abhi uthaye ja sakte hain**:

* Repo ko **private** kar dena (GitHub → Settings → Danger Zone → Change visibility).
  Ye sab se tez rok hai aur ek setting ka kaam hai.
* `STATIC_OTP` ki qadar **badal dena** — kyunke purani qadar git ki history mein reh gayi
  hai aur wahan se kabhi nahi nikalti:

  ```bash
  flyctl secrets set STATIC_OTP=<nayi chhe hindse> -a oyebazar-web
  ```

Us ke baad ye chaaron baatein mil kar bhi bay-zarar ho jati hain, kyunke code phir sirf
us number par pohanchta hai jo waqai us dukan ka hai.

---

## 2. Saare raaste — ek jagah

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

## 3. Reseller — us ka portal

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

## 4. Wholesaler — dukan ka portal

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

## 5. Admin — ops ka portal

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

## 6. Teen alag cookies — kyun

`oyebazar_session` (reseller) · `oyebazar_supplier` (wholesaler) · `oyebazar_admin` (ops)

Ek hi naam hota to ek login doosre ko gira deta. Ye rozana hota: dukan par ek hi
computer se beta reseller ka kaam bhi karta hai, aur ops ka banda support ke liye
reseller ka account bhi khol kar dekhta hai.

Hifazat sirf naam par nahi hai — har session par likha hota hai ke wo **kis** ki hai
(`resellerId` / `supplierId` / `opsUserId`). Reseller ka asli token admin cookie mein
chipka dein to bhi andar nahi jaya ja sakta; jaancha gaya hai.

---

## 7. Secrets kahan hain

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

## 8. Local par sab kuch chalane ke liye

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
