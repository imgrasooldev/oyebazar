/**
 * Order state machine — GOLDEN RULE #4.
 *
 * PENDING_CONFIRM → CONFIRMED → SENT_TO_SUPPLIER → DISPATCHED → DELIVERED | RTO
 *
 * Peechay nahi ja sakta. Skip nahi kar sakta.
 * 🔴 `confirmedAt === null` ho to SENT_TO_SUPPLIER namumkin hai — ye check yahan (domain mein) hai,
 *    UI mein nahi. UI badalta rehta hai; ye rule business ka hai.
 */
import { AppError, InvalidStateTransitionError } from '@oyebazar/shared'

/** Customer confirmation ke baghair order supplier ko bhejne ki koshish. */
export class UnconfirmedOrderError extends AppError {
  constructor() {
    super(
      'INVALID_STATE_TRANSITION',
      'Customer ne abhi confirm nahi kiya — order wholesaler ko nahi bhej sakte',
      { from: 'CONFIRMED', to: 'SENT_TO_SUPPLIER', reason: 'CONFIRMATION_MISSING' },
    )
  }
}

export const ORDER_STATUSES = [
  'PENDING_CONFIRM',
  'CONFIRMED',
  'SENT_TO_SUPPLIER',
  'ACCEPTED',
  'REJECTED',
  'DISPATCHED',
  'DELIVERED',
  'RTO',
  'CANCELLED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * Poora safar:
 *
 *   PENDING_CONFIRM → CONFIRMED → SENT_TO_SUPPLIER → ACCEPTED → DISPATCHED → DELIVERED | RTO
 *                                        ↓
 *                                    REJECTED → CANCELLED
 *
 * 🔴 ACCEPTED ke baghair DISPATCHED nahi: wholesaler ne haan na ki ho aur hum parcel
 * ka intezar karte rahen, to customer teesre din phone karta hai aur reseller ki izzat
 * jati hai. Us se behtar hai order abhi mar jaye aur reseller ko foran pata chale.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_CONFIRM: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SENT_TO_SUPPLIER', 'CANCELLED'],
  SENT_TO_SUPPLIER: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['DISPATCHED', 'CANCELLED'],
  REJECTED: ['CANCELLED'],
  DISPATCHED: ['DELIVERED', 'RTO'],
  DELIVERED: [],
  RTO: [],
  CANCELLED: [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0
}

export interface TransitionContext {
  readonly confirmedAt: Date | null
}

/**
 * Transition validate karta hai. Ghalat ho to throw karta hai — silently ignore kabhi nahi.
 * 🔴 Confirmation invariant yahin enforce hota hai.
 */
export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx: TransitionContext,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to)
  }
  if (to === 'SENT_TO_SUPPLIER' && ctx.confirmedAt === null) {
    // 🔴 RTO ka sab se bara lever. Customer ne "HAAN" nahi likha — order supplier ko nahi ja sakta.
    throw new UnconfirmedOrderError()
  }
}

/** Fee ledger ke liye: kaunse status par fee wasool hoti hai aur kaunse par write-off. */
export function feeOutcomeFor(status: OrderStatus): 'EARNED' | 'WRITTEN_OFF' | 'PENDING' {
  switch (status) {
    case 'DELIVERED':
      return 'EARNED'
    case 'RTO':
    case 'REJECTED':
    case 'CANCELLED':
      return 'WRITTEN_OFF'
    default:
      return 'PENDING'
  }
}
