# Claude ke liye — is repo par kaam shuru karne se pehle

> Ye file un cheezon ke liye hai jo **har session mein dobara maloom karni parti hain**.
> Karobari qawaid `docs/CONVENTIONS.md` mein hain (golden rules — wo pehle parhen), aur
> dhancha `docs/ARCHITECTURE.md` mein. Ye file un ki naqal nahi.

## 🔴 1 · Is repo par ek se ziyada session saath kaam karta hai

Shuru karte hi:

```bash
git fetch origin && git pull --ff-only origin main
```

Aur kaam khatam kar ke **push karen**.

29 August ko ek session ne pull kiya to doosre ke **12 commits** mile — godown, ops ki
chhanni, Redis rate limiter, health check. Us waqt tak us session ki "kya baqi hai" wali
poori fehrist **purani ho chuki thi**, aur wo us par mashwara de raha tha.

**"Kya bana hua hai" ka jawab CODE se len, yaadasht se nahi.** Aur `grep -l` par bharosa
na karen: `grep -l 'tier'` ne do dafa jhoota "mojood hai" diya, jabke wo column sirf
dikhaya jata tha — kisi faisle mein istemal kahin nahi hota tha. Pehle **asal istemal**
dekhen, phir kahen.

## 🔴 2 · Deploy — web PEHLE, worker BAAD mein

```bash
flyctl deploy -c fly.web.toml --remote-only      # migrations yahin chalti hain
flyctl deploy -c fly.worker.toml --remote-only
```

Migrations **haath se na chalayen**. `fly.web.toml` mein `release_command` hai jo unhen
deploy se pehle chalata hai, purane version ke chalte hue — aur nakaam hone par naya code
live hota hi nahi.

Wajah tajurbe se hai: ek dafa code migration se pehle live ho gaya aur production ne har
order ke safhe par `Order.courier does not exist` dena shuru kar diya. Worker pehle bhej
dena wohi kharabi wapas laata hai.

Ek aur faida: prod ka `DATABASE_URL` kisi ke laptop par utarne ki zaroorat nahi. Local
`.env` **localhost** par hai — wo production nahi hai.

## 3 · Do cheezein jo chup chaap todti hain

- **`npx prisma` na chalayen** — wo v7 utha leta hai jabke project v6 par hai. `pnpm db:*`
  istemal karen.
- **Dev server chalte hue `next build` na chalayen** — wo `.next` ko clobber kar deta hai
  aur React load hona band ho jata hai. Test "kuch nahi hua" wala jhoota jawab dete hain.

### 🔴 `turbo` chalate waqt `CI=true` lagayen

`pnpm run` har script se PEHLE khud `install` chalata hai, aur `turbo` un ko parallel
chalata hai — wo aapas mein takra kar `node_modules` **purge** karne ki koshish karte
hain:

```
ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY
```

31 August ko wo waqai purge ho gaya: `tsc` aur `eslint-plugin-react-hooks` tak gayab ho
gaye, aur "test fail" us kharabi ki wajah se dikhne laga jo code mein thi hi nahi.

```bash
CI=true npx turbo run typecheck test lint
```

Purge ho jaye to: `CI=true pnpm install --no-frozen-lockfile` **aur** `pnpm db:generate`
(Prisma client `node_modules` mein rehta hai, wo bhi jata hai).

Shak ho to har package mein seedha `./node_modules/.bin/tsc` aur `./node_modules/.bin/vitest`
chala lena zyada bharosemand hai — us mein pnpm beech mein aata hi nahi.

**Aur ek flaky test:** `apps/web` ka `dev-otp.test.ts` ~4s leta hai. Turbo ke dabao mein
wo kabhi kabhi waqt se aage nikal jata hai. Akele chalane par pass ho to wo kharabi nahi.

## 4 · Live jaanchne ke usool

- **Screenshot par bharosa karen, background tab ki naap par nahi.** Background tab mein
  animation ki ghari ruki rehti hai (`currentTime: 0`) aur `requestAnimationFrame` chalta
  hi nahi — yani transition aur `opacity` ke naap jhoot bolte hain.
- Pack ki tabdeeli **cache key** badle baghair nazar nahi aayegi (`packOptionsKey`). Ye
  design hai: purane pack dobara render karne ka matlab ek raat ka poora budget hai.

## 5 · Abhi kya MOJOOD NAHI hai

30 August tak — code se jaancha, andaza nahi:

| | |
|---|---|
| Ek tasveer mein kai maal (collage) | ❌ ek pack = ek maal |
| Rate ki hadd (MAP) | ❌ dukan ki taraf se koi hadd nahi. (Reseller `bajiPrice` se neeche nahi ja sakti — wo `pricing.service.ts` mein pehle se hai.) |

🔴 Mara hua code jo zinda dikhta ho, wo aam mare hue code se khatarnak hai: koi us par
bharosa kar ke feature bana leta hai jo kabhi chala hi nahi.

**30 August ko ye ban gaya** (jadwal se hataya): nayi reseller ka onboarding, `Customer`
model (+ backfill), dukan ke portal mein order ki guftagu, payout ki rasid, har card par
bikri ki ginti, ops ka Activity daftar, order ki talash, AI se maal ke khaane, ops ka
`Fix name`, order ki guftagu par TASVEER (`photoUrl` ab zinda hai), dashboard par dobara
aane wale customer, aur `referredById` (ab zinda — `/?ref=<id>`). `Tier` MITA diya gaya:
wo har qatar par 'NEW' chhapta tha aur kabhi badalta hi nahi tha. Saath: adhoori wapsi
(`OrderItem.returnedQty`), aur bonus (signup Rs 500, referral Rs 100 tak — fee se, aur
sirf pehle 300).

## 🔴 6 · AI abhi CHALA hi nahi hai

`ANTHROPIC_API_KEY` production par **set nahi** hai. Nateeja:

- Status ke jumle (`ClaudePitchWriter`) har dafa chup chaap template par girte hain — wo
  model aaj tak ek dafa bhi nahi chala.
- Tasveer se maal ke khaane bharne wala button (`ProductDescriber`) **dikhta hi nahi** —
  `createProductDescriber()` key ke baghair `null` deta hai aur safhe us par button
  chhupa dete hain.

```bash
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-... -a oyebazar-web
```

🔴 Yani AI ke bare mein koi bhi baat "chal raha hai" ke tor par na likhen jab tak key na
lage aur us par ek asli maal na chala liya jaye. Model ka jawab kaisa aata hai, ye abhi
**kisi ne dekha hi nahi**.

## 🔴 7 · Ek khula hua khatra

`STATIC_OTP=112233` production par laga hua hai — yani har OTP wohi hai. API ab wo code
**wapas nahi** deti (29 Aug), magar andaza lagaya ja sakta hai.

Hal do qadam hai, **isi tarteeb mein**:

1. `WHATSAPP_PROVIDER` set ho (WATI), taake asli OTP pohanche
2. **Us ke baad** `STATIC_OTP` hataya jaye

Ulta karna khud ko bahar kar dena hai — provider ke baghair kisi ko koi code nahi milega,
team ko bhi nahi.

Aur ek nateeja jo isi se nikalta hai: **ops ka login production mein khulta hi nahi.**
Ops jaan boojh kar `STATIC_OTP` se BAHAR hai (`container.ts` — "Ops is se bahar hai"),
aur provider na hone ki wajah se asli code sirf Fly ke log mein likha jata hai:

```bash
flyctl logs -a oyebazar-web --no-tail | grep baji_login_otp | tail -1
```

Ye chalne ka tareeqa nahi hai — jis din team barhegi, har banda malik ko phone karega.

## 🔴 8 · Home page ek waada kar raha hai jo abhi poora nahi hota

`step2` (i18n) par likha hai:

> روز صبح ۹ بجے آپ کو واٹس ایپ پر ۵ پیک ملتے ہیں

WhatsApp ka provider laga hua nahi, is liye **koi pack kisi ko nahi jata**. Jo reseller ye
parh kar signup kare, wo agli subah intezar karegi, kuch nahi aayega — aur wo **bataye
baghair chali jayegi**. Ye us qism ka nuqsan hai jo kabhi kisi report mein nazar nahi
aata.

Do hi raste hain: provider laga den, ya us waqt tak wo jumla badal den. Ye faisla malik
ka hai — magar jab tak koi ek na ho, pehla asli reseller isi par kho sakta hai.
