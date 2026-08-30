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

## 4 · Live jaanchne ke usool

- **Screenshot par bharosa karen, background tab ki naap par nahi.** Background tab mein
  animation ki ghari ruki rehti hai (`currentTime: 0`) aur `requestAnimationFrame` chalta
  hi nahi — yani transition aur `opacity` ke naap jhoot bolte hain.
- Pack ki tabdeeli **cache key** badle baghair nazar nahi aayegi (`packOptionsKey`). Ye
  design hai: purane pack dobara render karne ka matlab ek raat ka poora budget hai.

## 5 · Abhi kya MOJOOD NAHI hai

29 August tak — code se jaancha, andaza nahi:

| | |
|---|---|
| Nayi reseller ka onboarding | ❌ login ke baad seedha khali dashboard |
| `Customer` model | ❌ naam/number/pata sirf Order par strings hain |
| Ek tasveer mein kai maal (collage) | ❌ ek pack = ek maal |
| Rate ki hadd (price floor) | ❌ `suggestedRetail` sirf mashwara hai |
| `Tier` (NEW/BRONZE/SILVER/GOLD) | ⚠️ column hai, sirf dikhaya jata hai — **mara hua** |
| `Reseller.referredById` | ⚠️ column hai, kabhi parha ya likha nahi jata — **mara hua** |

🔴 Mara hua code jo zinda dikhta ho, wo aam mare hue code se khatarnak hai: koi us par
bharosa kar ke feature bana leta hai jo kabhi chala hi nahi.

## 🔴 6 · Ek khula hua khatra

`STATIC_OTP=112233` production par laga hua hai — yani har OTP wohi hai. API ab wo code
**wapas nahi** deti (29 Aug), magar andaza lagaya ja sakta hai.

Hal do qadam hai, **isi tarteeb mein**:

1. `WHATSAPP_PROVIDER` set ho (WATI), taake asli OTP pohanche
2. **Us ke baad** `STATIC_OTP` hataya jaye

Ulta karna khud ko bahar kar dena hai — provider ke baghair kisi ko koi code nahi milega,
team ko bhi nahi.
