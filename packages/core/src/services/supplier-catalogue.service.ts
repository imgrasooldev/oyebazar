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
import { NotFoundError } from '@oyebazar/shared'
import type {
  SupplierProductRepository,
  SupplierProductView,
} from '../ports/supplier-portal-repositories'
import type { Analytics, Logger } from '../ports/infrastructure'

export class SupplierCatalogueService {
  constructor(
    private readonly products: SupplierProductRepository,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

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
