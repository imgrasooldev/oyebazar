/**
 * AdminService — website ki management.
 *
 * Ikhtiyar (role) ka faisla YAHAN hota hai, UI par nahi. UI sirf button chhupa sakti
 * hai; rokna service ka kaam hai — warna koi bhi seedha API call kar ke wohi kaam kar
 * lega jo button chhupa kar "rok" diya gaya tha.
 *
 * Chaar darjay: REVIEWER (sirf dekhna) → COORDINATOR (order aage barhana) → MANAGER
 * (verify, approve, suspend) → SUPER_ADMIN (paisa aur team).
 *
 * Fee rate aur invoice SUPER_ADMIN tak mehdood hain kyunke dono seedha kamai ka faisla
 * hain: ek ghalat click se supplier hamesha ke liye 0% par chala jata hai, aur invoice
 * banate hi ledger ki rows wapas nahi hoti.
 */
import { ForbiddenError, ValidationError, type Pkr } from '@oyebazar/shared'
import type {
  AdminDashboardStats,
  AdminInvoiceRow,
  AdminProductRow,
  AdminRepository,
  AdminResellerRow,
  AdminSupplierRow,
  OpsTeamMember,
  OpsUserRepository,
  OpsUserView,
} from '../ports/admin-repositories'
import type { FeeLedgerRepository } from '../ports/order-repositories'
import { canDo, type OpsPermission } from '../domain/ops-permissions'
import type { Analytics, Clock, Logger } from '../ports/infrastructure'
import type { FeeInvoiceService } from './fee-invoice.service'

/*
 * Roles aur ikhtiyar ab domain/ops-permissions.ts mein hain — wahi wahid sach hai,
 * jahan se ye service bhi rokti hai aur Team ka safha bhi jadwal banata hai.
 */

/** Fee rate ki hadd — 0% bhi ho sakta hai (khaas deal), magar 20% se upar ghalti hi hogi. */
const MAX_FEE_BPS = 2_000

export class AdminService {
  constructor(
    private readonly admin: AdminRepository,
    private readonly feeInvoices: FeeInvoiceService,
    private readonly feeLedger: FeeLedgerRepository,
    private readonly opsUsers: OpsUserRepository,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /**
   * 🔴 Har badalne wale kaam se pehle yehi chalta hai — aur ye ikhtiyar ka NAAM leta
   * hai, role ka nahi. Is se naya kaam add karte waqt ye sochna parta hai ke "iska
   * ikhtiyar kya hai", bajaye is ke ke kisi role ka number yaad rakha jaye.
   */
  private assertCan(actor: OpsUserView, permission: OpsPermission): void {
    if (!canDo(actor.role, permission)) {
      throw new ForbiddenError('Is kaam ki ijazat nahi hai')
    }
  }

  /** Route se bhi jaanchna ho (jaise order ke buttons) — wahi ek jagah ka faisla. */
  assertPermission(actor: OpsUserView, permission: OpsPermission): void {
    this.assertCan(actor, permission)
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
    this.assertCan(actor, 'view')
    return this.admin.dashboard(this.clock.now())
  }

  // ----------------------------------------------------------------------- team

  /**
   * Ops team.
   *
   * Dekhna MANAGER se upar — kaun andar aa sakta hai, ye har coordinator ke jaanne ki
   * cheez nahi. Badalna sirf FOUNDER: role dena matlab paise aur bharose ka ikhtiyar
   * dena hai.
   */
  async listTeam(actor: OpsUserView): Promise<OpsTeamMember[]> {
    this.assertCan(actor, 'manageTeam')
    return this.opsUsers.listTeam()
  }

  async addTeamMember(
    actor: OpsUserView,
    input: { name: string; email: string; phoneE164: string; role: OpsUserView['role'] },
  ): Promise<OpsTeamMember> {
    this.assertCan(actor, 'manageTeam')

    const existing = await this.opsUsers.findByPhone(input.phoneE164)
    if (existing) {
      throw new ValidationError('Ye number pehle se team mein hai')
    }

    const created = await this.opsUsers.create(input)
    await this.record(actor, 'admin_team_member_added', {
      opsUserId: created.id,
      role: created.role,
    })
    return created
  }

  /**
   * Role badalna.
   *
   * 🔴 Apna role khud nahi badla ja sakta. Wajah sirf usool nahi, amli hai: aakhri
   * FOUNDER khud ko MANAGER kar de to fee rate aur invoice ka darwaza HAMESHA ke liye
   * band ho jata hai — koi bacha hi nahi jo usay wapas kar sake.
   */
  async setTeamRole(
    actor: OpsUserView,
    opsUserId: string,
    role: OpsUserView['role'],
  ): Promise<void> {
    this.assertCan(actor, 'manageTeam')

    if (opsUserId === actor.id) {
      throw new ValidationError('Apna role khud nahi badal sakte — kisi doosre founder se karwayen')
    }

    await this.opsUsers.setRole(opsUserId, role)
    await this.record(actor, 'admin_team_role_changed', { opsUserId, role })
  }

  /** Band karte hi us ki saari sessions khatam (repository transaction mein). */
  async setTeamActive(actor: OpsUserView, opsUserId: string, isActive: boolean): Promise<void> {
    this.assertCan(actor, 'manageTeam')

    if (opsUserId === actor.id && !isActive) {
      // Khud ko band karne ka matlab hai apne hi portal se bahar — aur agar akhri
      // founder hai to darwaza sab ke liye band
      throw new ValidationError('Apne aap ko band nahi kar sakte')
    }

    await this.opsUsers.setActive(opsUserId, isActive)
    await this.record(actor, 'admin_team_active_changed', { opsUserId, isActive })
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
    this.assertCan(actor, 'view')

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
    this.assertCan(actor, 'generateInvoices')
    const invoices = await this.feeInvoices.generateMonthlyInvoices()
    await this.record(actor, 'admin_invoices_generated', {
      count: invoices.length,
      total: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    })
    return invoices
  }

  /** Paisa aa gaya. MANAGER kar sakta hai — ye rozana ka kaam hai, faisla nahi. */
  async markInvoiceCollected(actor: OpsUserView, invoiceId: string) {
    this.assertCan(actor, 'markInvoicePaid')
    const result = await this.feeInvoices.markCollected(invoiceId)
    await this.record(actor, 'admin_invoice_collected', { invoiceId, ...result })
    return result
  }

  // ------------------------------------------------------------------ suppliers

  async listSuppliers(
    actor: OpsUserView,
    filter: { status?: string; limit?: number } = {},
  ): Promise<AdminSupplierRow[]> {
    this.assertCan(actor, 'view')
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
    this.assertCan(actor, 'manageSuppliers')
    await this.admin.setSupplierStatus(supplierId, status)
    await this.record(actor, 'admin_supplier_status_changed', { supplierId, status })
  }

  async setSupplierListed(
    actor: OpsUserView,
    supplierId: string,
    listed: boolean,
  ): Promise<void> {
    this.assertCan(actor, 'manageSuppliers')
    await this.admin.setSupplierListed(supplierId, listed)
    await this.record(actor, 'admin_supplier_listing_changed', { supplierId, listed })
  }

  /** 🔴 Sirf FOUNDER — ye seedha hamari kamai ka number hai. */
  async setSupplierFeeRate(
    actor: OpsUserView,
    supplierId: string,
    feeRateBps: number,
  ): Promise<void> {
    this.assertCan(actor, 'setFeeRate')

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
    this.assertCan(actor, 'view')
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
    this.assertCan(actor, 'manageProducts')
    await this.admin.setProductStatus(productId, status)
    await this.record(actor, 'admin_product_status_changed', { productId, status })
  }

  // ------------------------------------------------------------------ resellers

  async listResellers(
    actor: OpsUserView,
    filter: { status?: string; limit?: number } = {},
  ): Promise<AdminResellerRow[]> {
    this.assertCan(actor, 'view')
    return this.admin.listResellers({ ...filter, limit: filter.limit ?? 100 })
  }

  async setResellerStatus(
    actor: OpsUserView,
    resellerId: string,
    status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED',
  ): Promise<void> {
    this.assertCan(actor, 'manageResellers')
    await this.admin.setResellerStatus(resellerId, status)
    await this.record(actor, 'admin_reseller_status_changed', { resellerId, status })
  }
}

export type { AdminDashboardStats, AdminProductRow, AdminResellerRow, AdminSupplierRow }
