/**
 * Money — GOLDEN RULE #1: paisa hamesha integer PKR.
 *
 * Float kabhi nahi. Paise (sub-rupee) ki granularity is business mein nahi chahiye,
 * aur float rounding fee reconciliation ko chup chaap tor deta hai.
 *
 * `Pkr` ek branded type hai — `number` seedha assign nahi ho sakta, `pkr()` se guzarna parta hai.
 * Isse junior galti se float ya paisa-in-paise mix nahi kar sakta.
 */

declare const PkrBrand: unique symbol

export type Pkr = number & { readonly [PkrBrand]: 'PKR' }

export class InvalidMoneyError extends Error {
  constructor(value: number) {
    super(`Invalid PKR amount: ${value} (must be a non-negative safe integer)`)
    this.name = 'InvalidMoneyError'
  }
}

export function isPkr(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

/** Raw number ko Pkr banata hai. Float ya negative par throw karta hai. */
export function pkr(value: number): Pkr {
  if (!isPkr(value)) throw new InvalidMoneyError(value)
  return value as Pkr
}

export const ZERO_PKR = 0 as Pkr

export function addPkr(...amounts: Pkr[]): Pkr {
  return pkr(amounts.reduce<number>((sum, a) => sum + a, 0))
}

export function subtractPkr(a: Pkr, b: Pkr): Pkr {
  return pkr(a - b)
}

export function multiplyPkr(amount: Pkr, qty: number): Pkr {
  if (!Number.isSafeInteger(qty) || qty < 0) throw new InvalidMoneyError(qty)
  return pkr(amount * qty)
}

/**
 * Basis points se hissa nikalta hai. 500 bps = 5%, 800 bps = 8%.
 * Percentage ko float mein rakhne se bachne ke liye bps use karte hain.
 */
export function applyBasisPoints(amount: Pkr, bps: number): Pkr {
  if (!Number.isSafeInteger(bps) || bps < 0 || bps > 10_000) {
    throw new RangeError(`Invalid basis points: ${bps} (expected 0..10000)`)
  }
  return pkr(Math.round((amount * bps) / 10_000))
}

/** UI ke liye: 3000 → "Rs 3,000" */
export function formatPkr(amount: Pkr | number, opts?: { withSymbol?: boolean }): string {
  const withSymbol = opts?.withSymbol ?? true
  const formatted = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)
  return withSymbol ? `Rs ${formatted}` : formatted
}
