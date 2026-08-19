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
