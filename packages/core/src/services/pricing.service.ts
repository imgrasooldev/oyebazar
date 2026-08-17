/**
 * PricingService — reseller apna retail price set karti hai.
 *
 * Business rule: retail price Baji price se kam nahi ho sakta — warna wo apne hi nuqsan
 * par bech rahi hai aur usay pata bhi nahi chalega. Ye rule domain mein hai, slider mein nahi
 * (slider sirf UI hai; API direct bhi call ho sakti hai).
 */
import { NotFoundError, ValidationError, pkr, type Pkr } from '@oyebazar/shared'
import type { ProductRepository, ResellerPricingRepository } from '../ports/repositories'
import type { Analytics } from '../ports/infrastructure'

/** Slider ki hadain — UI inhi se banti hai, hard-coded nahi. */
export interface PriceRange {
  readonly min: Pkr
  readonly suggested: Pkr
  readonly max: Pkr
}

export class PricingService {
  constructor(
    private readonly products: ProductRepository,
    private readonly pricing: ResellerPricingRepository,
    private readonly analytics: Analytics,
  ) {}

  /** Slider ke liye: kam se kam Baji price, upar suggested ka 2.5× (bemani prices rokne ke liye). */
  async getRange(productId: string): Promise<PriceRange> {
    const product = await this.products.findResellerById(productId)
    if (!product) throw new NotFoundError('Product', productId)
    return {
      min: product.bajiPrice,
      suggested: product.suggestedRetail,
      max: pkr(Math.max(product.suggestedRetail * 2.5, product.bajiPrice * 2) | 0),
    }
  }

  async setRetailPrice(resellerId: string, productId: string, retailPrice: Pkr): Promise<Pkr> {
    const product = await this.products.findResellerById(productId)
    if (!product) throw new NotFoundError('Product', productId)

    if (retailPrice < product.bajiPrice) {
      throw new ValidationError(
        `Aap ka price Baji price (Rs ${product.bajiPrice}) se kam nahi ho sakta`,
        { field: 'retailPrice', min: product.bajiPrice },
      )
    }

    await this.pricing.upsert(resellerId, productId, retailPrice)
    await this.analytics.track({
      name: 'retail_price_set',
      actorType: 'reseller',
      actorId: resellerId,
      properties: { productId, retailPrice, marginPkr: retailPrice - product.bajiPrice },
    })
    return retailPrice
  }

  /**
   * Status pack ke liye "kaunsa price chhape" ka faisla:
   * reseller ka diya hua → us ka saved price → hamara suggested.
   */
  async resolvePriceForPack(
    resellerId: string,
    productId: string,
    explicitPrice?: Pkr,
  ): Promise<Pkr> {
    if (explicitPrice !== undefined) {
      return this.setRetailPrice(resellerId, productId, explicitPrice)
    }
    const saved = await this.pricing.find(resellerId, productId)
    if (saved !== null) return saved

    const product = await this.products.findResellerById(productId)
    if (!product) throw new NotFoundError('Product', productId)
    return product.suggestedRetail
  }
}
