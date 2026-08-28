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

/** Khatam hone wala maal — dukan ki apni hadd par. */
export interface LowStockLine {
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

  /** Khatam aur khatam hone wala maal — dukan ke apne safhe ke liye. */
  lowStock(supplierId: string, limit: number): Promise<LowStockLine[]>

  /** Poori dukan ka maal — qeemat lagane ke liye. */
  valueLines(supplierId: string): Promise<StockValueLine[]>
}
