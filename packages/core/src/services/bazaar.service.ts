/**
 * BazaarService — PUBLIC surface (logged-out).
 *
 * 🔴 Is service ke paas price repositories tak rasai hi nahi hai. Ye ittefaq nahi —
 * `PublicProductView` mein koi price field maujood nahi, isliye yahan se price leak
 * karna type-level par namumkin hai.
 *
 * Qanooni pas-manzar: Bazaar muft hai aur is par order button nahi. Sales Tax Act 2(18A)
 * ki "online marketplace" tareef do sharton par poori hoti hai — fee AUR digital orders.
 * Hum dono par bahar rehte hain. Yahan order/fee ka koi method na banayen.
 */
import type { Page } from '@oyebazar/shared'
import { NotFoundError } from '@oyebazar/shared'
import type { PublicProductView, PublicSupplierView } from '../domain/views'
import type {
  CursorQuery,
  ProductRepository,
  SupplierFilters,
  SupplierRepository,
} from '../ports/repositories'

export class BazaarService {
  constructor(
    private readonly suppliers: SupplierRepository,
    private readonly products: ProductRepository,
  ) {}

  listSuppliers(filters: SupplierFilters): Promise<Page<PublicSupplierView>> {
    return this.suppliers.findPublicList(filters)
  }

  async getSupplier(slug: string): Promise<PublicSupplierView> {
    const supplier = await this.suppliers.findPublicBySlug(slug)
    if (!supplier) throw new NotFoundError('Wholesaler', slug)
    return supplier
  }

  listSupplierProducts(supplierSlug: string, query: CursorQuery): Promise<Page<PublicProductView>> {
    return this.products.findPublicBySupplier(supplierSlug, query)
  }

  listProducts(
    filters: Omit<SupplierFilters, 'city'> & { categorySlug?: string },
  ): Promise<Page<PublicProductView>> {
    return this.products.findPublicList(filters)
  }

  async getProduct(slug: string): Promise<PublicProductView> {
    const product = await this.products.findPublicBySlug(slug)
    if (!product) throw new NotFoundError('Product', slug)
    return product
  }

  listCities(): Promise<{ city: string; count: number }[]> {
    return this.suppliers.listCities()
  }

  /** Home ki live patti — abhi abhi list hua maal. */
  recentlyListed(limit = 6) {
    return this.products.findRecentlyListed(limit)
  }

  /** "Popular" — orders ki ginti se; naye catalogue mein naya maal. */
  popularProducts(limit = 12) {
    return this.products.findPublicPopular(limit)
  }

  /** Home page ke stats — sab public ginti, koi price nahi. */
  async stats(): Promise<{ suppliers: number; products: number; cities: number }> {
    const [cities, products] = await Promise.all([
      this.suppliers.listCities(),
      this.products.countPublic(),
    ])
    return {
      suppliers: cities.reduce((sum, city) => sum + city.count, 0),
      products,
      cities: cities.length,
    }
  }
}
