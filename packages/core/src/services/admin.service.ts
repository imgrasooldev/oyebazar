/**
 * AdminService — website ki management.
 *
 * Ikhtiyar (role) ka faisla YAHAN hota hai, UI par nahi. UI sirf button chhupa sakti
 * hai; rokna service ka kaam hai — warna koi bhi seedha API call kar ke wohi kaam kar
 * lega jo button chhupa kar "rok" diya gaya tha.
 *
 * Teen darjay:
 *  · COORDINATOR — rozana ka kaam: order aage barhana, maal ki halat dekhna
 *  · MANAGER     — us ke ilawa: supplier verify/band, maal approve, reseller band
 *  · FOUNDER     — us ke ilawa: fee rate badalna (yani paisa), ops team dekhna
 *
 * Fee rate FOUNDER tak mehdood is liye hai ke wohi hamari kamai ka number hai: ek
 * ghalat click se ek supplier hamesha ke liye 0% par chala jata hai aur kisi ko pata
 * bhi nahi chalta.
 */
import { ForbiddenError, ValidationError, type Pkr } from '@oyebazar/shared'
import type {
  AdminDashboardStats,
  AdminInvoiceRow,
  AdminProductRow,
  AdminRepository,
  AdminResellerRow,
  AdminSupplierRow,
  OpsUserView,
} from '../ports/admin-repositories'
import type { FeeLedgerRepository } from '../ports/order-repositories'
import type { Analytics, Clock, Logger } from '../ports/infrastructure'
import type { FeeInvoiceService } from './fee-invoice.service'

/** Bara number pehle — FOUNDER sab kuch kar sakta hai. */
const RANK: Record<OpsUserView['role'], number> = {
  COORDINATOR: 1,
  MANAGER: 2,
  FOUNDER: 3,
}

/** Fee rate ki hadd — 0% bhi ho sakta hai (khaas deal), magar 20% se upar ghalti hi hogi. */
const MAX_FEE_BPS = 2_000

export class AdminService {
  constructor(
    private readonly admin: AdminRepository,
    private readonly feeInvoices: FeeInvoiceService,
    private readonly feeLedger: FeeLedgerRepository,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  private require(actor: OpsUserView, needed: OpsUserView['role']): void {
    if (RANK[actor.role] < RANK[needed]) {
      throw new ForbiddenError('Is kaam ki ijazat nahi hai')
    }
  }

  /** Har admin harkat ka nishan — kis ne kya kiya, ye baad mein pata chalna chahiye. */
  private async record(
    actor: OpsUserView,
    name: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    await this.analytics.track({
      name,
      actorType: 'ops',
      actorId: actor.id,
      properties: { ...properties, role: actor.role },
    })
    this.logger.info(name, { ...properties, actorId: actor.id, role: actor.role })
  }

  async dashboard(actor: OpsUserView): Promise<AdminDashboardStats> {
    this.require(actor, 'COORDINATOR')
    return this.admin.dashboard(this.clock.now())
  }

  // ---------------------------------------------------------------------- paisa

  /**
   * Paise ka poora manzar: is mahine ki wasooli, agli invoice mein kya jayega, aur
   * ab tak ke invoice.
   *
   * Dekhna COORDINATOR ko bhi milta hai — number chhupane se koi hifazat nahi hoti,
   * aur ops ko rozana pata hona chahiye ke kis supplier se paisa aana hai. Badalne
   * (invoice banana, collected karna) ke ikhtiyar alag hain.
   */
  async money(actor: OpsUserView): Promise<{
    health: Awaited<ReturnType<FeeInvoiceService['collectionHealth']>>
    period: string
    pending: { supplierId: string; businessName: string; orders: number; amount: Pkr }[]
    invoices: AdminInvoiceRow[]
  }> {
    this.require(actor, 'COORDINATOR')

    const { period, from, to } = this.feeInvoices.previousMonthPeriod()

    const [health, pending, invoices] = await Promise.all([
      this.feeInvoices.collectionHealth(),
      // Agli invoice mein kya jayega — pichhle mahine ki wo rows jo abhi PENDING hain
      this.feeLedger.summarisePending({ from, to }),
      this.admin.listInvoices(50),
    ])

    return { health, period, pending, invoices }
  }

  /**
   * 🔴 Sirf FOUNDER — invoice banate hi ledger ki rows PENDING se INVOICED ho jati
   * hain, aur wo wapas nahi hoti. Ghalat mahine par chalane ka matlab hai aadhe
   * mahine ki fee bill ho gayi.
   */
  async generateInvoices(actor: OpsUserView) {
    this.require(actor, 'FOUNDER')
    const invoices = await this.feeInvoices.generateMonthlyInvoices()
    await this.record(actor, 'admin_invoices_generated', {
      count: invoices.length,
      total: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    })
    return invoices
  }

  /** Paisa aa gaya. MANAGER kar sakta hai — ye rozana ka kaam hai, faisla nahi. */
  async markInvoiceCollected(actor: OpsUserView, invoiceId: string) {
    this.require(actor, 'MANAGER')
    const result = await this.feeInvoices.markCollected(invoiceId)
    await this.record(actor, 'admin_invoice_collected', { invoiceId, ...result })
    return result
  }

  // ------------------------------------------------------------------ suppliers

  async listSuppliers(
    actor: OpsUserView,
    filter: { status?: string; limit?: number } = {},
  ): Promise<AdminSupplierRow[]> {
    this.require(actor, 'COORDINATOR')
    return this.admin.listSuppliers({ ...filter, limit: filter.limit ?? 100 })
  }

  /**
   * Dukan verify karna.
   *
   * 🔴 Verify karne se maal apne aap bazaar par nahi aa jata — `listedOnBazaar` alag
   * switch hai. Do qadam jaan boojh kar: verify ka matlab "hum ne kaghaz dekh liye",
   * listing ka matlab "ye public directory mein dikhega".
   */
  async setSupplierStatus(
    actor: OpsUserView,
    supplierId: string,
    status: 'PENDING' | 'VERIFIED' | 'SUSPENDED',
  ): Promise<void> {
    this.require(actor, 'MANAGER')
    await this.admin.setSupplierStatus(supplierId, status)
    await this.record(actor, 'admin_supplier_status_changed', { supplierId, status })
  }

  async setSupplierListed(
    actor: OpsUserView,
    supplierId: string,
    listed: boolean,
  ): Promise<void> {
    this.require(actor, 'MANAGER')
    await this.admin.setSupplierListed(supplierId, listed)
    await this.record(actor, 'admin_supplier_listing_changed', { supplierId, listed })
  }

  /** 🔴 Sirf FOUNDER — ye seedha hamari kamai ka number hai. */
  async setSupplierFeeRate(
    actor: OpsUserView,
    supplierId: string,
    feeRateBps: number,
  ): Promise<void> {
    this.require(actor, 'FOUNDER')

    if (!Number.isInteger(feeRateBps) || feeRateBps < 0 || feeRateBps > MAX_FEE_BPS) {
      throw new ValidationError('Fee rate 0 se 20% ke darmiyan honi chahiye')
    }

    await this.admin.setSupplierFeeRate(supplierId, feeRateBps)
    await this.record(actor, 'admin_supplier_fee_changed', { supplierId, feeRateBps })
  }

  // ------------------------------------------------------------------- products

  async listProducts(
    actor: OpsUserView,
    filter: { status?: string; limit?: number } = {},
  ): Promise<AdminProductRow[]> {
    this.require(actor, 'COORDINATOR')
    return this.admin.listProducts({ ...filter, limit: filter.limit ?? 100 })
  }

  /**
   * Maal ko live karna — yehi wo darwaza hai jis se maal reseller tak pohanchta hai.
   *
   * OUT_OF_STOCK yahan nahi hai: wo wholesaler ka apna faisla hai (portal mein switch),
   * ops ka nahi. Ops sirf "ye maal chal sakta hai ya nahi" tay karti hai.
   */
  async setProductStatus(
    actor: OpsUserView,
    productId: string,
    status: 'DRAFT' | 'LIVE' | 'ARCHIVED',
  ): Promise<void> {
    this.require(actor, 'MANAGER')
    await this.admin.setProductStatus(productId, status)
    await this.record(actor, 'admin_product_status_changed', { productId, status })
  }

  // ------------------------------------------------------------------ resellers

  async listResellers(
    actor: OpsUserView,
    filter: { status?: string; limit?: number } = {},
  ): Promise<AdminResellerRow[]> {
    this.require(actor, 'COORDINATOR')
    return this.admin.listResellers({ ...filter, limit: filter.limit ?? 100 })
  }

  async setResellerStatus(
    actor: OpsUserView,
    resellerId: string,
    status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED',
  ): Promise<void> {
    this.require(actor, 'MANAGER')
    await this.admin.setResellerStatus(resellerId, status)
    await this.record(actor, 'admin_reseller_status_changed', { resellerId, status })
  }
}

export type { AdminDashboardStats, AdminProductRow, AdminResellerRow, AdminSupplierRow }
