/**
 * Category ka darakht — ops ke haath mein.
 *
 * Pehle categories sirf seed se aati thin: nayi category ke liye code badalna aur deploy
 * karna parta tha. Ye us karobar ke liye ghalat hai jahan har naya mausam nayi shaakh
 * maangta hai ("Winter Collection", "Sale — Eid").
 *
 * 🔴 Darakht ki gehrai ab mehdood nahi. Isi liye `path` (materialised path) hai: "is
 * shaakh ka saara maal" ek shart mein milta hai, chahe wo teen darje neeche ho.
 */

export interface CategoryNode {
  readonly id: string
  readonly slug: string
  readonly nameUr: string
  readonly nameEn: string
  readonly imageUrl: string | null
  readonly parentId: string | null
  readonly path: string
  readonly depth: number
  readonly sortOrder: number
  /** Sirf isi category par laga hua maal — bachchon ka nahi */
  readonly productCount: number
  /** Is shaakh ke neeche kul maal — bachche milakar */
  readonly branchProductCount: number
  readonly children: readonly CategoryNode[]
}

export interface CategoryAdminRepository {
  /** Poora darakht, har darja — admin ki screen isi se banti hai. */
  tree(): Promise<CategoryNode[]>

  findById(id: string): Promise<{
    id: string
    parentId: string | null
    path: string
    depth: number
  } | null>

  create(input: {
    slug: string
    nameUr: string
    nameEn: string
    imageUrl?: string | undefined
    parentId: string | null
    path: string
    depth: number
    sortOrder: number
  }): Promise<{ id: string; path: string }>

  /**
   * Nayi category ka path banate waqt id chahiye hoti hai jo abhi bani nahi.
   * Is liye row pehle banti hai, phir apni id se apna path likhta hai.
   */
  setPath(id: string, path: string): Promise<void>

  rename(
    id: string,
    input: { nameUr: string; nameEn: string; imageUrl?: string | null | undefined },
  ): Promise<void>

  /**
   * Jagah badalna — khud ka aur us ke NEECHE ke sab ka path.
   *
   * 🔴 Ek hi query mein hona chahiye: bees bachchon ko ek ek kar ke update karte waqt
   * beech mein kuch tootne se aadha darakht ek jagah aur aadha doosri jagah reh jata.
   */
  move(input: {
    id: string
    newParentId: string | null
    oldPath: string
    newPath: string
    depthDelta: number
    sortOrder: number
  }): Promise<void>

  /** Bhai-behnon ki tarteeb — drag & drop ke baad. */
  reorder(parentId: string | null, orderedIds: readonly string[]): Promise<void>

  /** Sirf tab jab na koi bachcha ho na koi maal. */
  remove(id: string): Promise<void>

  /** Rok ke liye: yahan kitna maal hai aur kitne bachche. */
  countsFor(id: string): Promise<{ products: number; children: number }>

  slugExists(slug: string): Promise<boolean>

  nextSortOrder(parentId: string | null): Promise<number>
}
