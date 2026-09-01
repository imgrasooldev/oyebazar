/**
 * Inventory — maal ki ginti.
 *
 * 🔴 Ek hi jagah sach hai: `ProductVariant.stockQty`. "Available" koi alag khaana nahi
 * hai jo kisi din asli ginti se alag ho jaye.
 *
 * Reserve order lagte hi hota hai, dispatch par nahi. Wajah: do resellers ek hi aakhri
 * piece apne apne customer ko bech sakti hain, aur dono ne paisa wasool kar liya hota
 * hai. Us soorat mein ek ko mana karna parta hai — aur wo apne customer ke saamne
 * jhooti banti hai, hamari wajah se.
 *
 * Order mar jaye (mansookh, wholesaler ne mana kiya, ya wapas aa gaya) to maal wapas
 * ginti mein aa jata hai — warna har nakaam order stock hamesha ke liye kha jata.
 */
export interface StockLine {
  readonly productId: string
  readonly qty: number
  /**
   * Kaunsa variant — rang/size wala.
   *
   * 🔴 Ye pehle nahi tha aur wahi sab se bara khatra tha: order variant mehfooz karta
   * tha magar stock kisi BHI variant se kat jata. Yani customer laal medium leti, aur
   * ginti neeli large se ghatti — kaghaz par sab theek, dukan par galat maal.
   *
   * Na ho to purana chalan: jis variant mein maal ho usi se. Wo un purani listings ke
   * liye hai jahan ek hi variant hai.
   */
  readonly variantId?: string | undefined

  /**
   * Kis order par — register mein qatar isi se bandhti hai.
   *
   * 🔴 `orderNo` (BJ-1043), id nahi: ginti order BANNE se PEHLE rok li jati hai, is liye
   * us lamhe id mojood hi nahi hoti. Aur register dukan wala khud parhta hai — wahan wo
   * wohi number dhoondta hai jo us ke saamne har jagah likha hota hai.
   */
  readonly orderNo?: string | undefined
}

export interface StockLevel {
  readonly productId: string
  /** Abhi kitna bech sakte hain — reserve shuda nikaal kar */
  readonly available: number
}

/** Ek variant — rang/size ka jorha aur us ki apni ginti. */
export interface VariantView {
  readonly id: string
  readonly size: string | null
  readonly colour: string | null
  readonly skuCode: string
  readonly stockQty: number
}

export interface InventoryRepository {
  /**
   * Maal rok lena (reserve).
   *
   * 🔴 Atomic hona LAZMI hai: `where stockQty >= qty` ke saath ek hi update. Pehle
   * parh kar phir likhne se do order ek saath aane par dono kaamyab ho jate hain aur
   * stock manfi mein chala jata hai.
   *
   * @returns false agar itna maal mojood nahi
   */
  reserve(line: StockLine): Promise<boolean>

  /**
   * Order mar gaya — maal wapas ginti mein.
   *
   * `reason` register ke liye hai, ginti ke liye nahi (ginti dono soorton mein barhti
   * hai). Farq is liye rakha hai ke wo do BILKUL alag waqiat hain: mansookh hua order
   * ka maal dukan se nikla hi nahi tha, aur wapas aye parcel ka maal poora chakkar laga
   * kar wapas shelf par pohancha hai — us par kirchaya laga hua hai aur wo maal aksar
   * kharab bhi hota hai. Register mein dono ek jaise likhe jaen to RTO ka nuqsan is
   * poori tareekh mein kahin nazar nahi aata.
   */
  release(line: StockLine, reason?: 'ORDER_RELEASED' | 'RETURN_TO_SHELF'): Promise<void>

  /** Wholesaler ne ginti theek ki (naya maal aaya ya kam nikla). */
  setQuantity(supplierId: string, productId: string, qty: number): Promise<boolean>

  /** Reseller ko dikhane ke liye — kitna bacha hai. */
  levelsFor(productIds: readonly string[]): Promise<StockLevel[]>

  /**
   * Wo LIVE maal jis par ginti sifar hai (ya koi variant hi nahi) — `OUT_OF_STOCK`.
   *
   * 🔴 Ye chhanni ke saath BANI hai, us ki naql nahi. `unsellableProducts` ops ko
   * batati hai ke aisa maal MOJOOD hai; ye usay theek karti hai. Sirf batana kaafi na
   * tha aur ye live chala kar dekha gaya: do maal Bazaar par bina stock ke pare the,
   * chhanni ne unhen pakra hua tha, aur kisi ne unhen uthaya nahi — kyunke fehrist ka
   * malik koi nahi hota.
   *
   * 🔴 Aur nuqsan reseller uthati hai: maal Bazaar par dikhta hai, wo us par apna
   * status lagati hai, customer order karta hai, aur `reserve()` mana kar deta hai. Us
   * lamhe wo apne customer ke saamne jhooti banti hai — aur wo customer dobara nahi
   * aata.
   *
   * `syncProductStatus` yehi kaam ek maal par karta hai, magar wo sirf UN raston par
   * chalta hai jo repository se guzarte hain: jo maal us se pehle ka hai, ya seedha DB
   * mein daala gaya (seed, import), wo LIVE hi para reh jata hai.
   *
   * @returns kitne maal ki halat badli
   */
  syncUnsellableProducts(): Promise<number>

  // ------------------------------------------------------------- variants

  /**
   * 🔴 Har method mein supplierId shart hai, sirf productId nahi.
   *
   * Variants ki id URL/API mein nazar aati hain. Bina supplierId ke koi bhi dukan wala
   * doosre ka maal chhoo sakta tha — aur ginti badalna sab se khamosh nuqsan hai:
   * na koi paighaam jata hai, na koi safha badla hua lagta hai.
   */
  listVariants(supplierId: string, productId: string): Promise<VariantView[]>

  /**
   * Kai maal ke variants EK query mein.
   *
   * 🔴 Stock ka safha pehle har maal par alag query chalata tha: chalees maal = chalees
   * chakkar, aur safha do second se upar chala jata tha. Ginti barhne par ye kharab hi
   * hota jata — aur wahi safha dukan wala din mein sab se zyada kholta hai.
   */
  listVariantsFor(
    supplierId: string,
    productIds: readonly string[],
  ): Promise<Map<string, VariantView[]>>

  addVariant(input: {
    supplierId: string
    productId: string
    size: string | null
    colour: string | null
    skuCode: string
    stockQty: number
  }): Promise<VariantView | null>

  updateVariant(input: {
    supplierId: string
    variantId: string
    size?: string | null
    colour?: string | null
    stockQty?: number
  }): Promise<boolean>

  /** Sirf tab jab is variant par koi order na ho — warna tareekh toot jati hai. */
  removeVariant(supplierId: string, variantId: string): Promise<'removed' | 'in-use' | 'not-found'>
}

// ------------------------------------------------------- register aur lagat

/** Register ki ek qatar — ginti kyun badli. */
export interface StockMoveView {
  readonly id: string
  readonly productId: string
  readonly variantId: string
  readonly productTitleUr: string
  readonly productTitleEn: string
  readonly skuCode: string
  readonly size: string | null
  readonly colour: string | null
  /** + maal aaya, − maal gaya */
  readonly delta: number
  /** Is harkat ke BAAD ki ginti */
  readonly balanceAfter: number
  readonly reason: StockMoveReason
  readonly orderNo: string | null
  /** Kis godown se / mein — purani qataron par khali (register godown se pehle bana tha) */
  readonly warehouseName: string | null
  readonly unitCost: number | null
  readonly note: string | null
  readonly actorType: string
  readonly createdAt: Date
}

export type StockMoveReason =
  | 'OPENING'
  | 'STOCK_IN'
  | 'ORDER_RESERVED'
  | 'ORDER_RELEASED'
  | 'RETURN_TO_SHELF'
  | 'MANUAL_FIX'
  | 'DAMAGE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'

/**
 * Maal ki ek qatar — ginti, hadd, lagat, aur chaal.
 *
 * 🔴 Ek hi shakl khatam hone wale maal ke liye bhi hai aur poore maal ke liye bhi. Do
 * alag shaklen banane se do alag safhe bante, aur dukan wale ko do jagah do tarah ki
 * qataren parhni partin — halanke sawal dono jagah wohi ek hai: "is cheez ka kya haal
 * hai aur mujhe kya karna hai".
 */
export interface InventoryLine {
  readonly productId: string
  readonly variantId: string
  readonly slug: string
  readonly titleUr: string
  readonly titleEn: string
  readonly skuCode: string
  readonly size: string | null
  readonly colour: string | null
  readonly stockQty: number
  readonly reorderLevel: number
  readonly avgCost: number
  /**
   * Pichhle 30 din mein kitna nikla.
   *
   * 🔴 Bina is ke list bemani hai: 2 bache hue par "manga lein" us maal par bhi likha
   * jata hai jo saal bhar mein ek dafa bika. Dukan wala aisi list ek dafa dekhta hai
   * aur phir kabhi nahi kholta.
   */
  readonly soldLast30: number
}

/** Ek cheez ki lagat aur qeemat — ek qatar. */
export interface StockValueLine {
  readonly stockQty: number
  readonly avgCost: number
}

export interface StockLedgerRepository {
  /**
   * Naya maal aaya.
   *
   * `unitCost` marzi ka hai — bohat si dukanen apni lagat kisi ko nahi batatin, aur ye
   * un ka haq hai. Na ho to ginti barh jati hai aur `avgCost` jyun ki tyun rehti hai;
   * us maal ki qeemat hum kabhi nahi chhapte (dekhen `stockValue`).
   *
   * @returns nayi ginti, ya null agar maal is dukan ka nahi
   */
  stockIn(input: {
    supplierId: string
    variantId: string
    qty: number
    unitCost?: number | undefined
    note?: string | undefined
    /** Na den to dukan ka default godown — har dukan par theek ek hota hai */
    warehouseId?: string | undefined
    /**
     * Khep ka number aur maddat — DONO marzi ke.
     *
     * 🔴 Ye khaane bharne par ek `StockBatch` banti hai. Na bharen to kuch nahi banta
     * aur sab kuch waise hi chalta hai — kapre wali dukan ke liye ye sawal banta hi
     * nahi, aur us ke saamne ye khana rakhna har dafa ek fazool qadam hai.
     */
    batchNo?: string | undefined
    expiryAt?: Date | undefined
    actorId: string
  }): Promise<number | null>

  /**
   * Maal toot gaya / kharab / gum.
   *
   * 🔴 Ye `setQuantity` se ALAG rakha gaya hai halanke dono ginti hi ghatate hain. Farq
   * niyat ka hai aur wohi register ka poora maqsad hai: "ginti theek ki" aur "maal
   * zaya hua" do mukhtalif khabrein hain, aur doosri wo hai jis par dukan wale ko saal
   * ke aakhir mein nazar dalni hoti hai.
   *
   * @returns nayi ginti, ya null agar maal is dukan ka nahi ya itna maal hai hi nahi
   */
  writeOff(input: {
    supplierId: string
    variantId: string
    qty: number
    note: string
    warehouseId?: string | undefined
    actorId: string
  }): Promise<number | null>

  /** Dukan apni hadd khud rakhti hai — 0 = ishara band. */
  setReorderLevel(input: {
    supplierId: string
    variantId: string
    level: number
  }): Promise<boolean>

  /**
   * Register — naya sab se upar.
   *
   * 🔴 `supplierId` shart hai, sirf variantId nahi: variant ki id URL mein nazar aati
   * hai, aur kisi doosri dukan ka register parh lena us ke karobar ke andar jhankna hai
   * (kya kharida, kitne ka, kab) — wahi ehtiyat jo baqi inventory ke methods par hai.
   */
  moves(input: {
    supplierId: string
    variantId?: string | undefined
    productId?: string | undefined
    limit: number
  }): Promise<StockMoveView[]>

  /**
   * Maal ki qataren — poora maal, ya sirf wo jo khatam ho raha hai.
   *
   * 🔴 `onlyLow: false` wala rasta baad mein daala gaya aur wo ek asli kami thi: pehle
   * naya maal sirf UN cheezon mein daala ja sakta tha jo khatam ho rahi hon. Yani jis
   * din dukan wala das than utarta (jab maal khatam NAHI hua hota) us din us ke paas
   * koi rasta hi nahi hota — aur wohi din is poore register ka sab se aam din hai.
   */
  lines(input: {
    supplierId: string
    onlyLow: boolean
    limit: number
    /** Naam ya SKU se chhanni — bari dukan par 300 qataron mein cheez dhoondna. */
    search?: string | undefined
  }): Promise<InventoryLine[]>

  /** Poori dukan ka maal — qeemat lagane ke liye. */
  valueLines(supplierId: string): Promise<StockValueLine[]>
}

// ------------------------------------------------------------------- godown

export interface WarehouseView {
  readonly id: string
  readonly name: string
  /** Bina bataye maal yahin se nikalta hai — har dukan par theek ek */
  readonly isDefault: boolean
  /** Band godown mein naya maal nahi aata; jo para hai wo phir bhi bikta hai */
  readonly isActive: boolean
  /** Is godown mein kul kitne piece pare hain */
  readonly pieces: number
}

/** Ek cheez, ek godown, ek ginti. */
export interface WarehouseStockLine {
  readonly warehouseId: string
  readonly warehouseName: string
  readonly qty: number
}

export interface WarehouseRepository {
  listWarehouses(supplierId: string): Promise<WarehouseView[]>

  /**
   * Naya godown.
   *
   * @returns null agar isi naam ka godown pehle se hai — "Store" naam ke do godown
   *   banne se ginti do jagah bat jati hai aur dukan wale ko khud pata nahi chalta ke
   *   maal kis mein daala tha.
   */
  addWarehouse(input: { supplierId: string; name: string }): Promise<WarehouseView | null>

  renameWarehouse(input: {
    supplierId: string
    warehouseId: string
    name: string
  }): Promise<boolean>

  /**
   * Godown band / chalu.
   *
   * 🔴 Default godown band nahi hota. Wo wahid jagah hai jahan bina bataye maal jata
   * hai; usay band karne par woh amal chup chaap kahin nahi girta — is liye ye rasta
   * hi band hai.
   */
  setWarehouseActive(input: {
    supplierId: string
    warehouseId: string
    isActive: boolean
  }): Promise<boolean>

  /**
   * Maal ek godown se doosre.
   *
   * 🔴 Kul ginti (`ProductVariant.stockQty`) BILKUL nahi badalti — maal dukan hi mein
   * rehta hai, sirf jagah badalti hai. Isi liye ye `stockIn` + `writeOff` ka jorha nahi
   * ho sakta: wo do amal kul ginti ko pehle barha kar phir ghata dete, aur us beech
   * mein aya hua order ghalat jawab paata.
   *
   * @returns false agar itna maal us godown mein hai hi nahi
   */
  transfer(input: {
    supplierId: string
    variantId: string
    fromWarehouseId: string
    toWarehouseId: string
    qty: number
    actorId: string
  }): Promise<boolean>

  /** Ek cheez kis kis godown mein kitni — safhe par tafseel ke liye. */
  stockByWarehouse(
    supplierId: string,
    variantIds: readonly string[],
  ): Promise<Map<string, WarehouseStockLine[]>>
}

// -------------------------------------------------------------------- khep

/** Ek khep — jo aayi, jo bachi, aur kab tak theek hai. */
export interface BatchView {
  readonly id: string
  readonly productId: string
  readonly variantId: string
  readonly titleUr: string
  readonly titleEn: string
  readonly skuCode: string
  readonly size: string | null
  readonly colour: string | null
  readonly batchNo: string | null
  readonly expiryAt: Date | null
  readonly qtyIn: number
  readonly qtyLeft: number
  readonly unitCost: number | null
  readonly warehouseName: string | null
  readonly receivedAt: Date
}

export interface BatchRepository {
  /** Ek cheez ki saari khepein — nayi se purani. */
  listBatches(supplierId: string, variantId: string): Promise<BatchView[]>

  /**
   * Wo khepein jin ki maddat guzar chuki ya qareeb hai.
   *
   * 🔴 Sirf wo jin mein maal BACHA hua hai (`qtyLeft > 0`). Khatam ho chuki khep ki
   * maddat par ishara dena wo shor hai jis par kuch kiya hi nahi ja sakta — aur aisa
   * ek bhi ishara list ko un ke liye bekar bana deta hai jo waqai kaam ke hain.
   *
   * Tarteeb FEFO: jo pehle mari wo pehle.
   */
  expiringBatches(supplierId: string, before: Date, limit: number): Promise<BatchView[]>

  /**
   * Ek poori khep (ya us ka hissa) zaya likhna — maddat guzar gayi.
   *
   * 🔴 Ye `writeOff` se alag rasta NAHI hai: andar wohi amal chalta hai (ginti ghatti
   * hai, godown se katti hai, aur register mein `DAMAGE` ki qatar banti hai). Farq sirf
   * itna hai ke yahan wo KHEP maloom hai jis se maal gaya — aur wohi ek baat hai jo
   * saal ke aakhir mein poochhi jati hai: "kitna maal maddat guzarne par zaya hua".
   *
   * @returns nayi kul ginti, ya null agar khep is dukan ki nahi ya itna maal us mein nahi
   */
  writeOffBatch(input: {
    supplierId: string
    batchId: string
    qty: number
    note: string
    actorId: string
  }): Promise<number | null>
}
