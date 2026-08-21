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
}

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

    // N+1 se bachne ke liye ek hi query mein saare prices — junior yahan loop na lagaye
    const prices = await this.pricing.findMany(
      resellerId,
      page.items.map((p) => p.id),
    )

    return {
      items: page.items.map((product) => ({
        product,
        myRetailPrice: prices.get(product.id) ?? null,
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
