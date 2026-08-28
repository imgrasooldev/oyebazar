/**
 * Order aur paisa ke ports.
 *
 * Ye alag file isliye hai ke `docs/CONVENTIONS.md` ke mutabiq FeeLedger aur order
 * state machine ke PR sirf founder ke hain — file alag ho to review bhi alag rehta hai.
 */
import type { Page, Pkr } from '@oyebazar/shared'
import type { OrderStatus } from '../domain/order-status'
import type {
  ConfirmedBy,
  CustomerDetails,
  InternalOrderView,
  OrderLineView,
  ResellerOrderView,
} from '../domain/order'
import type { CursorQuery } from './repositories'

export interface PersistOrderInput {
  readonly orderNo: string
  readonly resellerId: string
  readonly supplierId: string
  readonly customer: CustomerDetails
  readonly lines: readonly OrderLineView[]
  readonly subtotal: Pkr
  readonly deliveryFee: Pkr
  readonly total: Pkr
  readonly bajiFee: Pkr
  readonly feeRateBps: number
  readonly paymentMethod: 'COD' | 'PREPAID'
  readonly idempotencyKey?: string | undefined
}

export interface OrderStatusChange {
  readonly orderId: string
  readonly from: OrderStatus
  readonly to: OrderStatus
  readonly at: Date
  readonly actorType: 'reseller' | 'supplier' | 'ops' | 'system' | 'customer'
  readonly actorId?: string | undefined
  readonly note?: string | undefined
  readonly confirmedBy?: ConfirmedBy | undefined
  /** REJECTED par wajah — reseller ko yehi dikhti hai */
  readonly rejectionReason?: string | undefined
  /**
   * DISPATCHED ke saath — courier aur CN.
   *
   * 🔴 Ye status ke SAATH ek hi update mein likha jata hai, alag call se nahi. Do
   * alag likhaiyon ka matlab hota ke beech mein kuch toot jane par order "raste mein"
   * to ho jata magar CN kahin likha hi na jata — aur phir kisi ko pata na chalta ke wo
   * kahan reh gaya.
   */
  readonly shipment?: { courier: string; trackingNo: string | null } | undefined
}

export interface PendingConfirmationOrder {
  readonly id: string
  readonly orderNo: string
  readonly resellerId: string
  readonly resellerName: string
  readonly resellerPhone: string
  readonly customerName: string
  readonly total: Pkr
  readonly createdAt: Date
  readonly reminderSentAt: Date | null
}

/** Raste mein atka hua order — dukan se poochhne ke liye jitna chahiye, utna. */
export interface StuckInTransitOrder {
  readonly id: string
  readonly orderNo: string
  readonly supplierId: string
  readonly supplierPhone: string
  readonly customerName: string
  readonly dispatchedAt: Date
}

/** Wholesaler ko dikhne wala order — us ka apna price, customer ka pata, aur kuch nahi. */
export interface SupplierOrderView {
  readonly id: string
  readonly orderNo: string
  /**
   * Kis reseller ka order — RTO ka record dikhane ke liye.
   *
   * 🔴 Reseller ki id dukan tak jati hai, magar customer ka retail rate phir bhi nahi
   * (dekhen magic link wala safha). Wapsi ka nuqsan dukan uthati hai, is liye us ka haq
   * hai ke qubool karne se pehle wo ginti dekhe jis ka asar usi par parta hai.
   */
  readonly resellerId: string
  /**
   * Apni hi dukan ki id — is view ko sirf wohi dukan dekhti hai jis ka ye order hai.
   *
   * Zaroorat magic link wale safhe par pari: wahan login nahi hota, is liye "main kaun
   * hoon" ka jawab sirf order se aa sakta hai — aur wapsi ka andaza isi dukan ke apne
   * chalan par khara hota hai (us ka darmiyana order, us ke saath reseller ka record).
   */
  readonly supplierId: string
  readonly status: OrderStatus
  readonly customerName: string
  readonly customerPhone: string
  readonly customerAddress: string
  readonly area: string
  readonly locationLat: number | null
  readonly locationLng: number | null
  readonly paymentMethod: 'COD' | 'PREPAID'
  /**
   * Delivery ka rate — dukan ka apna, order ke waqt ka snapshot.
   *
   * Wapsi ka seedha nuqsan yehi raqam hai: maal wapas aa jata hai aur ye paisa nahi
   * milta. Isi liye ye `SupplierOrderView` mein hai — dukan ko apna number dikhna
   * chahiye, aur reseller ka retail phir bhi yahan kabhi nahi aata.
   */
  readonly deliveryFee: Pkr
  /** COD par courier isi raqam ko wasool kar ke wholesaler ko deta hai */
  readonly total: Pkr
  readonly createdAt: Date
  readonly acceptedAt: Date | null
  /**
   * Kab courier ko diya gaya.
   *
   * Safhe par "kitne din se raste mein" isi se banta hai — aur wohi ginti hai jis par
   * reseller ka paisa atka hota hai (DELIVERED tak us ka hissa khulta hi nahi).
   */
  readonly dispatchedAt: Date | null
  /** Kis courier ke haath diya, aur CN — dukan ne khud likha tha */
  readonly courier: string | null
  readonly trackingNo: string | null
  readonly items: readonly {
    readonly titleUr: string
    readonly titleEn: string
    readonly qty: number
    /** 🔴 wholesaler ka APNA price — reseller ka retail yahan kabhi nahi */
    readonly supplierPrice: Pkr
  }[]
}

export interface OrderRepository {
  create(input: PersistOrderInput): Promise<InternalOrderView>

  /** Wholesaler ke magic link ke liye — token hi us ki chabi hai. */
  findBySupplierToken(token: string): Promise<SupplierOrderView | null>

  /** Portal — wholesaler ke apne order. supplierId query ke andar hai, filter mein nahi. */
  listForSupplier(
    supplierId: string,
    query: CursorQuery & { status?: OrderStatus | undefined },
  ): Promise<Page<SupplierOrderView>>
  findForSupplier(supplierId: string, orderNo: string): Promise<SupplierOrderView | null>
  setSupplierToken(orderId: string, token: string): Promise<void>
  findById(orderId: string): Promise<InternalOrderView | null>
  findByIdempotencyKey(resellerId: string, key: string): Promise<InternalOrderView | null>

  /** Reseller-facing — 🔴 supplier ka koi field nahi. */
  findForReseller(resellerId: string, orderNo: string): Promise<ResellerOrderView | null>
  listForReseller(
    resellerId: string,
    query: CursorQuery & { status?: OrderStatus | undefined },
  ): Promise<Page<ResellerOrderView>>

  /**
   * Status badalta hai + audit event likhta hai — dono ek transaction mein.
   * Alag alag hone par ek din event gum ho jayega aur order ki tareekh adhoori reh jayegi.
   */
  applyStatusChange(change: OrderStatusChange): Promise<InternalOrderView>

  /** Confirmation ka intezar kar rahe orders — reminder aur auto-cancel jobs ke liye. */
  findPendingConfirmationBefore(cutoff: Date, limit: number): Promise<InternalOrderView[]>

  /** Reminder job ke liye — reseller ka phone bhi saath, taake dobara query na karni pare. */
  findAwaitingConfirmation(options: {
    olderThan: Date
    onlyWithoutReminder: boolean
    limit: number
  }): Promise<PendingConfirmationOrder[]>

  markReminderSent(orderId: string, at: Date): Promise<void>

  /**
   * Ek number par poore platform ka record — kitne pohanche, kitne wapas aaye.
   *
   * 🔴 Sirf DO GINTIYAN wapas aati hain. Na koi naam, na koi order, na ye ke kis
   * reseller ne bheja tha, aur na hi kitni resellers ne.
   *
   * Ye hadd is feature ki jaan hai. Agar reseller ko ye pata chal jaye ke "Ayesha ne
   * Sadia se bhi liya tha", to hum ne ek customer ki khareedari ka record ek ajnabi ke
   * saamne khol diya — aur wo customer kabhi hamare saamne aayi hi nahi, na us ne is ki
   * ijazat di. Us ka nuqsan ek RTO se kahin bara hai.
   *
   * Ginti mein sirf MUKAMMAL order aate hain (pohancha ya wapas). Raste wale order ka
   * abhi koi natija hai hi nahi.
   */
  outcomesForPhone(phoneKey: string): Promise<{ delivered: number; returned: number }>

  /**
   * Raste mein khare order — jin par dukan ne kuch likha hi nahi.
   *
   * 🔴 Ye khoj paise ki hai, khabar ki nahi: reseller ka hissa DELIVERED par khulta hai.
   * Order DISPATCHED par khara reh jaye to us ka paisa kabhi banta hi nahi, aur usay
   * wajah bhi nazar nahi aati — us ki nazar mein "maal to bhej diya gaya tha".
   */
  findStuckInTransit(options: {
    olderThan: Date
    limit: number
  }): Promise<StuckInTransitOrder[]>

  markTransitReminderSent(orderId: string, at: Date): Promise<void>

  /** Ops console — filters ke saath. 🔴 Ye internal view deta hai (fee + supplier). */
  listForOps(filters: {
    status?: OrderStatus | undefined
    supplierId?: string | undefined
    limit: number
    cursor?: string | undefined
  }): Promise<Page<InternalOrderView>>

  /**
   * Wapsi ke andaze ka kachcha maal — sirf ginti, koi faisla nahi.
   *
   * Faisla `assessRtoRisk` karta hai (domain/rto-risk.ts). Ye alagav jaan boojh kar hai:
   * ginti DB se aati hai, wazan aur hadd domain mein hain — warna hadd badalne ke liye
   * SQL kholna parta aur us ka test likhna namumkin ho jata.
   */
  riskFacts(input: {
    supplierId: string
    orderIds: readonly string[]
  }): Promise<OrderRiskFacts>
}

/** Ek dukan ke chand orders ke liye — un sab ka kachcha maal ek hi chakkar mein. */
export interface OrderRiskFacts {
  /**
   * Is dukan ke mukammal hue orders ka DARMIYANA total.
   *
   * Ausat nahi — darmiyana. Ek Rs 90,000 wala order ausat ko itna upar utha deta hai ke
   * phir har aam order "chhota" lagne lagta hai aur "bara order" wali wajah kabhi lagti
   * hi nahi. Darmiyane par ek order ka koi asar nahi parta.
   */
  readonly medianOrder: number
  /** order id → us order ke apne ishare */
  readonly byOrder: ReadonlyMap<
    string,
    {
      /** ISI customer ke number par — sab dukanon par milakar */
      readonly customer: { readonly delivered: number; readonly rto: number }
      /** ISI ilaqe (`area`) par — sab dukanon par milakar */
      readonly area: { readonly delivered: number; readonly rto: number }
    }
  >
}

/**
 * 🔴 FEE LEDGER — hamara revenue ka single source of truth.
 *
 * Rows IMMUTABLE hain: amount ban jane ke baad kabhi update nahi hota. Ghalti ho to
 * reversing entry banti hai. RTO par row delete nahi hoti — WRITTEN_OFF hoti hai,
 * warna hum apna nuqsan hi nahi naap sakenge.
 */
export interface SupplierFeeSummary {
  readonly supplierId: string
  readonly businessName: string
  readonly orders: number
  readonly amount: Pkr
}

export interface FeeCollectionStats {
  readonly total: Pkr
  readonly collected: Pkr
  readonly writtenOff: Pkr
  /** 🔴 #3 guardrail — target ≥85% */
  readonly collectionPct: number
}

export interface FeeLedgerRepository {
  create(input: { orderId: string; supplierId: string; amount: Pkr }): Promise<void>
  /**
   * Maal pohanch gaya — ab ye hamari kamai hai.
   * 🔴 Invoice sirf EARNED rows par banti hai, PENDING par nahi: raste ka order abhi
   * kamai nahi hai aur wapas bhi aa sakta hai.
   */
  markEarned(orderId: string, at: Date): Promise<void>
  markWrittenOff(orderId: string, reason: string): Promise<void>
  findByOrderId(orderId: string): Promise<{ amount: Pkr; status: string } | null>

  /** Mahine ke aakhir mein: kis supplier ki kitni fee PENDING hai. */
  summarisePending(period: { from: Date; to: Date }): Promise<SupplierFeeSummary[]>

  /**
   * Ek supplier ki us mahine ki saari PENDING rows ko INVOICED kar deta hai.
   * @returns kitni rows aur kitni raqam
   */
  markInvoiced(input: {
    supplierId: string
    invoiceId: string
    invoicePeriod: string
    from: Date
    to: Date
    at: Date
  }): Promise<{ rows: number; amount: Pkr }>

  markCollected(invoiceId: string, at: Date): Promise<{ rows: number; amount: Pkr }>

  collectionStats(period: { from: Date; to: Date }): Promise<FeeCollectionStats>
}

/** Order routing ke liye supplier ki internal maloomat (fee rate, WhatsApp). */
export interface SupplierInternalRepository {
  findInternal(supplierId: string): Promise<{
    id: string
    businessName: string
    phone: string
    feeRateBps: number
    status: 'PENDING' | 'VERIFIED' | 'SUSPENDED'
    /** Isi sheher mein delivery ka rate — dukan khud likhti hai */
    deliveryFeeCity: number
    /** Doosre sheher ka rate */
    deliveryFeeOther: number
  } | null>
}
