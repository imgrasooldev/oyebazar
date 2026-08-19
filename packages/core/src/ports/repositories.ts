/**
 * PORTS — repository interfaces (repository pattern ka "interface" hissa).
 *
 * Core sirf ye interfaces jaanta hai. Prisma ka naam yahan kahin nahi aata —
 * implementations `packages/db/src/repositories/*` mein hain.
 *
 * Faida:
 *  · services ka test bina database ke chalta hai (in-memory fake se)
 *  · kal Prisma badla ya read-replica/caching layer aayi to core ko haath nahi lagta
 *  · junior ko methods ke naam se pata chalta hai ke kaunsa data kis surface ke liye hai
 */
import type { Page, PackFormatKey, Pkr } from '@oyebazar/shared'
import type {
  PricingProductView,
  PublicActivityItem,
  PublicProductView,
  PublicSupplierView,
  RenderProductView,
  ResellerProductView,
  ResellerView,
  StatusPackView,
  CategoryView,
} from '../domain/views'

export interface CursorQuery {
  readonly cursor?: string | undefined
  readonly limit: number
}

// ---------------------------------------------------------------- catalogue

/**
 * Tarteeb ke chaar rukh.
 *
 * `newest` default hai aur rahega: reseller ka asal sawal "naya kya aaya" hai — wo
 * har roz wohi list dekhti hai aur us mein sirf naya maal dhoondhti hai.
 *
 * 🔴 Har tarteeb ke saath ek sabit doosri shart lazmi hai (id), warna do maal ka rate
 * ek hi ho to un ki tarteeb har query par badalti hai — aur cursor wali pagination us
 * par ek hi maal do bar dikha deti hai ya bilkul chhod deti hai.
 */
export type CatalogueSort = 'newest' | 'priceLow' | 'priceHigh' | 'profitHigh'

export interface CatalogueFilters extends CursorQuery {
  readonly categorySlug?: string | undefined
  readonly search?: string | undefined
  readonly minPrice?: Pkr | undefined
  readonly maxPrice?: Pkr | undefined
  readonly inStockOnly?: boolean | undefined
  readonly sort?: CatalogueSort | undefined
}

export interface ProductRepository {
  /**
   * PUBLIC (Bazaar) — 🔴 return type mein koi price nahi. Implementation `select` mein
   * price columns maangti hi nahi.
   */
  findPublicList(filters: Omit<CatalogueFilters, 'minPrice' | 'maxPrice'>): Promise<Page<PublicProductView>>
  findPublicBySlug(slug: string): Promise<PublicProductView | null>
  findPublicBySupplier(supplierSlug: string, query: CursorQuery): Promise<Page<PublicProductView>>

  /** RESELLER (login ke baad) — bajiPrice hai, supplierPrice nahi. */
  findResellerList(filters: CatalogueFilters): Promise<Page<ResellerProductView>>
  findResellerById(productId: string): Promise<ResellerProductView | null>

  /** Content Studio render ke liye. */
  findForRender(productId: string): Promise<RenderProductView | null>

  /** 🔴 INTERNAL — supplierPrice yahan hai. Sirf order pricing / fee ledger / ops. */
  findForPricing(productIds: readonly string[]): Promise<PricingProductView[]>

  /** Bazaar ke stats — "X آئٹمز" wala number. Koi price nahi, sirf ginti. */
  countPublic(): Promise<number>

  /**
   * Home ki "live" patti — abhi abhi kya list hua.
   * 🔴 Yahan bhi koi price nahi; sirf ye ke maal aaya hai aur kis sheher mein hai.
   */
  findRecentlyListed(limit: number): Promise<PublicActivityItem[]>

  /** "Popular" — jin par sab se zyada orders aaye. Order na hon to naya maal. */
  findPublicPopular(limit: number): Promise<PublicProductView[]>
}

/** Mega-menu ke liye — badi category aur us ke neeche wali. */
/**
 * Darakht ka ek khaana — apne bachchon samet, jitne bhi darje hon.
 *
 * 🔴 Pehle `children` ke andar bachche NAHI the (sirf do darje). Ops ab teesra darja
 * bana sakti hai, aur us waqt purani shakl mein wo bachcha kahin dikhta hi nahi — na
 * menu mein, na kisi list mein. Ab node apne aap par khatam nahi hota.
 */
export interface CategoryTreeNode extends CategoryView {
  /** Is shaakh ka kul maal — apna aur neeche walon ka */
  readonly productCount: number
  readonly coverImageUrl: string | null
  readonly children: readonly CategoryTreeNode[]
}

export interface CategoryRepository {
  /** 🔴 Sirf BARI categories (parent wali nahi) — warna 58 chips ki patti ban jati hai. */
  findAll(): Promise<CategoryView[]>

  /** Poora darakht, har darja — sidebar aur flyout menu isi se bante hain. */
  findTree(): Promise<CategoryTreeNode[]>
  findBySlug(slug: string): Promise<CategoryView | null>
  /**
   * Trending — kis category mein sab se zyada maal hai, aur us ki ek tasveer.
   * Tasveer is liye ke sirf naam wale khane purane zamane ki directory lagte hain.
   */
  findWithCounts(): Promise<
    (CategoryView & { productCount: number; coverImageUrl: string | null })[]
  >
}

// ---------------------------------------------------------------- suppliers

export interface SupplierFilters extends CursorQuery {
  readonly city?: string | undefined
  readonly categorySlug?: string | undefined
  /**
   * Sirf wo dukanen jinhon ne pichhle hafte kuch naya lagaya.
   *
   * Bazaar ka sab se bara sawal yehi hai: kaun si dukan zinda hai. Ginti aur naam se
   * ye pata nahi chalta — 40 item wali dukan jis ne 8 mahine se kuch nahi lagaya, 4
   * item wali taaza dukan se buri hai.
   */
  readonly freshOnly?: boolean | undefined
  readonly search?: string | undefined
}

export interface SupplierRepository {
  /** Bazaar directory — sirf VERIFIED + listed suppliers. */
  findPublicList(filters: SupplierFilters): Promise<Page<PublicSupplierView>>
  findPublicBySlug(slug: string): Promise<PublicSupplierView | null>
  /** Bazaar ke liye city facets (filter dropdown). */
  listCities(): Promise<{ city: string; count: number }[]>
}

// ---------------------------------------------------------------- resellers

export interface ResellerRepository {
  findById(id: string): Promise<ResellerView | null>
  findByPhone(phoneE164: string): Promise<ResellerView | null>
  create(input: { name: string; whatsappPhone: string; city: string; area?: string }): Promise<ResellerView>
  touchLastActive(id: string, at: Date): Promise<void>
}

/** Reseller ka apna retail price — har product ke liye alag. */
export interface ResellerPricingRepository {
  find(resellerId: string, productId: string): Promise<Pkr | null>
  findMany(resellerId: string, productIds: readonly string[]): Promise<Map<string, Pkr>>
  upsert(resellerId: string, productId: string, retailPrice: Pkr): Promise<void>
}

// ---------------------------------------------------------------- status packs

export interface StatusPackCacheKey {
  readonly resellerId: string
  readonly productId: string
  /**
   * Kis tasveer par pack banna hai. Khali string = product ki cover tasveer.
   *
   * 🔴 `undefined` ya `null` nahi — cache key ka har hissa hamesha mojood hona chahiye,
   * warna DB ke unique index aur is object ke darmiyan farq aa jata hai.
   */
  readonly mediaId: string
  readonly templateKey: string
  readonly priceUsed: Pkr
  /** Kaun sa naap — kit ka har hissa apni row hai. */
  readonly format: PackFormatKey
}

/**
 * Reseller ka apna dashboard.
 *
 * 🔴 Yahan sirf US KE apne number hain — koi supplier, koi doosri reseller nahi.
 * Har method ka pehla argument resellerId hai aur wo query ke `where` mein jata hai.
 */
export interface ResellerStatsView {
  /** Us ki tasdeeq ka intezar — jab tak ye baqi hai, order kahin nahi ja raha */
  readonly ordersAwaitingConfirmation: number
  readonly ordersRunning: number
  readonly ordersDelivered: number
  /** Sirf DELIVERED par kamai — jo abhi raste mein hai wo abhi paisa nahi hai */
  readonly earnedTotal: Pkr
  readonly earnedThisMonth: Pkr
  readonly packsMade: number
  readonly packsDownloaded: number
}

export interface ResellerStatsRepository {
  summary(resellerId: string, now: Date): Promise<ResellerStatsView>
}

export interface StatusPackRepository {
  /** 🔴 Cache lookup — DB ka unique constraint hi cache key hai. */
  findByCacheKey(key: StatusPackCacheKey): Promise<StatusPackView | null>
  create(input: StatusPackCacheKey & { imageUrl: string | null }): Promise<StatusPackView>
  markRendered(id: string, imageUrl: string, at: Date): Promise<StatusPackView>
  markDownloaded(id: string, at: Date): Promise<void>
  incrementShared(id: string): Promise<void>
  findRecentByReseller(resellerId: string, query: CursorQuery): Promise<Page<StatusPackView>>
  /** Poori kit ek hi query mein — chaar alag lookup nahi. */
  findKit(key: Omit<StatusPackCacheKey, 'format'>): Promise<StatusPackView[]>
}

// ---------------------------------------------------------------- auth

export interface SessionRecord {
  readonly id: string
  readonly resellerId: string | null
  readonly opsUserId: string | null
  readonly supplierId: string | null
  readonly expiresAt: Date
}

export interface SessionRepository {
  /** token hamesha HASH kar ke store hota hai — plain kabhi nahi. */
  create(input: {
    tokenHash: string
    resellerId?: string
    opsUserId?: string
    supplierId?: string
    expiresAt: Date
    userAgent?: string
  }): Promise<SessionRecord>
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>
  touch(id: string, at: Date): Promise<void>
  delete(id: string): Promise<void>
  /** logout par us reseller ki SAARI sessions khatam (har device se) — shared phone rule. */
  deleteAllForReseller(resellerId: string): Promise<void>
  /** Wholesaler ka logout bhi har device se — dukan par phone kai haathon mein hota hai. */
  deleteAllForSupplier(supplierId: string): Promise<void>
  deleteExpired(now: Date): Promise<number>
}

export interface OtpChallengeRecord {
  readonly id: string
  readonly phone: string
  readonly codeHash: string
  readonly attempts: number
  readonly expiresAt: Date
  readonly consumedAt: Date | null
}

export interface OtpChallengeRepository {
  create(input: { phone: string; codeHash: string; expiresAt: Date }): Promise<OtpChallengeRecord>
  findLatestActive(phone: string, now: Date): Promise<OtpChallengeRecord | null>
  incrementAttempts(id: string): Promise<number>
  consume(id: string, at: Date): Promise<void>
  countRecentRequests(phone: string, since: Date): Promise<number>
}
