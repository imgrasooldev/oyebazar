/**
 * SupplierCatalogueService — wholesaler apna maal dekhta hai aur stock on/off karta hai.
 *
 * Ye portal ka sab se zaroori kaam hai, order accept karne se bhi zyada: maal khatam ho
 * jaye aur listing LIVE rahe to reseller status laga kar customer se paisa wasool karti
 * rehti hai, aur ghalti akhir mein RTO ban kar sab ka nuqsan karti hai. Is liye stock
 * band karna ek tap ka kaam hona chahiye — form ya request nahi.
 *
 * Live karna bhi wholesaler ke haath mein hai, magar sirf us maal ka jo pehle verify ho
 * chuka (LIVE ya OUT_OF_STOCK). DRAFT/ARCHIVED ops ka faisla hai.
 */
import {
  NotFoundError,
  ValidationError,
  applyBasisPoints,
  addPkr,
  pkr,
  type Pkr,
} from '@oyebazar/shared'
import type {
  SupplierProductRepository,
  SupplierProductView,
} from '../ports/supplier-portal-repositories'
import type { SupplierInternalRepository } from '../ports/order-repositories'
import type { InventoryRepository } from '../ports/inventory-repositories'
import type { Analytics, Logger } from '../ports/infrastructure'

export class SupplierCatalogueService {
  constructor(
    private readonly products: SupplierProductRepository,
    private readonly suppliers: SupplierInternalRepository,
    private readonly inventory: InventoryRepository,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /**
   * Wholesaler apna maal daalta hai.
   *
   * Wo sirf APNA rate deta hai (1000). Hamara rate (1050) yahan banta hai — us ki fee
   * ke hisab se — aur wohi reseller ko dikhta hai. Wholesaler ko poora hisab saaf
   * dikhaya jata hai, chhupaya nahi: "aap ko 1000 milenge, reseller ko 1050 dikhega".
   *
   * 🔴 Maal DRAFT banta hai. Ops dekh kar LIVE karti hai — kyunke reseller isay apne
   * status par lagati hai aur ghalat rate ya bina tasveer ka maal poore catalogue ki
   * sakh khata hai.
   */
  async addProduct(
    supplierId: string,
    input: {
      titleUr: string
      titleEn: string
      descriptionUr?: string
      categorySlug: string
      supplierPrice: Pkr
      stockQty: number
      imageUrl?: string
    },
  ): Promise<{ id: string; bajiPrice: Pkr; suggestedRetail: Pkr }> {
    const supplier = await this.suppliers.findInternal(supplierId)
    if (!supplier) throw new NotFoundError('Supplier', supplierId)

    if (input.supplierPrice <= 0) {
      throw new ValidationError('Rate likhna zaroori hai')
    }

    // Hamari fee: 1000 par 5% = 50 → reseller ko 1050
    const bajiPrice = addPkr(
      input.supplierPrice,
      pkr(applyBasisPoints(input.supplierPrice, supplier.feeRateBps)),
    )

    // Tajweez kardah retail — reseller isay badal sakti hai, ye sirf shuruat hai
    const suggestedRetail = pkr(Math.round((bajiPrice * 1.35) / 50) * 50)

    const created = await this.products.create({
      supplierId,
      titleUr: input.titleUr,
      titleEn: input.titleEn,
      ...(input.descriptionUr ? { descriptionUr: input.descriptionUr } : {}),
      categorySlug: input.categorySlug,
      supplierPrice: input.supplierPrice,
      bajiPrice,
      suggestedRetail,
      stockQty: input.stockQty,
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    })

    await this.analytics.track({
      name: 'supplier_product_added',
      actorType: 'ops',
      actorId: `supplier:${supplierId}`,
      properties: { productId: created.id, supplierPrice: input.supplierPrice, bajiPrice },
    })
    this.logger.info('supplier_product_added', {
      supplierId,
      productId: created.id,
      supplierPrice: input.supplierPrice,
      bajiPrice,
    })

    return { id: created.id, bajiPrice, suggestedRetail }
  }

  /**
   * Ginti theek karna — naya maal aaya, ya gin kar kam nikla.
   *
   * Sifar par listing khud band ho jati hai (repository mein) — warna reseller status
   * lagati rehti hai aur order aakhir mein RTO banta hai.
   */
  async setStockQuantity(supplierId: string, productId: string, qty: number): Promise<void> {
    if (!Number.isInteger(qty) || qty < 0 || qty > 100_000) {
      throw new ValidationError('Ginti theek nahi')
    }

    const changed = await this.inventory.setQuantity(supplierId, productId, qty)
    if (!changed) throw new NotFoundError('Product', productId)

    await this.analytics.track({
      name: 'supplier_stock_quantity_set',
      actorType: 'ops',
      actorId: `supplier:${supplierId}`,
      properties: { productId, qty },
    })
    this.logger.info('supplier_stock_quantity_set', { supplierId, productId, qty })
  }

  async listMyProducts(supplierId: string): Promise<SupplierProductView[]> {
    return this.products.listForSupplier(supplierId)
  }

  async setStock(supplierId: string, productId: string, inStock: boolean): Promise<void> {
    const status = inStock ? 'LIVE' : 'OUT_OF_STOCK'
    const changed = await this.products.setStockStatus(supplierId, productId, status)

    // Repository ne ownership check kiya — false ka matlab "ye maal is dukan ka nahi"
    // ya "DRAFT/ARCHIVED hai". Dono soorton mein wohi jawab, warna doosre wholesaler
    // ke product ids taare ja sakte hain.
    if (!changed) throw new NotFoundError('Product', productId)

    await this.analytics.track({
      name: inStock ? 'supplier_stock_on' : 'supplier_stock_off',
      actorType: 'ops',
      actorId: `supplier:${supplierId}`,
      properties: { productId },
    })
    this.logger.info('supplier_stock_changed', { supplierId, productId, status })
  }
}
