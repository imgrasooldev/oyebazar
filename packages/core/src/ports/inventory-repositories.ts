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
}

export interface StockLevel {
  readonly productId: string
  /** Abhi kitna bech sakte hain — reserve shuda nikaal kar */
  readonly available: number
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
}
