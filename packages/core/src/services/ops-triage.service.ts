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
  unsellable: 30,
  errors: 20,
} as const

/**
 * Kharabi kitne ghante peechhe tak dekhi jaye.
 *
 * 🔴 Chhoti khirki jaan boojh kar: purani ghalti jo kab ki theek ho chuki, us par nishan
 * lagana list ko us shor se bhar deta hai jise ops nazar-andaz karna seekh leti hai —
 * aur us ke baad wo asli kharabi bhi nahi dekhti. Chobees ghante wo arsa hai jis mein
 * kuch kiya bhi ja sakta hai.
 */
const ERROR_WINDOW_HOURS = 24

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
    /**
     * Site ka apna pata — dukan ka magic link isi se banta hai.
     *
     * Wohi qadar jo `OrderService` istemal karti hai. Do jagah do alag pate hone se wo
     * link banta hai jo khulta hi nahi — aur wo ghalti us waqt pakri jati hai jab dukan
     * shikayat kare.
     */
    private readonly appUrl: string,
  ) {}

  async flags(): Promise<TriageResult> {
    const now = this.clock.now()

    /*
     * Aath query ek saath. Ye ek doosre par munhasir nahi hain, aur ek ke baad ek
     * chalane se safha aath chakkaron jitna sust ho jata — jab ke wo safha subah sab se
     * pehle khola jata hai.
     */
    const [
      disputed,
      overdue,
      orders,
      oddPrices,
      duplicates,
      uncategorised,
      titles,
      churn,
      unsellable,
      errors,
    ] = await Promise.all([
        this.repo.disputedPayouts(LIMITS.disputed),
        this.repo.overduePayouts(now, LIMITS.overdue),
        this.repo.unansweredOrders(now, ORDER_ANSWER_HOURS, LIMITS.orders),
        this.repo.oddPricedProducts(PRICE_ODD_MEDIUM, LIMITS.oddPrice),
        this.repo.duplicateProducts(LIMITS.duplicates),
        this.repo.uncategorisedProducts(FALLBACK_CATEGORY_SLUG, LIMITS.uncategorised),
        this.repo.liveProductTitles(LIMITS.titles),
        this.repo.stockChurn(now, CHURN_DAYS, CHURN_FIXES, LIMITS.churn),
        this.repo.unsellableProducts(LIMITS.unsellable),
        this.repo.appErrors(
          new Date(now.getTime() - ERROR_WINDOW_HOURS * 60 * 60 * 1000),
          LIMITS.errors,
        ),
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
        action: { kind: 'whatsapp', phone: row.supplierPhone, who: 'supplier' },
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
        action: { kind: 'whatsapp', phone: row.supplierPhone, who: 'supplier' },
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
        /*
         * Yahan paighaam PEHLE SE likha hua jata hai — aur ye is nishan ki jaan hai.
         *
         * WhatsApp ka provider abhi juda nahi hai, is liye order "dukan ko chala jata
         * hai" magar dukan ko khabar nahi pohanchti. Ops ke paas dukan ka number hona
         * kaafi nahi — usay wo LINK bhejna hai jis se dukan bina login ke order dekh
         * kar jawab de sake. Wo link yahan tayyar mil jata hai; ops sirf bhejti hai.
         */
        action: {
          kind: 'whatsapp',
          phone: row.supplierPhone,
          who: 'supplier',
          ...(row.supplierToken
            ? { text: this.supplierNudge(row.orderNo, row.supplierToken) }
            : {}),
        },
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

    for (const row of unsellable) {
      flags.push({
        /*
         * `medium` — koi ABHI ruka hua nahi hai, magar ghalat khabar reseller tak pohanch
         * rahi hai, aur wohi is darje ki tareef hai. Jis din wo us par status laga kar
         * order le legi, us din wo `orderUnanswered` ya RTO ban kar upar aa jayega — us
         * se pehle rok lena is safhe ka poora maqsad hai.
         */
        kind: 'unsellable',
        severity: 'medium',
        subject: 'product',
        id: row.productId,
        label: row.titleUr,
        context: row.supplierName,
        values: {},
        since: row.createdAt,
      })
    }

    for (const row of errors) {
      flags.push({
        /*
         * 🔴 `high` — aur ye us par nahi khara ke kitni dafa hui. Ek hi dafa hone wali
         * kharabi bhi kisi EK bande ka kaam rok chuki hoti hai, aur wo banda aksar
         * shikayat nahi karta — wo safha band kar ke chala jata hai. Ginti sirf ye batati
         * hai ke masla kitna phaila hua hai, ye nahi ke wo ahem hai ya nahi.
         */
        kind: 'appError',
        severity: 'high',
        subject: 'order',
        id: row.message.slice(0, 80),
        label: row.message.slice(0, 80),
        context: null,
        values: { count: row.count },
        // Purani se — sortFlags purane maslay ko upar rakhta hai
        since: row.firstAt,
      })
    }

    return { flags: sortFlags(flags), counts: countBySeverity(flags) }
  }

  /**
   * Dukan ko bheja jane wala paighaam — Urdu mein.
   *
   * 🔴 Admin ka safha angrezi mein hai, magar ye jumla ANGREZI MEIN NAHI. Wo safha ops
   * parhti hai; ye paighaam Bolton Market ke thok wale ke phone par jata hai. Zaban us
   * ki chuni jati hai jo parhta hai, us ki nahi jo bhejta hai.
   */
  private supplierNudge(orderNo: string, token: string): string {
    return [
      `السلام علیکم — ${orderNo} کا آرڈر آپ کے پاس ہے۔`,
      'یہاں سے دیکھ کر ہاں یا نہ کر دیں (لاگ اِن کی ضرورت نہیں):',
      `${this.appUrl}/supplier/o/${token}`,
    ].join('\n')
  }
}
