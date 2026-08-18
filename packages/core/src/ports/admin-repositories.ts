/**
 * Admin portal ke ports.
 *
 * 🔴 Admin ke paas SAB kuch dikhta hai — supplier ka rate, reseller ka margin, fee.
 * Isi liye ye ports baqi sab se alag file mein hain: koi reseller-facing service
 * ghalti se inhen inject na kar le. Container mein bhi ye sirf admin services ko
 * milte hain.
 */
import type { Pkr } from '@oyebazar/shared'
import type { OpsRole } from '../domain/ops-permissions'

export interface OpsUserView {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly role: OpsRole
  readonly isActive: boolean
}

export interface OpsTeamMember extends OpsUserView {
  readonly phone: string | null
  readonly lastSeenAt: Date | null
  readonly createdAt: Date
}

export interface OpsUserRepository {
  findById(id: string): Promise<OpsUserView | null>
  findByPhone(phoneE164: string): Promise<OpsUserView | null>
  list(): Promise<OpsUserView[]>
  touchLastSeen(id: string, at: Date): Promise<void>

  /** Team ka safha — phone aur aakhri hazri bhi, taake pata ho kaun chal raha hai. */
  listTeam(): Promise<OpsTeamMember[]>
  create(input: {
    name: string
    email: string
    phoneE164: string
    role: OpsRole
  }): Promise<OpsTeamMember>
  setRole(id: string, role: OpsRole): Promise<void>
  setActive(id: string, isActive: boolean): Promise<void>
}

/** Dashboard ke number — har ek wo cheez jis par kisi ko AAJ kuch karna hai. */
export interface AdminDashboardStats {
  /** Reseller ki tasdeeq ka intezar — ye order abhi kahin nahi ja rahe */
  readonly ordersAwaitingConfirmation: number
  /** Wholesaler ke jawab ka intezar — sab se mehnga intezar, customer khara hai */
  readonly ordersWithSupplier: number
  readonly ordersInTransit: number
  readonly ordersToday: number
  /** Verification ke muntazir — jab tak ye pending hain, in ka maal bikta nahi */
  readonly suppliersPending: number
  /** DRAFT maal — ops ki manzoori ke baghair reseller ise dekh hi nahi sakti */
  readonly productsDraft: number
  readonly resellersActive: number
  /** Is mahine ki kamai (sirf wo jo abhi tak wasool nahi hui) */
  readonly feePendingThisMonth: Pkr
}

export interface AdminSupplierRow {
  readonly id: string
  readonly businessName: string
  readonly ownerName: string
  readonly phone: string
  readonly city: string
  readonly marketName: string | null
  readonly status: 'PENDING' | 'VERIFIED' | 'SUSPENDED'
  readonly listedOnBazaar: boolean
  readonly feeRateBps: number
  readonly productCount: number
  readonly createdAt: Date
}

export interface AdminProductRow {
  readonly id: string
  readonly titleUr: string
  readonly titleEn: string
  readonly status: 'DRAFT' | 'LIVE' | 'OUT_OF_STOCK' | 'ARCHIVED'
  readonly supplierPrice: Pkr
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  readonly supplierName: string
  readonly categoryNameUr: string
  readonly imageUrl: string | null
  readonly createdAt: Date
}

export interface AdminResellerRow {
  readonly id: string
  readonly name: string
  readonly whatsappPhone: string
  readonly city: string
  readonly status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED'
  readonly tier: string
  readonly orderCount: number
  readonly lastActiveAt: Date | null
  readonly createdAt: Date
}

export interface AdminInvoiceRow {
  readonly invoiceId: string
  readonly period: string
  readonly supplierName: string
  readonly orders: number
  readonly amount: Pkr
  /** Ek invoice ki saari rows ek hi haal mein hoti hain — INVOICED ya COLLECTED */
  readonly status: string
  readonly invoicedAt: Date | null
}

export interface AdminRepository {
  /** Bane hue invoice — naye pehle. Ledger rows invoiceId par jama kar ke. */
  listInvoices(limit: number): Promise<AdminInvoiceRow[]>

  dashboard(now: Date): Promise<AdminDashboardStats>

  listSuppliers(filter: { status?: string; limit: number }): Promise<AdminSupplierRow[]>
  setSupplierStatus(id: string, status: 'PENDING' | 'VERIFIED' | 'SUSPENDED'): Promise<void>
  setSupplierListed(id: string, listed: boolean): Promise<void>
  setSupplierFeeRate(id: string, feeRateBps: number): Promise<void>

  listProducts(filter: { status?: string; limit: number }): Promise<AdminProductRow[]>
  setProductStatus(id: string, status: 'DRAFT' | 'LIVE' | 'ARCHIVED'): Promise<void>

  listResellers(filter: { status?: string; limit: number }): Promise<AdminResellerRow[]>
  setResellerStatus(id: string, status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED'): Promise<void>
}
