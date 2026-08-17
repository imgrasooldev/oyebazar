# Conventions

## Golden rules (inhen zubani yaad hona chahiye)

1. **`supplierPrice` kabhi reseller tak na jaye.** Reseller-facing query par `select` LAZMI hai.
   Bare `prisma.product.findMany()` MANA hai.
   _Wajah:_ reseller ko wholesaler ka asli price pata chal gaya to wo seedha wahan chali jayegi —
   business khatam. Jo junior wajah samajhta hai wo galti nahi karta.
2. **Paisa hamesha integer PKR.** Float kabhi nahi. Fee rate basis points mein (500 = 5%, 800 = 8%).
   `Pkr` branded type hai — `pkr(value)` se guzarna parta hai.
3. **Price snapshots.** Har `OrderItem` par `supplierPriceSnapshot`, `bajiPriceSnapshot`,
   `retailPriceSnapshot`. Prices badalte rehte hain; history nahi badalni chahiye.
4. **Order state machine skip na kare.** `PENDING_CONFIRM → CONFIRMED → SENT_TO_SUPPLIER →
   DISPATCHED → DELIVERED | RTO`. `confirmedAt === null` ho to `SENT_TO_SUPPLIER` namumkin —
   ye check **service layer** mein hai, UI mein nahi.
5. **Har external call abstraction ke peechay.** WhatsApp, courier, storage — koi code direct
   SDK call na kare. Provider badalna ek file ka kaam rehna chahiye.
6. **Business logic `packages/` mein, `apps/` mein nahi.** `apps/` sirf routing + presentation.
7. **Bazaar (public) par kabhi price ya order button nahi.** Ye qanooni shart hai, design choice nahi.
8. **`any` mana hai.** `unknown` + Zod use karen.
9. **Migration ke baghair schema change nahi.**
10. **WhatsApp par kabhi bina pacer ke na bhejen.** 20 msg/sec ki hadd, aur broadcast jobs
    kabhi retry na karen. Number restrict hona recoverable nahi hota — aur rozana ka pack
    ruk gaya to reseller ki aadat tootti hai, jo is business ki bunyad hai.

## Naya reseller-facing endpoint bana rahe hain?

- [ ] Repository method apna `select` use karta hai (naya field add kiya to selectors.ts dekhen)
- [ ] Response `.strict()` DTO se `parse()` ho kar ja raha hai
- [ ] `apps/web/__tests__/security/price-leak.test.ts` chal raha hai aur pass hai
- [ ] Login-gated hai (`requireReseller()`)

## PR rules

- `main` par direct push band. Har cheez PR se.
- Har PR: description + screenshot (UI ho to) + test
- 400 lines se bara PR tor kar chhota karen
- Failing test ke saath merge nahi
- `FeeLedger` aur order state machine ke PR **sirf founder ke**

## Naming

- DB: PascalCase models, camelCase fields
- API: kebab-case routes, camelCase JSON
- Files: kebab-case (`status-pack.service.ts`, `product.repository.ts`)
- Services: `<Noun>Service` · Repositories: `Prisma<Noun>Repository` implements `<Noun>Repository`

## UI qawaid (Sadia ke liye)

- Har kaam **3 tap** mein. 4 lagen to design galat hai.
- Urdu-first, RTL default. Icons > text.
- Tap target 44px se chhota nahi (`min-h-tap`).
- First load <1MB. LCP p75 <3s (3G par).
- Android 8/9 par test — emulator kaafi nahi.
- **Logout button har screen par** (shared phone).
- Payout/phone hamesha masked.

## AI ka istemal

Claude/Copilot use karna bilkul theek hai — hosla afzai hai. Do sharten:

1. Jo code aap ne merge kiya, **wo aap ka hai**. "AI ne likha tha" koi wajah nahi.
2. AI se poochen "ye kya kar raha hai?" — sirf "ye likh do" nahi.
