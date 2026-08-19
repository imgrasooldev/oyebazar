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
import { NotFoundError, ValidationError, type Pkr } from '@oyebazar/shared'
import type { PayoutRepository, PayoutStatus, PayoutView } from '../ports/payout-repositories'
import type { SupplierPayoutSummary } from '../ports/payout-repositories'
import type { Analytics, Clock, Logger, MessagingProvider } from '../ports/infrastructure'

/**
 * Itne din baad khamosh baqaya "der" ginta hai.
 *
 * Teen din is liye ke COD ka paisa courier se wholesaler tak pohanchne mein hi ek do
 * din lagte hain — pehle din taqaza karna sirf shor hai. Aur is se zyada rakhen to
 * reseller ka bharosa pehle tootta hai.
 */
export const PAYOUT_OVERDUE_DAYS = 3

export interface PayoutActor {
  readonly type: 'supplier' | 'reseller'
  readonly id: string
}

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

    await this.payouts.create(input)
    this.logger.info('payout_opened', { orderId: input.orderId, amount: input.amount })
  }

  // ------------------------------------------------------------- wholesaler

  /**
   * Wholesaler: "bhej diye".
   *
   * Reference lazmi hai — EasyPaisa/bank ka TID. Jhagre mein yehi ek cheez asli hai;
   * "bhej diya tha" ke lafz dono taraf se aate hain, TID ek hi taraf se aata hai.
   */
  async markSent(supplierId: string, payoutId: string, reference: string): Promise<PayoutView> {
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
    const changed = await this.payouts.markSent(payoutId, trimmed, at)

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

    return { ...payout, status: 'SENT', sentAt: at, sentReference: trimmed }
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

  // -------------------------------------------------------------------- ops

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
    const cutoff = new Date(this.clock.now().getTime() - PAYOUT_OVERDUE_DAYS * 86_400_000)
    const overdue = await this.payouts.listOverduePending(cutoff)

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

export function isOverdue(payout: PayoutView, now: Date): boolean {
  if (payout.status !== 'PENDING') return false
  return now.getTime() - payout.createdAt.getTime() > PAYOUT_OVERDUE_DAYS * 86_400_000
}
