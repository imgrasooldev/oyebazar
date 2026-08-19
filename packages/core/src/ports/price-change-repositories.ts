/**
 * LIVE maal ka rate badalne ki darkhwast — ports.
 *
 * 🔴 Ye poora nizaam sirf LIVE maal ke liye hai. DRAFT par dukan wala khud rate badal
 * leta hai (`SupplierProductRepository.updateDraft`), kyunke wahan na ops ne dekha hai
 * na kisi reseller ne.
 */
import type { Pkr } from '@oyebazar/shared'
import type { PriceChangeRequestView } from '../domain/views'

export interface NewPriceChangeRequest {
  readonly productId: string
  readonly supplierId: string
  readonly currentSupplierPrice: Pkr
  readonly requestedSupplierPrice: Pkr
  readonly reason?: string | undefined
}

/** Manzoori ke waqt naye rate se bane hue number — hisab service karti hai, repo nahi. */
export interface ApprovedPrices {
  readonly supplierPrice: Pkr
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  /**
   * Jin resellers ka saved retail naye bajiPrice se neeche reh gaya, unhen kis rate par
   * le jana hai. Is ke baghair un ka status pack apni lagat se kam ka rate chhapta.
   */
  readonly repriceUnderWaterTo: Pkr
}

export interface PriceChangeRepository {
  /**
   * Nayi darkhwast.
   *
   * @returns null agar is maal par pehle se koi khuli darkhwast hai (DB ka unique
   * index hi rokta hai — do tabs se ek saath bhejne par bhi ek hi banti hai)
   */
  create(input: NewPriceChangeRequest): Promise<{ id: string } | null>

  /** Ops ki qatar — sab se purani pehle (jo sab se zyada intezar kar rahi hai). */
  listPending(limit: number): Promise<PriceChangeRequestView[]>

  findPendingById(requestId: string): Promise<PriceChangeRequestView | null>

  /** Dukan wale ko apni khuli darkhwast dikhani hai — dobara bhejne se rokne ke liye. */
  findPendingForSupplier(supplierId: string): Promise<PriceChangeRequestView[]>

  /**
   * 🔴 Manzoori — rate lagana aur darkhwast band karna EK transaction mein.
   *
   * Alag alag karte to beech mein gir jane par do soorat mumkin thin: rate lag gaya
   * magar darkhwast khuli rahi (ops dobara manzoori de kar dobara rate barha deti), ya
   * darkhwast band ho gayi magar rate laga hi nahi (dukan wala samajhta hai ho gaya).
   *
   * @returns kitni resellers ka saved rate theek karna para
   */
  approve(
    requestId: string,
    opsUserId: string,
    prices: ApprovedPrices,
    at: Date,
  ): Promise<{ repricedResellers: number }>

  reject(requestId: string, opsUserId: string, note: string, at: Date): Promise<boolean>
}
