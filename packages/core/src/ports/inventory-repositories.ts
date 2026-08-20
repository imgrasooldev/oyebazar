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

  /** Order mar gaya — maal wapas ginti mein. */
  release(line: StockLine): Promise<void>

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
