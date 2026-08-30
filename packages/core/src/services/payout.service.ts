/**
 * PayoutService — reseller ke paise, do taraf ki tasdeeq ke saath.
 *
 * Poora nizam ek jumle par khara hai: **ek taraf ka dawa hisab band nahi karta.**
 *
 * COD ka paisa wholesaler ke haath mein jata hai. Hum beech mein nahi hain, is liye hum
 * dekh nahi sakte ke us ne bheja ya nahi — sirf dono se alag alag pooch sakte hain.
 * Wholesaler kehta hai "bhej diya" (reference ke saath), reseller kehti hai "mil gaye".
 * Dono milen to SETTLED. Na milen to jhagra hamare saamne aa jata hai, teen hafte baad
 * reseller ki shikayat par nahi.
 *
 * 🔴 Ye service kisi ko paise nahi bhejti — sirf likhti hai ke kis ne kya kaha aur kab.
 * Paisa asal mein EasyPaisa/bank par chalta hai, hamare bahar.
 */
import { NotFoundError, ValidationError, pkr, type Pkr } from '@oyebazar/shared'
import type { PayoutRepository, PayoutStatus, PayoutView } from '../ports/payout-repositories'
import type {
  CounterpartyLedgerRow,
  MoneyLedgerRepository,
  SupplierPaymentRecord,
} from '../ports/money-ledger-repositories'
import type { SupplierPayoutSummary } from '../ports/payout-repositories'
import type { Analytics, Clock, Logger, MessagingProvider } from '../ports/infrastructure'

/**
 * Nayi dukan ka default waada — delivery ke itne din baad.
 *
 * Pehle ye har dukan par lagne wali TAY-SHUDA hadd thi. Us mein kharabi ye thi ke der
 * hamare andaze se napi jati thi, aur dukan wala theek keh sakta tha: "maine kabhi
 * nahi kaha teen din mein doonga". Ab har dukan apni shart khud likhti hai; ye sirf
 * shuruaati qadar hai.
 */
export const DEFAULT_PAYOUT_TERM_DAYS = 3

/**
 * Waade ki hadd.
 *
 * Sifar = delivery wale din hi. Saat se aage jaan boojh kar nahi: reseller ka apna
 * customer paise de chuka hota hai, aur us se aage rok lena hamara masla ban jata hai.
 */
export const MAX_PAYOUT_TERM_DAYS = 7

export interface PayoutActor {
  readonly type: 'supplier' | 'reseller'
  readonly id: string
}

/**
 * Dukan ke "bhej diye" ke baad reseller se itni der mein tasdeeq maangi jati hai.
 *
 * 🔴 Do din, foran nahi. EasyPaisa/bank ka paisa aksar usi din nahi pohanchta, aur jis
 * lamhe dukan "bhej diya" dabati hai us lamhe reseller se poochhna usay har dafa "abhi
 * nahi aaye" kehne par majboor karta hai — aur us ke baad wo poochhna nazar-andaz karne
 * lagti hai. Do din wo arsa hai jis mein paisa waqai pohanch chuka hota hai.
 */
const CONFIRM_WAIT_MS = 2 * 24 * 60 * 60 * 1000

export class PayoutService {
  /**
   * `phones` sirf do function hain, poore repositories nahi.
   *
   * 🔴 Wajah: is service ko ek number chahiye, poora record nahi. Reseller/Supplier
   * repository inject karte to yahan se `payoutAccount` aur `feeRateBps` tak rasai ban
   * jati — aur jo rasai maujood ho, wo ek din istemal bhi hoti hai.
   */
  constructor(
    private readonly payouts: PayoutRepository,
    private readonly ledger: MoneyLedgerRepository,
    private readonly phones: {
      reseller(id: string): Promise<string>
      supplier(id: string): Promise<string>
    },
    private readonly messaging: MessagingProvider,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /**
   * Maal pohanch gaya — ab wholesaler ke zimme reseller ke paise hain.
   *
   * Ye OrderService delivery ke waqt bulati hai, usi lamhe jab FeeLedger EARNED hoti
   * hai. Dono ek saath hi banti hain: ek row humein milne wali fee, doosri reseller ko
   * milne wala margin. Alag alag waqt par banayen to ek din wo soorat aati hai jahan
   * hamari fee to ginti mein hai magar reseller ka haq kahin darj hi nahi.
   */
  async openForDeliveredOrder(input: {
    orderId: string
    resellerId: string
    supplierId: string
    amount: Pkr
  }): Promise<void> {
    // Sifar margin (reseller ne apni lagat par bech diya) — row banane ka faida nahi
    if (input.amount <= 0) return

    // Shart abhi snapshot hoti hai — baad mein dukan apna waada badle to purana hisab
    // usi shart par rehta hai jis par wo bana tha
    const termDays = await this.payouts.supplierTerm(input.supplierId)

    await this.payouts.create({ ...input, termDays })
    this.logger.info('payout_opened', { orderId: input.orderId, amount: input.amount })
  }

  // ------------------------------------------------------------- wholesaler

  /**
   * Wholesaler: "bhej diye".
   *
   * Reference lazmi hai — EasyPaisa/bank ka TID. Jhagre mein yehi ek cheez asli hai;
   * "bhej diya tha" ke lafz dono taraf se aate hain, TID ek hi taraf se aata hai.
   */
  async markSent(
    supplierId: string,
    payoutId: string,
    reference: string,
    proofUrl?: string | undefined,
  ): Promise<PayoutView> {
    const payout = await this.payouts.findForSupplier(supplierId, payoutId)
    if (!payout) throw new NotFoundError('Payout', payoutId)

    if (payout.status === 'SETTLED') {
      throw new ValidationError('Ye hisab pehle hi band ho chuka hai')
    }

    const trimmed = reference.trim()
    if (trimmed.length < 4) {
      throw new ValidationError('Transaction ID ya reference likhna zaroori hai')
    }

    const at = this.clock.now()
    const changed = await this.payouts.markSent(payoutId, trimmed, at, proofUrl)

    // Row nahi badli to yahin ruk jayen — warna hum reseller ko aisi cheez ki khabar
    // bhej dete hain jo hui hi nahi
    if (!changed) throw new ValidationError('Is hisab ki halat badal chuki hai — safha refresh karen')

    // Reseller ko foran khabar — tasdeeq usi ne karni hai, us ke baghair hisab khula rehta hai
    await this.messaging.sendTemplate({
      to: await this.phones.reseller(payout.resellerId),
      template: 'baji_payout_sent',
      params: {
        orderNo: payout.orderNo,
        amount: String(payout.amount),
        reference: trimmed,
      },
    })

    await this.analytics.track({
      name: 'payout_marked_sent',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { orderNo: payout.orderNo, amount: payout.amount },
    })

    return {
      ...payout,
      status: 'SENT',
      sentAt: at,
      sentReference: trimmed,
      // Nayi tasveer aayi to wohi, warna jo pehle se thi
      sentProofUrl: proofUrl ?? payout.sentProofUrl,
    }
  }

  /**
   * Dukan apna waada khud likhti hai: delivery ke kitne din baad paise deta hoon.
   *
   * Ye reseller ko order lagane se pehle dikhta hai — us ke asal record ke saath. Waada
   * akela sasti baat hai aur record akela bina pemane ke; dono saath hi kaam ke hain.
   */
  async setPaymentTerm(supplierId: string, days: number): Promise<void> {
    if (!Number.isInteger(days) || days < 0 || days > MAX_PAYOUT_TERM_DAYS) {
      throw new ValidationError(`Waada 0 se ${MAX_PAYOUT_TERM_DAYS} din ke darmiyan hona chahiye`)
    }

    await this.payouts.setSupplierTerm(supplierId, days)
    this.logger.info('payout_term_set', { supplierId, days })
  }

  paymentTerm(supplierId: string): Promise<number> {
    return this.payouts.supplierTerm(supplierId)
  }

  listForSupplier(supplierId: string, status?: PayoutStatus): Promise<PayoutView[]> {
    return this.payouts.listForSupplier(supplierId, status)
  }

  // --------------------------------------------------------------- reseller

  /**
   * Reseller: "mil gaye" — hisab band.
   *
   * 🔴 Ye PENDING se bhi chalti hai, sirf SENT se nahi. Dukan wala aksar EasyPaisa kar
   * ke portal kholta hi nahi; us ka na dabana is baat ka saboot nahi ke paisa nahi gaya.
   * Reseller ke haath mein paisa aa jana hamare paas sab se mazboot gawahi hai.
   */
  async confirmReceived(resellerId: string, payoutId: string): Promise<PayoutView> {
    const payout = await this.payouts.findForReseller(resellerId, payoutId)
    if (!payout) throw new NotFoundError('Payout', payoutId)
    if (payout.status === 'SETTLED') return payout

    const at = this.clock.now()
    const changed = await this.payouts.markConfirmed(payoutId, at)
    if (!changed) throw new ValidationError('Is hisab ki halat badal chuki hai — safha refresh karen')

    await this.analytics.track({
      name: 'payout_confirmed',
      actorType: 'reseller',
      actorId: resellerId,
      properties: { orderNo: payout.orderNo, amount: payout.amount },
    })

    this.logger.info('payout_settled', { orderNo: payout.orderNo, amount: payout.amount })
    return { ...payout, status: 'SETTLED', confirmedAt: at }
  }

  /**
   * Reseller: "nahi mile".
   *
   * 🔴 Ye wholesaler ke dawe ko mitata nahi — `sentReference` jahan tha wahin rehta hai.
   * Ops ko dono cheezein saath chahiyen: us ne kya kaha, aur is ne kya kaha.
   */
  async raiseDispute(resellerId: string, payoutId: string, note: string): Promise<PayoutView> {
    const payout = await this.payouts.findForReseller(resellerId, payoutId)
    if (!payout) throw new NotFoundError('Payout', payoutId)

    if (payout.status === 'SETTLED') {
      throw new ValidationError('Ye hisab band ho chuka hai — dobara kholne ke liye team se rabta karen')
    }

    const trimmed = note.trim()
    if (trimmed.length < 3) throw new ValidationError('Mukhtasir wajah likhen')

    const at = this.clock.now()
    const changed = await this.payouts.markDisputed(payoutId, trimmed, at)
    if (!changed) throw new ValidationError('Is hisab ki halat badal chuki hai — safha refresh karen')

    await this.analytics.track({
      name: 'payout_disputed',
      actorType: 'reseller',
      actorId: resellerId,
      properties: { orderNo: payout.orderNo, amount: payout.amount },
    })

    // Ye line jaan boojh kar warn par hai — ops ke alerts isi par lage hain
    this.logger.warn('payout_disputed', {
      orderNo: payout.orderNo,
      supplierId: payout.supplierId,
      amount: payout.amount,
    })

    return { ...payout, status: 'DISPUTED', disputedAt: at, disputeNote: trimmed }
  }

  listForReseller(resellerId: string, status?: PayoutStatus): Promise<PayoutView[]> {
    return this.payouts.listForReseller(resellerId, status)
  }

  /** Dashboard ka jama — "mil chuke" aur "aana baqi hai" alag alag. */
  totalsForReseller(resellerId: string): Promise<{ settled: Pkr; awaiting: Pkr }> {
    return this.payouts.totalsForReseller(resellerId)
  }

  /**
   * "Kis dukan ke saath mera kya hisab hai" — reseller ka poora naqsha.
   *
   * Ye `listForReseller` se alag sawal hai: wo har order ki row deti hai, ye har DUKAN
   * ka jama. Bees order ke baad row-by-row list se ye pata nahi chalta ke kis dukan par
   * paisa atka hua hai — aur asal sawal wohi hai.
   */
  ledgerBySupplier(resellerId: string): Promise<CounterpartyLedgerRow[]> {
    return this.ledger.bySupplierForReseller(resellerId)
  }

  /**
   * Dukan ka payment record — reseller ko order lagane se PEHLE.
   *
   * 🔴 Ye sirf login ke baad dikhta hai, public Bazaar par nahi. Bazaar Google par hai
   * aur wahan "ye dukan paise nahi deti" chhapna alag cheez hai — wo ilzam poori duniya
   * ke saamne hai aur us ke qanooni nataij hain. Reseller ko wo jagah chahiye jahan wo
   * faisla karti hai; wo jagah login ke andar hai.
   */
  paymentRecords(supplierIds: readonly string[]): Promise<SupplierPaymentRecord[]> {
    return this.ledger.paymentRecords(supplierIds)
  }

  /**
   * Is maal ki dukan ka payment record — reseller ke product safhe par.
   *
   * Dukan ka naam ya id kuch bhi wapas nahi aata, sirf ginti. Reseller ko ye jaanna
   * chahiye ke "is maal wali dukan paise waqt par deti hai ya nahi" — us ka ye jaanna
   * zaroori nahi ke wo dukan kaun si hai.
   */
  paymentRecordForProduct(productId: string) {
    return this.ledger.paymentRecordForProduct(productId)
  }

  /** Wohi sawal ulta — wholesaler ke liye, har reseller ka alag hisab. */
  ledgerByReseller(supplierId: string): Promise<CounterpartyLedgerRow[]> {
    return this.ledger.byResellerForSupplier(supplierId)
  }

  /** Dukan ke zimme HAMARI fee — reseller wale paison se bilkul alag khaana. */
  platformFeeForSupplier(supplierId: string) {
    return this.ledger.platformFeeForSupplier(supplierId)
  }

  /**
   * Mahine ka statement — dono taraf ek hi kaghaz.
   *
   * Mahina "YYYY-MM" mein aata hai. Server ka apna waqt istemal nahi hota: dukan wala
   * aur reseller alag alag waqt par kholen to bhi wohi mahina bane, aur PDF ka number
   * kabhi na badle.
   */
  async statement(
    scope: { resellerId?: string; supplierId?: string },
    month: string,
  ): Promise<{
    month: string
    rows: PayoutView[]
    totals: { earned: Pkr; received: Pkr; awaiting: Pkr }
  }> {
    const match = /^(\d{4})-(\d{2})$/.exec(month)
    if (!match) throw new ValidationError('Mahina YYYY-MM ki shakl mein chahiye')

    const year = Number(match[1])
    const monthIndex = Number(match[2]) - 1
    if (monthIndex < 0 || monthIndex > 11) throw new ValidationError('Mahina theek nahi')

    const from = new Date(Date.UTC(year, monthIndex, 1))
    const to = new Date(Date.UTC(year, monthIndex + 1, 1))

    const rows = await this.payouts.listForPeriod(scope, from, to)

    const sum = (list: PayoutView[]) => list.reduce((total, row) => total + row.amount, 0)
    const settled = rows.filter((row) => row.status === 'SETTLED')

    return {
      month,
      rows,
      totals: {
        earned: pkr(sum(rows)),
        received: pkr(sum(settled)),
        awaiting: pkr(sum(rows.filter((row) => row.status !== 'SETTLED'))),
      },
    }
  }

  // -------------------------------------------------------------------- ops

  /**
   * Reseller ka RTO record — dukan ko order qubool karne se PEHLE.
   *
   * Wapsi ka nuqsan dukan uthati hai, is liye us ka haq hai ke faisle se pehle wo ginti
   * dekhe. Ye ilzam nahi: sirf "kitne bheje, kitne pohanche, kitne wapas aaye".
   */
  resellerRisk(resellerIds: readonly string[], supplierId?: string) {
    return this.ledger.resellerRisk(resellerIds, supplierId)
  }

  /** Ops ki screen — jahan dono apni baat par qaim hain. */
  listDisputed() {
    return this.ledger.listDisputed()
  }

  summariseBySupplier(): Promise<SupplierPayoutSummary[]> {
    return this.payouts.summariseBySupplier()
  }

  /**
   * Ops ka faisla — jab dono apni baat par qaim hon.
   *
   * Do hi rukh hain: hisab band kar dena (SETTLED), ya wapas wholesaler ke zimme daal
   * dena (PENDING). Wajah lazmi hai — teen mahine baad koi poochhe to jawab hona chahiye.
   */
  async resolve(input: {
    opsUserId: string
    payoutId: string
    decision: 'SETTLED' | 'PENDING'
    note: string
  }): Promise<void> {
    const trimmed = input.note.trim()
    if (trimmed.length < 3) throw new ValidationError('Faisle ki wajah likhna zaroori hai')

    await this.payouts.resolve({
      payoutId: input.payoutId,
      status: input.decision,
      opsUserId: input.opsUserId,
      note: trimmed,
      at: this.clock.now(),
    })

    this.logger.info('payout_resolved_by_ops', {
      payoutId: input.payoutId,
      decision: input.decision,
    })
  }

  /**
   * Yaad-dihani — wo baqaya jin par wholesaler ne kuch kaha hi nahi.
   *
   * Worker se rozana chalti hai. Har row par ek hi paighaam, kyunke rozana ka taqaza
   * band karwa deta hai (aur WhatsApp ka kharcha bhi hai).
   */
  async remindOverdue(): Promise<number> {
    // Har row apni shart se chhanti hai — ek hi tareekh sab par nahi lagti
    const overdue = await this.payouts.listOverduePending(this.clock.now())

    for (const payout of overdue) {
      await this.messaging.sendTemplate({
        to: await this.phones.supplier(payout.supplierId),
        template: 'baji_payout_reminder',
        params: { orderNo: payout.orderNo, amount: String(payout.amount) },
      })
    }

    if (overdue.length > 0) {
      this.logger.info('payout_reminders_sent', { count: overdue.length })
    }
    return overdue.length
  }

  /**
   * Doosri taraf ki yaad-dihani — reseller se tasdeeq.
   *
   * ─────────────────────────────────────────────────────────────────────────────
   * 🔴 Ye `remindOverdue` se ALAG soorat hai, aur zyada khatarnak.
   *
   * Baqaya (`PENDING`) par dono jante hain ke paisa aana baqi hai. Yahan dukan samajh
   * chuki hai ke hisab band ho gaya, aur reseller ke khaate mein wo raqam abhi tak khuli
   * pari hai. Koi na to shikayat karta hai na poochhta hai — bas do taraf do alag hisab
   * chalte rehte hain.
   *
   * Aur jitna arsa guzarta hai, jhagra utna hi mushkil hota jata hai: `sentReference`
   * (TID) purana ho jata hai, bank ka record dhoondna mushkil, aur dono ki yaadasht
   * dhundli. Isi liye ye yaad-dihani jaldi jati hai — hisab band karwane ke liye nahi,
   * balke us farq ko us waqt pakarne ke liye jab wo abhi hal ho sakta hai.
   * ─────────────────────────────────────────────────────────────────────────────
   */
  async remindUnconfirmed(): Promise<number> {
    const before = new Date(this.clock.now().getTime() - CONFIRM_WAIT_MS)
    const waiting = await this.payouts.listUnconfirmedSent(before)

    for (const payout of waiting) {
      await this.messaging.sendTemplate({
        to: await this.phones.reseller(payout.resellerId),
        template: 'baji_payout_confirm',
        params: { orderNo: payout.orderNo, amount: String(payout.amount) },
      })
    }

    if (waiting.length > 0) {
      this.logger.info('payout_confirm_reminders_sent', { count: waiting.length })
    }
    return waiting.length
  }
}

/** Har halat ka matlab — UI teenon portal mein yehi lafz dikhati hai. */
export function payoutStatusMeaning(status: PayoutStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Wholesaler ne abhi bheje nahi'
    case 'SENT':
      return 'Wholesaler ka dawa: bhej diye — tasdeeq baqi'
    case 'SETTLED':
      return 'Mil gaye — hisab band'
    case 'DISPUTED':
      return 'Reseller: nahi mile'
  }
}

/**
 * Der = dukan ka apna waada guzar gaya.
 *
 * 🔴 Shart row ke apne snapshot se aati hai, dukan ki mojooda setting se nahi. Warna
 * baqaya purana hote hi shart barha kar record saaf kiya ja sakta tha.
 */
export function isOverdue(payout: PayoutView, now: Date): boolean {
  if (payout.status !== 'PENDING') return false
  return now.getTime() - payout.createdAt.getTime() > payout.termDays * 86_400_000
}
