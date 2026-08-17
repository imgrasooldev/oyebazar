/**
 * Baji fee calculation — hamara poora revenue isi function se nikalta hai.
 *
 * Rules (docs/BUSINESS-RULES.md):
 *  · Fee hamesha SUPPLIER price par lagti hai, reseller ke retail price par nahi.
 *  · Fee order banne ke waqt SNAPSHOT prices se calculate hoti hai, live prices se nahi.
 *  · Fee rate config se aata hai (5% → 8% ka safar hoga), code mein hard-code nahi.
 */
import { applyBasisPoints, addPkr, multiplyPkr, ZERO_PKR, type Pkr } from './money'

export interface FeeCalculationLine {
  /** Order ke waqt ka supplier price — snapshot, live nahi */
  readonly supplierPriceSnapshot: Pkr
  readonly qty: number
}

export const FEE_RATE_BPS = {
  PHASE_1: 500, // 5%
  TARGET: 800, // 8%
} as const

export const MIN_FEE_RATE_BPS = 0
export const MAX_FEE_RATE_BPS = 2_000 // 20% — is se upar config galti hai, business faisla nahi

export function assertValidFeeRate(bps: number): void {
  if (!Number.isSafeInteger(bps) || bps < MIN_FEE_RATE_BPS || bps > MAX_FEE_RATE_BPS) {
    throw new RangeError(`Invalid fee rate: ${bps} bps (expected ${MIN_FEE_RATE_BPS}..${MAX_FEE_RATE_BPS})`)
  }
}

/** Order ke supplier-cost base par Baji ki fee. */
export function calculateBajiFee(lines: readonly FeeCalculationLine[], feeRateBps: number): Pkr {
  assertValidFeeRate(feeRateBps)
  const base = calculateSupplierBase(lines)
  return applyBasisPoints(base, feeRateBps)
}

/** Supplier ka total cost — fee isi par lagti hai. */
export function calculateSupplierBase(lines: readonly FeeCalculationLine[]): Pkr {
  if (lines.length === 0) return ZERO_PKR
  return addPkr(...lines.map((l) => multiplyPkr(l.supplierPriceSnapshot, l.qty)))
}
