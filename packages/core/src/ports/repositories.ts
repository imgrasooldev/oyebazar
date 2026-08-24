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
import type { Page, PackFormatKey, PackOptions, Pkr, TemplateSpec } from '@oyebazar/shared'
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
  /** Sirf ek dukan ka maal — reseller ke portal mein dukan chunne ke liye. */
  readonly supplierSlug?: string | undefined
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
  /**
   * Is maal ki dukan ke delivery rate — sirf do number.
   *
   * 🔴 Dukan ka naam ya id yahan se nahi lautti (dekhen dto/supplier.ts): reseller ko
   * ye jaanna chahiye ke delivery kitne ki paregi, ye nahi ke dukan kaun si hai.
   */
  deliveryRatesFor(productId: string): Promise<{ city: number; other: number }>

  findResellerById(productId: string): Promise<ResellerProductView | null>
  /**
   * Public slug se andar wali id.
   *
   * 🔴 Ye is liye hai ke Bazaar (public) `slug` par chalta hai aur reseller ka catalogue
   * `id` par. Public view mein `id` DAALNA aasan tha, magar us surface par sirf wohi
   * cheez honi chahiye jo wahan waqai chahiye — is liye tabdeeli us safhe par nahi,
   * yahan ek chhoti si khoj par ki gayi hai.
   */
  findIdBySlug(slug: string): Promise<string | null>
  /** Mutayyin maal, usi tarteeb mein jo di gayi — trending list ke liye. */
  findResellerByIds(productIds: readonly string[]): Promise<ResellerProductView[]>

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

  /**
   * Chal raha maal — pichhle kuch dinon mein jis par sab se zyada order aaye.
   *
   * 🔴 Ye `findPublicPopular` se do baaton mein alag hai, aur dono baatein ahem hain:
   *
   *  · Waqt ki hadd — "kabhi bik chuka" aur "AAJ chal raha hai" ek cheez nahi. Bina
   *    hadd ke wohi purana maal saal bhar sab se upar chipka rehta hai aur naya maal
   *    kabhi nazar nahi aata.
   *  · Mare hue order shumar nahi — mansookh, inkar shuda aur wapas aya maal. Warna
   *    jo maal sab se zyada WAPAS aata hai wohi sab se upar dikhta, aur reseller usay
   *    dekh kar apne customer ko wohi bhejti — yani nuqsan ka chakkar.
   */
  findTrending(input: {
    limit: number
    days: number
    /** Sirf ek dukan ka maal — wholesaler ke apne safhe ke liye */
    supplierId?: string | undefined
  }): Promise<readonly { productId: string; orders: number; qty: number }[]>
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
  /**
   * Status pack ke default faislay mehfooz karta hai — Studio ka "ہمیشہ کے لیے" button.
   *
   * 🔴 Ye `name`/`whatsappPhone` ko HAATH NAHI LAGATA. Wo login aur paighaam ka number
   * hai; tasveer par chhapne wala naam alag khaana hai. Dono ko mila dena us reseller ka
   * login tor deta jo apna zaati number chhupa kar karobar ka number chhapwana chahti hai.
   */
  savePackDefaults(
    id: string,
    options: PackOptions,
    /** `null` = system ka default (`simple`); na den to jo pehle se hai wohi rehta hai. */
    templateKey?: string | null,
  ): Promise<ResellerView>
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
  /**
   * Reseller ke apne faislon ka nishan — zaban, aur kya kya tasveer par chhape.
   *
   * 🔴 `mediaId` ki tarah ye bhi kabhi `undefined` nahi hota: default par KHALI string
   * (packages/shared/pack-options.ts se `packOptionsKey`). Khali rakhne ki wajah ye hai
   * ke pehle se bane hue saare packs — jin par ye faislay the hi nahi — apni jagah qaim
   * rehte hain aur dobara render nahi hote.
   */
  readonly optionsKey: string
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
  /**
   * "Aaj kya lagaun" — is waqt sab se ziyada bikne wala maal.
   *
   * 🔴 Ye reseller ke APNE order par nahi, POORE platform par hai — aur ye jaan boojh
   * kar hai. Us ka apna hisaab wo pehle se jaanti hai; jo wo nahi jaanti wo ye hai ke
   * BAQI sab kya bech rahi hain. Nayi reseller ke paas apna koi hisaab hota hi nahi, aur
   * usi ko is ki sab se ziyada zaroorat hai.
   *
   * Rad aur wapas aaye hue order ginti mein nahi — warna wo maal "chal raha hai" dikhta
   * jo asal mein wapas aa raha hai, aur hum reseller ko us ki taraf dhakel dete.
   */
  topSelling(since: Date, limit: number): Promise<TopSellingView[]>
}

export interface TopSellingView {
  readonly productId: string
  readonly titleUr: string
  readonly titleEn: string
  readonly coverImageUrl: string | null
  /** Kitni ALAG reseller ne becha — kul order se ziyada maani wala number. */
  readonly resellers: number
  readonly orders: number
}

/**
 * Wholesaler ko ye dikhana ke yahan hone ka faida kya hai.
 *
 * Us ka pehla sawal yehi hota hai: "main yahan kyun list karun?" Order ki ginti us ka
 * aadha jawab hai — doosra aadha ye hai ke us ka maal kitni reseller tak POHANCHA, chahe
 * order abhi na aaya ho. Status pack banna hi us pohanch ka saboot hai.
 */
export interface SupplierDemandView {
  /** Kitni alag reseller ne is ka maal apne pack par lagaya. */
  readonly resellers: number
  readonly packs: number
  readonly packsDownloaded: number
  readonly orders: number
  readonly delivered: number
}

/**
 * Order ke gird ki baat — aur "masla hua" bhi isi mein.
 *
 * 🔴 Ye WhatsApp ki jagah nahi le raha, aur ye baat design mein saaf honi chahiye.
 * WhatsApp hamesha tez rahega aur log wahin baat karenge. Ye us cheez ke liye hai jo
 * BAAD mein kaam aati hai: jab reseller aur dukan ki baat alag ho aur kisi ko faisla
 * karna ho, to platform ke paas kuch to ho. Abhi us waqt kuch bhi nahi hota.
 */
export interface OrderMessageView {
  readonly id: string
  readonly kind: 'NOTE' | 'ISSUE'
  readonly authorType: 'reseller' | 'supplier' | 'ops'
  readonly body: string
  readonly photoUrl: string | null
  readonly resolvedAt: Date | null
  readonly createdAt: Date
}

export interface OrderMessageRepository {
  /** Ek order ki poori guftagu — purani pehle, jaisa parhi jati hai. */
  listForOrder(orderId: string): Promise<OrderMessageView[]>
  add(input: {
    orderId: string
    kind: 'NOTE' | 'ISSUE'
    authorType: 'reseller' | 'supplier' | 'ops'
    authorId?: string | undefined
    body: string
    photoUrl?: string | undefined
  }): Promise<OrderMessageView>
  /** Masla hal — sirf `ISSUE` par maani rakhta hai. */
  resolve(id: string, at: Date): Promise<void>
  /** Ops ki list: khule hue masle. */
  openIssues(limit: number): Promise<(OrderMessageView & { orderId: string; orderNo: string })[]>
}

export interface SupplierDemandRepository {
  demand(supplierId: string, since: Date): Promise<SupplierDemandView>
}

export interface StatusPackRepository {
  /** 🔴 Cache lookup — DB ka unique constraint hi cache key hai. */
  findByCacheKey(key: StatusPackCacheKey): Promise<StatusPackView | null>
  /**
   * `options` cache key mein nahi hai — `optionsKey` us ka nichor hai. Poore options
   * yahan is liye jate hain ke ruka hua pack baad mein dobara render karna pare (worker
   * gir jaye, `render-pending` chale) to hum bhool na jayen ke us par kya chhapna tha.
   */
  create(
    input: StatusPackCacheKey & { imageUrl: string | null; options: PackOptions },
  ): Promise<StatusPackView>
  markRendered(id: string, imageUrl: string, at: Date): Promise<StatusPackView>
  /**
   * Ek pack — magar SIRF us reseller ka jo maang rahi hai.
   *
   * 🔴 `resellerId` yahan lazmi hai. Ye pack ki tasveer utarne ke liye istemal hota hai,
   * aur us tasveer ka pata Supabase ka seedha public link hai. Agar lookup sirf id par
   * hoti to koi bhi logged-in reseller doosri ki id daal kar us ka pack utaar leti — aur
   * pack par us ka NAAM aur NUMBER chhapa hota hai.
   */
  findOwnedById(resellerId: string, id: string): Promise<StatusPackView | null>
  markDownloaded(id: string, at: Date): Promise<void>
  incrementShared(id: string): Promise<void>
  findRecentByReseller(resellerId: string, query: CursorQuery): Promise<Page<StatusPackView>>
  /** Poori kit ek hi query mein — chaar alag lookup nahi. */
  findKit(key: Omit<StatusPackCacheKey, 'format'>): Promise<StatusPackView[]>
}

// ------------------------------------------------------- reseller ke apne template

export interface ResellerTemplateView {
  readonly id: string
  readonly resellerId: string
  readonly name: string
  readonly spec: TemplateSpec
  /**
   * Har save par barhta hai aur `templateKey` mein jata hai (`custom:<id>@<n>`).
   *
   * 🔴 Iske baghair reseller apna template badalti aur usay purani tasveer hi milti
   * rehti — cache ki nazar mein key wohi purani hoti.
   */
  readonly revision: number
  readonly updatedAt: Date
}

export interface ResellerTemplateRepository {
  listForReseller(resellerId: string): Promise<ResellerTemplateView[]>
  /** 🔴 resellerId hamesha saath — kisi doosri reseller ka template kabhi na khule. */
  findById(resellerId: string, id: string): Promise<ResellerTemplateView | null>
  /** Render ke waqt maalik ka pata nahi hota — job mein sirf key hoti hai. */
  findByIdForRender(id: string): Promise<ResellerTemplateView | null>
  create(input: { resellerId: string; name: string; spec: TemplateSpec }): Promise<ResellerTemplateView>
  update(
    resellerId: string,
    id: string,
    input: { name: string; spec: TemplateSpec },
  ): Promise<ResellerTemplateView | null>
  remove(resellerId: string, id: string): Promise<boolean>
  /**
   * HAR template ki har tasveer ka pata — beykar files ki safai ke liye.
   *
   * 🔴 `resellerId` yahan jaan boojh kar NAHI hai, aur ye is poore file mein akela
   * aisa method hai. Safai ka sawal hi ye hai ke "ye file KISI ke bhi kaam ki hai ya
   * nahi" — ek reseller tak mehdood jaanch us file ko beykar samajh legi jo kisi aur
   * ke template mein lagi hui hai, aur usay mita degi.
   *
   * Aaj key mein reseller ki id hoti hai to ye soorat aati nahi; magar us baat par
   * safai ki hifazat khari kar dena us din tootega jis din key ki shakl badlegi.
   */
  allImageUrls(): Promise<readonly string[]>
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
