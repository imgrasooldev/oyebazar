# OyeBazar — kya mojood hai, kya nahi, aur aage kya

**Tareekh:** 24 اگست 2026
**Kis liye:** platform ka jaiza — do taraf ka marketplace jahan **wholesaler maal list karta hai** aur **reseller wholesaler dhoondh kar apna status pack banati hai**.

> Ye jaiza andaze par nahi hai. Har baat code aur database ke schema se dekhi gayi hai, aur jahan koi cheez **nahi** mili wahan wo saaf likha hai. Jo do baatein main nahi jaanta, wo aakhir mein alag likhi hain.

---

## 1 · Jo pehle se bana hua hai

Ye kehna zaroori hai, warna khaamiyon ki list se ghalat tasweer banti hai. Bunyad **mukammal** hai:

| hissa | halat |
|---|---|
| Wholesaler ka portal | maal, stock, variants, rate ki darkhwast, payouts, statement |
| Wholesaler ka darwaza | order ka link **bina login** — WhatsApp par aata hai, wahin accept/reject |
| Reseller ka portal | catalogue, apna rate, order, paisa, status pack, apna template |
| Order ka poora safar | PENDING → CONFIRMED → SUPPLIER → ACCEPTED → PACKED → DISPATCHED → DELIVERED, aur RTO |
| Paisa | fee ledger, reseller payout, wholesaler ka payout term, delivery rate |
| Ops portal | maal, wholesaler, reseller, order, paisa, categories, team |
| Public bazaar | wholesaler ki directory, un ka maal, search |
| Rozana ka nizam | raat 3 baje pack banna, subah 9 baje WhatsApp broadcast |
| Reseller ka apna template | poora editor — jagah, rang, likhai, shaklein, naap, zaban |

Yani **karobar ka chakkar poora chalta hai.** Neeche jo likha hai wo "kaam nahi karta" nahi — wo "abhi hai hi nahi" hai.

---

## 2 · Sab se bara khala: bharosa YAK-TARFA hai

Database mein `ResellerRiskRecord` mojood hai. Us ka kaam ye hai ke **wholesaler ko dikhaya jaye ke ye reseller kitni RTO deti hai** — theek us waqt jab wo order qubool ya rad kar raha hota hai.

**Us ka ulta kuch bhi nahi hai.**

Reseller apne customer ka rishta, apna naam aur apna paisa ek aise wholesaler par laga rahi hai jis ke bare mein usay **kuch nahi pata**:

* kitni dafa order **reject** karta hai (aur kis wajah se)
* qubool karne mein kitni **der** lagata hai
* **dispatch** kitni jaldi karta hai
* us ke maal ki **wapsi** kitni hai

### Suggestion

Ye ginti **abhi ban sakti hai** — koi nayi cheez jama karne ki zaroorat nahi. `Order` mein ye khaane pehle se mojood hain:

```
acceptedAt   rejectedAt   rejectionReason
dispatchedAt   deliveredAt   status (RTO)
```

Teen number kaafi hain, aur teenon aasan zabaan mein:

| dikhaya jaye | hisaab |
|---|---|
| "100 mein se kitne qubool karta hai" | accepted ÷ (accepted + rejected) |
| "kitni jaldi bhejta hai" | dispatchedAt − acceptedAt ka darmiyani waqt |
| "kitna maal wapas aata hai" | RTO ÷ delivered + RTO |

**Kahan:** wholesaler ke naam ke saath — bazaar par bhi, aur order dene se pehle bhi.

**🔴 Ehtiyat:** naye wholesaler ke paas ginti nahi hoti. Us par "0%" likhna usay maar dega. Jab tak kaafi order na hon, "abhi naya hai" likhna chahiye — number nahi.

> **Ye pehla kaam hona chahiye.** Sab se ziyada faida, sab se kam mehnat — data pehle se mojood hai.

---

## 3 · Reseller ke portal mein wholesaler dhoondhne ka rasta hai hi nahi

Aap ka apna bayan: *"reseller ko platform de rahe hain wholesaler search kerne ke liye."*

Wo search **`/bazaar`** par hai — yani us banday ke liye jo **login kiye baghair** aata hai. Reseller jab andar aati hai to us ka `/catalogue` sirf **maal** ki list hai; wahan wholesaler ka **zikr tak nahi**.

Yani jo safar aap bech rahe hain, wo sirf mehmaan ke liye mojood hai — apni reseller ke liye nahi.

### Suggestion

* Reseller ke portal mein wholesaler ka apna safha — us ka maal, us ka ilaqa, us ke rate, aur upar wala score.
* Catalogue mein wholesaler se **chhanna** (filter) — "sirf Bolton Market", "sirf wo jo jaldi bhejte hain".
* Jo maal wo pehle beech chuki hai, us ka wholesaler saamne rakhna — wapas wohi lena sab se aam kaam hai.

---

## 4 · Customer maal wapas kare to koi rasta nahi

`RTO` sirf wo soorat hai jahan courier **pohanchne se pehle** maal wapas laata hai.

Delivery ke **baad** kya hota hai? Schema mein `Review`, `Dispute`, `Refund`, `Return`, `Complaint` — **ek bhi nahi.**

COD wali reselling mein ye **roz** hota hai: size ghalat, rang alag, maal kharab. Abhi wo sab reseller aur wholesaler WhatsApp par aapas mein nipatate hain, aur jab baat bigarti hai to **platform ke paas koi record hi nahi hota** — na faisla karne ka koi tareeqa.

### Suggestion

Poora refund ka nizam abhi zaroori nahi. **Pehla qadam sirf record hai:**

* Order par "masla hua" ka button — wajah aur tasveer ke saath.
* Wo masla wholesaler ko jaye, aur us ka jawab bhi record ho.
* Ops us ko dekh sake.

Sirf itna hone se do cheezein milti hain: jhagre ka **saboot**, aur wholesaler ke score ka **doosra pehlu** (kitne masle uthte hain).

---

## 5 · Baat platform se BAHAR hoti hai — ye business model ka masla hai

Aaj reseller aur wholesaler ki har baat WhatsApp par hoti hai. Do natije:

1. Jhagre mein aap ke paas **kuch nahi** hota.
2. Jis din dono ke paas ek doosre ka number aa jata hai, us din **aap ki fee dene ki wajah kam ho jati hai.**

Marketplace isi tarah bypass hote hain — feature ki kami se nahi, **rishta seedha ho jane se**.

### Suggestion

Poora chat banane ki zaroorat nahi. Kam se kam **order ke gird** ki baat platform par honi chahiye: order ka apna safha jahan dono likh saken, aur wo likha hua order ke saath rahe. Wholesaler ke liye wohi token wala darwaza kaafi hai — usay naya account nahi banana parega.

---

## 6 · Reseller ko ye pata hi nahi ke aaj kya bikta hai

Dashboard us ki **apni** kamai, order aur RTO dikhata hai — jo theek hai.

Magar us ka asal sawal roz yehi hota hai: **"aaj kya lagaun?"** Us ka jawab kahin nahi hai.

* kaun sa maal is hafte sab se ziyada chala
* us ke apne ilaqe mein kya chal raha hai
* jo us ne pichhle mahine becha tha wo dobara aa gaya hai
* kis cheez par sab se ziyada munafa bacha

### Suggestion

Rozana ka "drop" pehle se mojood hai — us mein **wajah** daal dijiye: *"ye is hafte 40 reseller ne becha"*. Ek line ka farq hai, magar wohi **tool** aur **saathi** ka farq hai.

---

## 7 · Wholesaler ko ye pata nahi ke yahan hone ka faida kya hai

Us ka pehla sawal yehi hoga: **"main yahan kyun list karun?"**

Aaj us ke paas sirf order ki ginti hai. Ye nahi:

* kitni reseller ne mera maal uthaya
* kitne status pack bane
* kitne dekhe gaye, kitne order bane

### Suggestion

Ye data bhi zyada tar mojood hai (`StatusPack`, `Order`). Wholesaler ke dashboard par ek line: *"is mahine aap ka maal 120 reseller ne uthaya, 1,400 pack bane, 85 order aaye."* Yehi wo cheez hai jo usay maal barhane par majboor karti hai.

---

## 8 · Pack par OyeBazar ka koi nishan nahi

Har roz hazaron pack WhatsApp par jate hain, aur un par sirf reseller ka naam aur number hota hai.

Ek reseller doosri reseller ko **dekh kar** aati hai. Ye sab se sasta growth channel hai — aur abhi bilkul band hai.

### Suggestion

Bohat halka nishan — kinare par chhota sa. **🔴 Ehtiyat:** agar wo reseller ke apne brand ko dabaye ga to wo pack istemal hi nahi karegi, aur poora faida ulta ho jayega. Ise **marzi ka** rakhna behtar hai, aur us ke badle kuch dena (misal: nishan rakhne par fee mein rieaayat).

---

## 9 · Tarteeb — agar main tay karun

| # | kaam | kyun pehle | mehnat |
|---|---|---|---|
| 1 | Wholesaler ka score (reject %, raftaar, RTO) | data mojood, bharosa yak-tarfa | **kam** |
| 2 | Reseller ke portal mein wholesaler browse aur filter | jo safar bech rahe hain wo andar hai hi nahi | darmiyani |
| 3 | "Masla hua" — record aur jawab | roz hota hai, khamoshi se bharosa khata hai | darmiyani |
| 4 | Reseller ko "kya chal raha hai" | roz wapas laane wali cheez | kam |
| 5 | Wholesaler ko demand ka ishara | supply barhane ki wajah | kam |
| 6 | Order ke gird baat platform par | bypass se bachao | zyada |
| 7 | Pack par halka nishan | sasta growth | kam |

---

## 10 · Do baatein jo main nahi jaanta

Ye tarteeb in dono ke jawab se **badal sakti hai**, is liye inhen khula rakha hai:

1. **Aaj kitne wholesaler aur kitni reseller hain?**
   Agar wholesaler bohat kam hain to **#7 aur #5 pehle** aane chahiyen — supply ke baghair baqi sab be-maani hai. Marketplace hamesha kam wali taraf se banta hai.

2. **Fee ka model kya hai — har order par hissa, ya mahana subscription?**
   Agar har order par hissa hai to **#6 (bypass se bachao)** zyada ahem ho jata hai. Subscription mein wo khatra bohat kam hai.

---

## Aakhir mein

Bunyad mazboot hai — order ka safar, paisa, aur pack ka nizam sab chal raha hai. Jo kami hai wo zyada tar **ek hi qism** ki hai:

> Platform **wholesaler ko reseller ke bare mein** batata hai, magar **reseller ko wholesaler ke bare mein** kuch nahi batata.

Aur mazay ki baat ye hai ke us ka jawab dene wala data **pehle se database mein para hua hai.**
