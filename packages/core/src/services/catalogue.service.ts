/**
 * CatalogueService — RESELLER surface (login ke baad).
 *
 * Yahan Baji price dikhta hai, aur reseller ka apna set kiya hua retail price bhi.
 * 🔴 supplierPrice yahan tak pohanchta hi nahi — `ResellerProductView` mein wo field nahi hai.
 */
import { NotFoundError, type Page, type Pkr } from '@oyebazar/shared'
import type { ResellerProductView } from '../domain/views'
import type {
  CatalogueFilters,
  ProductRepository,
  ResellerPricingRepository,
} from '../ports/repositories'

/** Product + is reseller ka apna price. UI ko dono chahiye. */
export interface CatalogueItem {
  readonly product: ResellerProductView
  readonly myRetailPrice: Pkr | null
  /**
   * Pichhle mahine kitne order — `null` ka matlab "abhi maloom nahi", `0` ka matlab
   * "koi nahi".
   *
   * 🔴 Ye farq dikhane wale ke liye hai. `0` likh dena naye maal ko maar deta
   * hai: jo cheez kal listed hui us par sifar likha hoga aur reseller usay chhor
   * degi — halanke sifar us ke bare mein kuch kehta hi nahi. Jahan ginti na ho, wahan
   * kuch na likhna hi sahi jawab hai.
   */
  readonly orders?: number | null
}

/**
 * Bikri ki ginti kitne din ki — 30.
 *
 * 🔴 Ye wohi arsa hai jo `trending` rail ka hai, aur mel lazmi hai. Rail par
 * "30 din" ke number aur usi maal ke card par "7 din" ke number ek saath dikhte hain,
 * aur reseller ke liye wo do alag dawe ban jate hain. Ek hi jagah likha hai taake kal
 * badalna pare to dono jagah ek saath badle.
 */
export const SALES_WINDOW_DAYS = 30

export class CatalogueService {
  constructor(
    private readonly products: ProductRepository,
    private readonly pricing: ResellerPricingRepository,
  ) {}

  /** Is maal ki dukan ke delivery rate — order ke form ke liye. */
  deliveryRatesFor(productId: string): Promise<{ city: number; other: number }> {
    return this.products.deliveryRatesFor(productId)
  }

  /**
   * "Abhi kya chal raha hai" — pichhle hafte sab se zyada order jis par aaye.
   *
   * Reseller ka roz ka sawal yehi hai: aaj status par kya lagaun. Us ka jawab naya maal
   * nahi hai (naya maal sirf naya hai) — jawab wo maal hai jo doosri behnon ke haan bik
   * raha hai. Isi liye har card par order ki ginti bhi jati hai: bina ginti ke "trending"
   * sirf hamara dawa hai, us ke saath wo ek waqia hai.
   */
  async trending(
    resellerId: string,
    options: { limit: number; days: number },
  ): Promise<readonly (CatalogueItem & { orders: number })[]> {
    const ranked = await this.products.findTrending(options)
    if (ranked.length === 0) return []

    const products = await this.products.findResellerByIds(ranked.map((row) => row.productId))
    if (products.length === 0) return []

    const prices = await this.pricing.findMany(
      resellerId,
      products.map((product) => product.id),
    )
    const ordersById = new Map(ranked.map((row) => [row.productId, row.orders]))

    return products.map((product) => ({
      product,
      myRetailPrice: prices.get(product.id) ?? null,
      orders: ordersById.get(product.id) ?? 0,
    }))
  }

  async list(resellerId: string, filters: CatalogueFilters): Promise<Page<CatalogueItem>> {
    const page = await this.products.findResellerList(filters)
    if (page.items.length === 0) return { items: [], nextCursor: page.nextCursor }

    const ids = page.items.map((p) => p.id)

    /*
     * Rate aur bikri — do query, SAATH.
     *
     * 🔴 Har maal ki apni ginti laana N+1 hai aur is safhe par bees card hote
     * hain. Aur ye do ek doosre ka intezar nahi karte, is liye `Promise.all` — warna
     * safha do baar Singapore ja kar aata hai jab ek dafa kaafi tha.
     */
    const [prices, sales] = await Promise.all([
      this.pricing.findMany(resellerId, ids),
      this.products.salesCounts(ids, SALES_WINDOW_DAYS),
    ])

    return {
      items: page.items.map((product) => ({
        product,
        myRetailPrice: prices.get(product.id) ?? null,
        // Map mein na hone ka matlab "is arse mein koi order nahi" — wahan kuch nahi likhte
        orders: sales.get(product.id) ?? null,
      })),
      nextCursor: page.nextCursor,
    }
  }

  async getById(resellerId: string, productId: string): Promise<CatalogueItem> {
    const product = await this.products.findResellerById(productId)
    if (!product) throw new NotFoundError('Product', productId)
    const myRetailPrice = await this.pricing.find(resellerId, productId)
    return { product, myRetailPrice }
  }
}
