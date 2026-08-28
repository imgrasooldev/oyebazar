/**
 * Ops ki chhanni — aath sawalon ka ek jawab.
 *
 * 🔴 Ye safha kisi doosre safhe ki JAGAH nahi leta. Money, Products, Orders — sab apni
 * jagah rehte hain aur wahan sab kuch mojood rehta hai. Ye sirf wo cheezein saamne
 * laata hai jo un liston mein neeche dab jati hain, aur wohi cheezein hoti hain jin ka
 * kharcha sab se zyada hota hai: jhagre wali payout, wo rate jis mein sifar reh gaya, wo
 * order jis ka jawab teen din se nahi aya.
 *
 * Hisaab yahan nahi hai — `domain/ops-flags.ts` mein hai jahan us ke test bhi hain.
 * Yahan sirf ye hai ke kaunsa sawal poochha jaye aur jawab ko kis shakl mein laaya jaye.
 */
import {
  countBySeverity,
  oddPriceSeverity,
  orderUnansweredSeverity,
  payoutDisputedSeverity,
  payoutOverdueSeverity,
  priceTimes,
  sortFlags,
  stockChurnSeverity,
  titleProblem,
  type FlagSeverity,
  type OpsFlag,
  ORDER_ANSWER_HOURS,
  PRICE_ODD_MEDIUM,
  CHURN_FIXES,
} from '../domain/ops-flags'
import type { OpsTriageRepository } from '../ports/ops-triage-repositories'
import type { Clock } from '../ports/infrastructure'

/**
 * Har check ki apni hadd.
 *
 * 🔴 Yahan hadd rakhne ki wajah "safha tez rahe" se ziyada ye hai ke list PARHNE ke
 * qabil rahe. Aath sau qataron wali list aur sifar qataron wali list, dono ka nateeja
 * ek hi hota hai: koi nahi kholta.
 */
const LIMITS = {
  disputed: 40,
  overdue: 40,
  orders: 40,
  oddPrice: 30,
  duplicates: 30,
  uncategorised: 30,
  /** Naam har dafa nahi parhe jate — sirf haal hi ka maal (baqi pehle dekha ja chuka) */
  titles: 200,
  churn: 20,
} as const

/** Wo khana jo `supplier-product.repository.ts` khud banata hai jab category na di jaye. */
const FALLBACK_CATEGORY_SLUG = 'other'

/** Ginti kitne din peechhe tak dekhi jaye. */
const CHURN_DAYS = 30

export interface TriageResult {
  readonly flags: readonly OpsFlag[]
  readonly counts: Record<FlagSeverity, number>
}

export class OpsTriageService {
  constructor(
    private readonly repo: OpsTriageRepository,
    private readonly clock: Clock,
  ) {}

  async flags(): Promise<TriageResult> {
    const now = this.clock.now()

    /*
     * Aath query ek saath. Ye ek doosre par munhasir nahi hain, aur ek ke baad ek
     * chalane se safha aath chakkaron jitna sust ho jata — jab ke wo safha subah sab se
     * pehle khola jata hai.
     */
    const [disputed, overdue, orders, oddPrices, duplicates, uncategorised, titles, churn] =
      await Promise.all([
        this.repo.disputedPayouts(LIMITS.disputed),
        this.repo.overduePayouts(now, LIMITS.overdue),
        this.repo.unansweredOrders(now, ORDER_ANSWER_HOURS, LIMITS.orders),
        this.repo.oddPricedProducts(PRICE_ODD_MEDIUM, LIMITS.oddPrice),
        this.repo.duplicateProducts(LIMITS.duplicates),
        this.repo.uncategorisedProducts(FALLBACK_CATEGORY_SLUG, LIMITS.uncategorised),
        this.repo.liveProductTitles(LIMITS.titles),
        this.repo.stockChurn(now, CHURN_DAYS, CHURN_FIXES, LIMITS.churn),
      ])

    const flags: OpsFlag[] = []

    for (const row of disputed) {
      flags.push({
        kind: 'payoutDisputed',
        severity: payoutDisputedSeverity(),
        subject: 'payout',
        id: row.payoutId,
        label: row.orderNo,
        context: `${row.resellerName} · ${row.supplierName}`,
        values: { amount: row.amount, note: row.note ?? '' },
        since: row.disputedAt,
        /*
         * Jhagre mein DUKAN ka number — reseller ka nahi.
         *
         * Reseller apni baat pehle hi likh chuki hai (usi ne jhagra khola hai). Jo baat
         * hamare paas nahi hai wo dukan ki taraf ka hai: paisa bheja ya nahi, aur TID
         * kya hai. Faisla usi ek jawab par rukka hua hota hai.
         */
        action: { kind: 'call', phone: row.supplierPhone, who: 'supplier' },
      })
    }

    for (const row of overdue) {
      const severity = payoutOverdueSeverity(row.daysLate)
      if (!severity) continue

      flags.push({
        kind: 'payoutOverdue',
        severity,
        subject: 'payout',
        id: row.payoutId,
        label: row.orderNo,
        context: `${row.resellerName} · ${row.supplierName}`,
        values: { amount: row.amount, days: row.daysLate },
        since: row.since,
        // Paisa dukan ke paas hai — chase bhi usi ko karna hai
        action: { kind: 'call', phone: row.supplierPhone, who: 'supplier' },
      })
    }

    for (const row of orders) {
      const severity = orderUnansweredSeverity(row.hoursWaiting)
      if (!severity) continue

      flags.push({
        kind: 'orderUnanswered',
        severity,
        subject: 'order',
        id: row.orderNo,
        label: row.orderNo,
        context: `${row.supplierName} · ${row.resellerName}`,
        values: { hours: row.hoursWaiting },
        since: row.since,
        action: { kind: 'call', phone: row.supplierPhone, who: 'supplier' },
      })
    }

    for (const row of oddPrices) {
      const severity = oddPriceSeverity(row.supplierPrice, row.categoryMedian)
      if (!severity) continue

      flags.push({
        kind: 'oddPrice',
        severity,
        subject: 'product',
        id: row.productId,
        label: row.titleUr,
        context: row.supplierName,
        values: {
          price: row.supplierPrice,
          median: row.categoryMedian,
          times: priceTimes(row.supplierPrice, row.categoryMedian),
          category: row.categoryName,
        },
        since: row.createdAt,
      })
    }

    for (const row of duplicates) {
      flags.push({
        kind: 'duplicateProduct',
        severity: 'medium',
        subject: 'product',
        id: row.productId,
        label: row.titleUr,
        context: row.supplierName,
        values: { copies: row.copies },
        since: row.createdAt,
      })
    }

    for (const row of uncategorised) {
      flags.push({
        /*
         * Halka darja — aur wo faisla soch kar hai. Bina khaane ka maal Bazaar par mojood
         * rehta hai aur bikta bhi hai; sirf chhanni se nahi milta. Ye kaam karne wala
         * masla hai, rukne wala nahi.
         */
        kind: 'uncategorised',
        severity: 'low',
        subject: 'product',
        id: row.productId,
        label: row.titleUr,
        context: row.supplierName,
        values: {},
        since: row.createdAt,
      })
    }

    for (const row of titles) {
      /*
       * Naam ki jaanch DONO zabanon par — aur Urdu pehle, kyunke Bazaar par wohi chhapta
       * hai. Sirf angrezi dekhne se wo soorat nikal jati jahan Urdu naam "test" ho aur
       * angrezi theek — aur us maal ka safha har us bande ko dikhta hai jo Google se aata
       * hai.
       */
      const problem = titleProblem(row.titleUr) ?? titleProblem(row.titleEn)
      if (!problem) continue

      flags.push({
        kind: 'oddTitle',
        severity: 'medium',
        subject: 'product',
        id: row.productId,
        label: row.titleUr,
        context: row.supplierName,
        values: { problem },
        since: row.createdAt,
      })
    }

    for (const row of churn) {
      const severity = stockChurnSeverity(row.fixes)
      if (!severity) continue

      flags.push({
        kind: 'stockChurn',
        severity,
        subject: 'variant',
        id: row.variantId,
        label: row.titleUr,
        context: row.supplierName,
        values: { fixes: row.fixes, days: CHURN_DAYS },
        since: row.since,
      })
    }

    return { flags: sortFlags(flags), counts: countBySeverity(flags) }
  }
}
