/**
 * 🔴 PriceChangeService — LIVE maal ka rate badalne ka wahid raasta.
 *
 * Dukan wala DARKHWAST bhejta hai; rate badalti OPS hai. Ye rok kaarobari hai, technical
 * nahi, aur is ki wajah ek hi jumle mein hai:
 *
 *   Reseller apna retail rate save kar chuki hoti hai aur us ka status pack pehle se
 *   WhatsApp par laga hua hota hai. Rate barhte hi `bajiPrice` barhta hai — aur ab wo
 *   pack sar-e-aam us rate ka elaan kar raha hota hai jo us ki apni lagat se KAM hai.
 *   Usay pata tab chalta hai jab customer haan keh chuka hota hai aur order fail hota hai.
 *
 * Itla is nuqsan ko nahi rokti, sirf us ki khabar deti hai. Is liye faisla pehle hota hai.
 *
 * DRAFT is se bahar hai: wahan dukan wala khud sab kuch badal leta hai
 * (`SupplierCatalogueService.updateDraft`), kyunke wahan koi mutasir hota hi nahi.
 */
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  addPkr,
  applyBasisPoints,
  pkr,
  type Pkr,
} from '@oyebazar/shared'
import type { PriceChangeRequestView } from '../domain/views'
import type {
  ApprovedPrices,
  PriceChangeRepository,
} from '../ports/price-change-repositories'
import type { ProductRepository } from '../ports/repositories'
import type { SupplierInternalRepository } from '../ports/order-repositories'
import type { Analytics, Clock, Logger } from '../ports/infrastructure'

/**
 * Wholesaler ke rate se hamara rate aur tajweez kardah retail.
 *
 * ⚠ Ye wahi hisab hai jo `SupplierCatalogueService` mein hai. Dono jagah hone ki wajah
 * package ki hadd hai (ye service us ko import nahi karti), magar formula ek hi hai —
 * badalna pare to DONO jagah badalna hai. Fee ka behaviour `packages/shared/fee.ts`
 * mein test-shuda hai.
 */
function derivePrices(supplierPrice: Pkr, feeRateBps: number): { bajiPrice: Pkr; suggestedRetail: Pkr } {
  const bajiPrice = addPkr(supplierPrice, pkr(applyBasisPoints(supplierPrice, feeRateBps)))
  return { bajiPrice, suggestedRetail: pkr(Math.round((bajiPrice * 1.35) / 50) * 50) }
}

export class PriceChangeService {
  constructor(
    private readonly requests: PriceChangeRepository,
    private readonly products: ProductRepository,
    private readonly suppliers: SupplierInternalRepository,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  // ------------------------------------------------------------ wholesaler

  /**
   * Dukan wala naya rate maangta hai. Rate ABHI nahi badalta.
   *
   * 🔴 Maal ki milkiyat `findForPricing` se jaanchi jati hai — wohi method jo order ke
   * waqt supplierPrice deta hai, aur wahi jagah hai jahan supplierId mojood hota hai.
   */
  async request(
    supplierId: string,
    productId: string,
    requestedSupplierPrice: Pkr,
    reason?: string,
  ): Promise<{ id: string; proposedBajiPrice: Pkr }> {
    if (requestedSupplierPrice <= 0) throw new ValidationError('Naya rate likhna zaroori hai')

    const [product] = await this.products.findForPricing([productId])
    if (!product || product.supplierId !== supplierId) {
      throw new NotFoundError('Product', productId)
    }

    if (product.supplierPrice === requestedSupplierPrice) {
      throw new ValidationError('Ye to wohi rate hai jo pehle se laga hua hai')
    }

    const supplier = await this.suppliers.findInternal(supplierId)
    if (!supplier) throw new NotFoundError('Wholesaler', supplierId)

    const created = await this.requests.create({
      productId,
      supplierId,
      currentSupplierPrice: product.supplierPrice,
      requestedSupplierPrice,
      ...(reason ? { reason } : {}),
    })

    // DB ka unique index rokta hai — do tabs se ek saath bhejne par bhi ek hi banti hai
    if (!created) {
      throw new ConflictError('Is maal par pehle se ek darkhwast zer-e-ghaur hai')
    }

    const { bajiPrice } = derivePrices(requestedSupplierPrice, supplier.feeRateBps)

    await this.analytics.track({
      name: 'price_change_requested',
      actorType: 'supplier',
      actorId: supplierId,
      properties: {
        productId,
        from: product.supplierPrice,
        to: requestedSupplierPrice,
        direction: requestedSupplierPrice > product.supplierPrice ? 'up' : 'down',
      },
    })
    this.logger.info('price_change_requested', {
      supplierId,
      productId,
      from: product.supplierPrice,
      to: requestedSupplierPrice,
    })

    return { id: created.id, proposedBajiPrice: bajiPrice }
  }

  /** Dukan wale ki apni khuli darkhwastein — taake wo dobara na bheje. */
  listMyPending(supplierId: string): Promise<PriceChangeRequestView[]> {
    return this.requests.findPendingForSupplier(supplierId)
  }

  // ------------------------------------------------------------------- ops

  listPending(limit = 50): Promise<PriceChangeRequestView[]> {
    return this.requests.listPending(limit)
  }

  /**
   * 🔴 Manzoori — rate lagta hai, aur usi lamhe un resellers ka rate theek hota hai jo
   * naye `bajiPrice` se neeche reh gayin.
   *
   * Us dusre hisse ke baghair manzoori adhoori hai: `PricingService.resolvePriceForPack`
   * saved rate ko DOBARA nahi jaanchta (jaanch sirf likhte waqt hoti hai), yani us
   * reseller ka agla status pack apni lagat se kam ka rate chhap kar WhatsApp par chala
   * jata. Un sab ko naye `suggestedRetail` par le aate hain — wohi rate jo aaj ek nayi
   * reseller ko milta, aur wo `bajiPrice` se upar hai.
   *
   * ⚠ Jinhen chhera gaya un ko khabar bhejna abhi baqi hai. Wo yahan se nahi ja sakta:
   * GOLDEN RULE #10 — WhatsApp par bina pacer ke bhejna mana hai, aur ek web request se
   * sau paighaam bhejna bilkul wohi cheez hai. Ye worker ke paced job ka kaam hai.
   */
  async approve(
    opsUserId: string,
    requestId: string,
    note?: string,
  ): Promise<{ bajiPrice: Pkr; repricedResellers: number }> {
    const request = await this.requests.findPendingById(requestId)
    if (!request) throw new NotFoundError('Darkhwast', requestId)

    const supplier = await this.suppliers.findInternal(request.supplierId)
    if (!supplier) throw new NotFoundError('Wholesaler', request.supplierId)

    const { bajiPrice, suggestedRetail } = derivePrices(
      request.requestedSupplierPrice,
      supplier.feeRateBps,
    )

    const prices: ApprovedPrices = {
      supplierPrice: request.requestedSupplierPrice,
      bajiPrice,
      suggestedRetail,
      repriceUnderWaterTo: suggestedRetail,
    }

    const { repricedResellers } = await this.requests.approve(
      requestId,
      opsUserId,
      prices,
      this.clock.now(),
    )

    await this.analytics.track({
      name: 'price_change_approved',
      actorType: 'ops',
      actorId: opsUserId,
      properties: {
        productId: request.productId,
        supplierId: request.supplierId,
        from: request.currentSupplierPrice,
        to: request.requestedSupplierPrice,
        bajiPrice,
        repricedResellers,
        ...(note ? { note } : {}),
      },
    })
    this.logger.info('price_change_approved', {
      requestId,
      productId: request.productId,
      to: request.requestedSupplierPrice,
      repricedResellers,
    })

    return { bajiPrice, repricedResellers }
  }

  /** Mana — wajah likhna lazmi hai, warna dukan wala dobara wohi darkhwast bhejta hai. */
  async reject(opsUserId: string, requestId: string, note: string): Promise<void> {
    if (!note.trim()) throw new ValidationError('Wajah likhna zaroori hai')

    const done = await this.requests.reject(requestId, opsUserId, note, this.clock.now())
    if (!done) throw new NotFoundError('Darkhwast', requestId)

    await this.analytics.track({
      name: 'price_change_rejected',
      actorType: 'ops',
      actorId: opsUserId,
      properties: { requestId, note },
    })
  }
}
