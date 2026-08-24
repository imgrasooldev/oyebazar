# OyeBazar — jaiza, aur us par kya bana

**Tareekh:** 24 اگست 2026 (dobara likha gaya)
**Kis liye:** platform ka jaiza — do taraf ka marketplace jahan **wholesaler maal list karta hai** aur **reseller wholesaler dhoondh kar apna status pack banati hai**.

> Is file ka pehla nuskha sirf khaamiyan ginta tha. Ab us mein har khaami ke saath ye bhi likha hai ke **kya bana** aur **kaun se faislay** us mein karne parey. Jo abhi tak nahi bana, us par saaf `❌` hai.

---

## 1 · Jo pehle se bana hua tha

Ye kehna zaroori hai, warna khaamiyon ki list se ghalat tasweer banti hai. Bunyad **mukammal** thi:

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

---

## 2 · ❌ Reseller ke paas wholesaler ko parakhne ka koi tareeqa nahi

**Ye abhi tak nahi bana — aap ke kehne par rok diya gaya.**

`ResellerRiskRecord` mojood hai: **wholesaler ko dikhta hai ke ye reseller kitni RTO deti hai**, theek us waqt jab wo order qubool ya rad kar raha hota hai. Us ka ulta kuch bhi nahi.

Reseller apne customer ka rishta, apna naam aur apna paisa ek aise wholesaler par lagati hai jis ke bare mein usay **kuch nahi pata**: kitni dafa reject karta hai, kitni der mein dispatch karta hai, us ka maal kitna wapas aata hai.

### Jab banana ho

Ginti **abhi ban sakti hai** — `Order` mein khaane pehle se hain (`acceptedAt`, `rejectedAt`, `rejectionReason`, `dispatchedAt`, `deliveredAt`). Teen number kaafi hain:

| dikhaya jaye | hisaab |
|---|---|
| "100 mein se kitne qubool karta hai" | accepted ÷ (accepted + rejected) |
| "kitni jaldi bhejta hai" | dispatchedAt − acceptedAt ka darmiyani waqt |
| "kitna maal wapas aata hai" | RTO ÷ (delivered + RTO) |

**🔴 Ehtiyat:** naye wholesaler ke paas ginti nahi hoti. Us par "0%" likhna usay maar dega — jab tak kaafi order na hon, "abhi naya hai" likhna chahiye, number nahi.

---

## 3 · ✅ Reseller ke portal mein wholesaler ka wujood

**Bana.** Nav mein **"Wholesalers"**, us mein search, aur har dukan ka apna safha. Wahan se catalogue par jaya jata hai jahan sirf usi dukan ka maal hota hai — reseller ke **apne rate aur munafe** ke saath.

### Ek likha hua faisla ulta karna para

Selector par saaf likha tha: `supplierId: NAHI. supplier: NAHI.` Reseller se dukan ki shanakht **jaan boojh kar** chhupayi gayi thi, taake wo seedha wahan na chali jaye.

Magar **wo hifazat asal mein thi hi nahi**: dukan ka naam, sheher aur us ka *public WhatsApp number* `/bazaar` par bina login ke pehle se mojood hai. Yani jo cheez chhupayi ja rahi thi wo doosre tab mein khuli hui thi — aur us chhupane ki qeemat reseller de rahi thi, jo apna maal chunte waqt ye jaan hi nahi sakti thi ke kis se le rahi hai.

**Is liye ab shanakht hai, RABTA nahi:** naam, sheher, mandi — magar `phone` aur `whatsappPublic` reseller ke selector mein **nahi**. Portal ke andar dukan **chuni** ja sakti hai, us se seedha rabta nahi.

**🔴 Ek aur faisla:** dukan ke safhe par maal **dobara nahi dikhaya jata** — wahan se catalogue par bheja jata hai. Apna grid banane ka matlab hota ke maal ka card **teesri dafa** likha jaye (do dafa pehle se catalogue mein hai).

---

## 4 · ✅ "Masla hua" aur order par baat — **ek hi nizam**

**Bana.** Aur pehla faisla yehi tha ke **ye do feature nahi, ek hain.**

Pehli nazar mein "baat karna" aur "shikayat karna" alag lagte hain. Hain nahi: shikayat bhi order ke saath juri hui **ek baat** hi hai, bas us par nishan laga hota hai. Do alag nizam banane ka matlab hota ke ek guftagu do jagah bant jaye — aur jab ops ko faisla karna ho to usay dono jagah parhni parti, tarteeb se jorh kar. **Ek table, do darje** (`NOTE` / `ISSUE`).

### Faislay jo saath karne parey

* **Dukan bina LOGIN jawab deti hai** — usi token se jis se wo order accept/reject karti hai. Login maangne ka matlab hai ke wo jawab dega hi nahi, aur guftagu ek-tarfa reh jayegi — jo guftagu na hone se bhi buri soorat hai.
* **Masla sirf RESELLER utha sakti hai.** Nuqsan usi ka hota hai (us ka customer, us ka paisa). Dono ko masla uthane dena ise shikayaton ka do-tarfa maidan bana deta.
* **"Masla hua" alag BUTTON hai, checkbox nahi.** Checkbox par nishan lagana bhoola ja sakta hai, aur phir wo shikayat aam baat ban kar ops ki nazar se nikal jati.
* **Khule masle ops ki list mein SAB SE OOPAR.** Agar wo kahin dabe rahen to reseller ne likh to diya magar hua kuch nahi — aur agli dafa wo likhegi hi nahi.

**🔴 Ye WhatsApp ki jagah nahi le raha**, aur UI ka matn bhi yehi kehta hai. WhatsApp hamesha tez rahega. Ye us cheez ke liye hai jo **baad mein** kaam aati hai: jab dono ki baat alag ho aur kisi ko faisla karna ho, to platform ke paas kuch to ho. Us khali jagah ki qeemat hamesha usi ko chukani parti hai jis ke paas kam taqat hai.

---

## 5 · ✅ Reseller ko "is hafte kya chal raha hai"

**Bana.** Dashboard par chhe cheezein — sab se ziyada bikne wala maal.

**🔴 Ye us ka APNA hisaab nahi hai, aur wohi is ki poori wajah hai.** Apna hisaab wo khud jaanti hai; jo wo nahi jaanti wo ye hai ke **baqi sab** kya bech rahi hain. Aur nayi reseller ke paas apna koi hisaab hota hi nahi — usi ko is ki sab se ziyada zaroorat hai.

Number **"kitni ALAG reseller ne becha"** hai, order ki ginti nahi: do reseller ka becha hua maal ek reseller ke pandrah order se ziyada maani rakhta hai, kyunke wo batata hai ke **maal** chal raha hai, koi ek achhi customer nahi. Rad aur wapas aaye order shaamil nahi — warna hum us maal ki taraf dhakelte jo wapas aa raha hai.

---

## 6 · ✅ Wholesaler ko "maal kahan tak pohancha"

**Bana.** Reseller, pack, download, order — pichhle 30 din.

**🔴 Ye order ki ginti se PEHLE rakha hai, jaan boojh kar.** Naye maal par order sifar hote hain aur us se lagta hai ke kuch ho hi nahi raha — jabke us ke pack ban rahe hote hain aur reseller usay apne customers ke saamne rakh rahi hoti hain. **Pohanch pehle aati hai, order baad mein.** Sirf order dikhane ka matlab hai ke wo maal barhane se pehle hi haar maan le.

---

## 7 · ✅ Pack par OyeBazar ka halka nishan

**Bana** — kinare par, aur band karne ke switch ke saath.

**🔴 Band karne ka rasta khula rakhna is feature ki JAAN hai, sajawat nahi.** Nishan ka poora maqsad ye hai ke pack **bane aur bheja jaye**; agar wo reseller ke apne brand ko dabaye to wo pack istemal hi nahi karegi, aur faida **ulta** ho jayega. Isi liye naap 22px, opacity 0.5, safe area ke andar (warna WhatsApp ka apna UI usay dhaanp leta hai).

Cache ka nazuk hissa: nishan default par **laga hua** hai magar cache key mein tabhi aata hai jab **band** ho. Ulta karne ka matlab hota ke har bana hua pack dobara render ho.

---

## 8 · Kharcha — ye bhi is jaize ka hissa hai

Isi arse mein infra ka kharcha bhi naapa gaya (tafseel `DEPLOY.md` mein):

* Worker `performance-1x` par 24 ghante chal raha tha aur load average **0.00** tha. `shared-cpu-4x` par jana **sasta bhi nikla aur tez bhi** (1 core → 4 burst cores; pack 7.1s → 4.7s, aur chaar pack ek saath).
* Upstash ki khali baithi hui polling — `drainDelay` 5s se 30s. Mahana ~770k se ~340k, yani **muft hadd ke andar**.
* Beykar pari hui template tasveeron ki hafta-war safai.

**Aage jo sab se pehle mehnga hoga:** storage aur bandwidth. 10,000 reseller par pack **~45 GB rozana** bante hain. Us waqt asal sawal machine ka naap nahi, ye hoga ke **purane pack kab tak rakhne hain** — aur us ka jawab do lever hain: mitane ka usool, aur Cloudflare R2 (jahan bhejne ka paisa hai hi nahi; `ObjectStorage` port us ke liye pehle se tayyar hai).

---

## 9 · Ab kya baqi hai

| # | kaam | halat |
|---|---|---|
| 1 | Wholesaler ka score (reject %, raftaar, RTO) | ❌ rok diya gaya |
| 2 | Reseller ke portal mein wholesaler | ✅ |
| 3 | "Masla hua" aur order par baat | ✅ |
| 4 | Reseller ko "kya chal raha hai" | ✅ |
| 5 | Wholesaler ko demand ka ishara | ✅ |
| 6 | Pack par nishan | ✅ |

### Jo abhi tak jaancha NAHI ja saka

**Order wali guftagu ka poora chalna.** Is waqt kisi reseller ka koi order hai hi nahi, aur test ke liye jhoota order banane ka matlab asli customer ka naam aur pata gharhna hota. Safhe, API ki validation (404 / 400) aur migration sab jaanch liye gaye. **Pehla asli order aane par us par ek baat likh kar dekh lena chahiye.**

### Do sawal jo abhi bhi khule hain

1. **Aaj kitne wholesaler aur kitni reseller hain?** Agar wholesaler bohat kam hain to supply barhana har cheez se pehle hai — marketplace hamesha kam wali taraf se banta hai.
2. **Fee ka model kya hai — har order par hissa, ya mahana subscription?** Agar har order par hissa hai to bypass ka khatra zyada hai, aur us soorat mein order ke gird ki guftagu ko aur mazboot karna chahiye.

---

## Aakhir mein

Pehle jaize ka nichor ye tha:

> Platform **wholesaler ko reseller ke bare mein** batata hai, magar **reseller ko wholesaler ke bare mein** kuch nahi batata.

Wo baat **abhi bhi qaim hai** — kyunke us ka seedha jawab (point 1, wholesaler ka score) jaan boojh kar rok diya gaya. Baqi sab us ke ird gird bana hai: reseller ab dukan **dekh** sakti hai, us se **baat** kar sakti hai, aur **masla** likh sakti hai — magar us dukan ko **parakh** abhi bhi nahi sakti.
